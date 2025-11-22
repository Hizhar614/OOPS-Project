import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Store,
  Package,
  TrendingUp,
  Users,
  Plus,
  Building2,
  Edit,
  Trash2,
  MessageSquare,
  CheckCircle,
  TruckIcon,
  Calendar,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useMockData, Wholesaler, Product } from "@/contexts/MockDataContext";
import { toast } from "sonner";
import WholesalerCatalogModal from "./WholesalerCatalogModal";
import StockOrderModal from "./StockOrderModal";
import PaymentModal from "./PaymentModal";
import EditProductModal from "./EditProductModal";
import DeleteConfirmDialog from "./DeleteConfirmDialog";
import SupportReplyModal from "./SupportReplyModal";
import DeliverySchedule from "./DeliverySchedule";
import SeedProductsButton from "./SeedProductsButton";
import { format } from "date-fns";
import { calculateDistance, formatDistanceMiles } from "@/lib/distance";

type Profile = {
  id: string;
  full_name: string;
  role: "customer" | "retailer" | "wholesaler";
  business_name?: string;
  location: any;
  location_lat?: number;
  location_lng?: number;
  location_address?: string;
  phone: string | null;
};

interface RetailerDashboardProps {
  profile: Profile;
}

const RetailerDashboard = ({ profile }: RetailerDashboardProps) => {
  const {
    orders,
    updateOrderStatus,
    getRetailerWholesalerOrders,
    addWholesalerOrder,
    updateWholesalerOrderStatus,
    receiveStock,
    getRetailerQueries,
    replyToQuery,
    updateOrderPaymentStatus,
  } = useMockData();

  const [realProducts, setRealProducts] = useState<any[]>([]);
  const [realWholesalers, setRealWholesalers] = useState<any[]>([]);
  const [realOrders, setRealOrders] = useState<any[]>([]);
  const [wholesalerStats, setWholesalerStats] = useState<{[key: string]: {productCount: number, rating: number}}>({});
  const [loadingProducts, setLoadingProducts] = useState(true);
  const [loadingWholesalers, setLoadingWholesalers] = useState(true);
  const [loadingOrders, setLoadingOrders] = useState(true);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [selectedWholesaler, setSelectedWholesaler] = useState<any | null>(null);
  const [isCatalogModalOpen, setIsCatalogModalOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<any | null>(null);
  const [isOrderModalOpen, setIsOrderModalOpen] = useState(false);
  const [selectedOrderForPayment, setSelectedOrderForPayment] = useState<any | null>(null);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [catalogRefresh, setCatalogRefresh] = useState(0);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [deletingProduct, setDeletingProduct] = useState<Product | null>(null);
  const [replyingToQuery, setReplyingToQuery] = useState<any>(null);
  const [newProduct, setNewProduct] = useState({
    name: "",
    price: "",
    stock: "",
    category: "",
  });

  // Fetch real products from Supabase AND setup realtime subscription
  useEffect(() => {
    fetchProducts();
    fetchWholesalers();
    fetchOrders();

    // ============================================
    // SETUP REALTIME SUBSCRIPTION FOR PRODUCTS
    // ============================================
    console.log('🔴 Setting up Realtime subscription for products table');
    
    const productsChannel = supabase
      .channel('realtime-products-retailer')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'products',
          filter: `seller_id=eq.${profile.id}`,
        },
        (payload) => {
          console.log('🟢 Product UPDATE detected:', payload);
          
          // Update local state with the new product data
          setRealProducts((currentProducts) => {
            return currentProducts.map((product) => {
              if (product.id === payload.new.id) {
                console.log(`📦 Updating product "${product.name}": stock ${product.stock} → ${payload.new.stock}`);
                return { ...product, ...payload.new };
              }
              return product;
            });
          });

          toast.info(`Stock updated: ${payload.new.name} (${payload.new.stock} units)`);
        }
      )
      .subscribe((status) => {
        console.log('📡 Realtime subscription status:', status);
        if (status === 'SUBSCRIBED') {
          console.log('✅ Successfully subscribed to products realtime updates');
        }
      });

    // Cleanup on unmount
    return () => {
      console.log('🔴 Unsubscribing from realtime channel');
      supabase.removeChannel(productsChannel);
    };
  }, [profile.id]);

  const fetchProducts = async () => {
    try {
      setLoadingProducts(true);
      console.log('RetailerDashboard - Fetching products for seller:', profile.id);
      
      const { data, error } = await supabase
        .from("products")
        .select("*")
        .eq("seller_id", profile.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      
      console.log('RetailerDashboard - Fetched products:', data);
      setRealProducts(data || []);
    } catch (error: any) {
      console.error("Error fetching products:", error);
      toast.error("Failed to load products");
    } finally {
      setLoadingProducts(false);
    }
  };

  const fetchWholesalers = async () => {
    try {
      setLoadingWholesalers(true);
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("role", "wholesaler");

      if (error) throw error;
      setRealWholesalers(data || []);
      
      // Fetch product counts for each wholesaler
      if (data) {
        await fetchWholesalerStats(data);
      }
    } catch (error: any) {
      console.error("Error fetching wholesalers:", error);
      toast.error("Failed to load wholesalers");
    } finally {
      setLoadingWholesalers(false);
    }
  };

  const fetchWholesalerStats = async (wholesalers: any[]) => {
    try {
      const stats: {[key: string]: {productCount: number, rating: number}} = {};
      
      for (const wholesaler of wholesalers) {
        // Get product count
        const { data: products, error: productError } = await supabase
          .from("products")
          .select("id")
          .eq("seller_id", wholesaler.id);
        
        if (productError) throw productError;
        
        stats[wholesaler.id] = {
          productCount: products?.length || 0,
          rating: 4.5 // Default rating for now
        };
      }
      
      setWholesalerStats(stats);
    } catch (error: any) {
      console.error("Error fetching wholesaler stats:", error);
    }
  };

  const fetchOrders = async () => {
    try {
      setLoadingOrders(true);
      
      // Fetch orders where current user is EITHER the seller (customer orders) OR buyer (stock orders)
      const { data, error } = await supabase
        .from("orders")
        .select(`
          *,
          buyer:profiles!orders_buyer_id_fkey(full_name, phone, business_name),
          seller:profiles!orders_seller_id_fkey(full_name, phone, business_name),
          order_items(
            id,
            product_id,
            quantity,
            price,
            product:products(name, image_url)
          )
        `)
        .or(`seller_id.eq.${profile.id},buyer_id.eq.${profile.id}`)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setRealOrders(data || []);
    } catch (error: any) {
      console.error("Error fetching orders:", error);
      toast.error("Failed to load orders");
    } finally {
      setLoadingOrders(false);
    }
  };

  const retailerId = profile.id; // Use real user ID
  const inventory = realProducts; // Use real products from database
  const wholesalers = realWholesalers; // Use real wholesalers from database
  
  // Use real customer orders (where current user is seller)
  const customerOrders = realOrders.filter(order => order.seller_id === retailerId);
  
  const activeOrders = customerOrders.filter((o) => 
    o.status !== "delivered" && o.status !== "cancelled"
  );
  const completedOrders = customerOrders.filter((o) => 
    o.status === "delivered"
  );
  
  // Wholesaler orders: Orders where retailer is the buyer (ordering stock from wholesalers)
  const wholesalerOrders = realOrders.filter(order => 
    order.buyer_id === profile.id && // Current user is buyer
    order.seller_id !== profile.id // Not selling to themselves
  );
  
  const customerQueries = getRetailerQueries(profile.id);
  const pendingQueries = customerQueries.filter((q) => q.status === "pending");

  const handleAddProduct = async () => {
    if (!newProduct.name || !newProduct.price || !newProduct.stock) {
      toast.error("Please fill in all required fields");
      return;
    }

    try {
      const { data, error } = await supabase
        .from("products")
        .insert([
          {
            name: newProduct.name,
            description: `${newProduct.name} - Fresh and high quality`,
            price: parseFloat(newProduct.price),
            stock: parseInt(newProduct.stock),
            category: newProduct.category || "General",
            is_local_specialty: false,
            seller_id: profile.id,
            image_url: "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=400",
            proxy_available: false,
          },
        ])
        .select();

      if (error) throw error;

      toast.success("Product added successfully!");
      setIsAddModalOpen(false);
      setNewProduct({ name: "", price: "", stock: "", category: "" });
      fetchProducts(); // Refresh the list
    } catch (error: any) {
      console.error("Error adding product:", error);
      toast.error(error.message || "Failed to add product");
    }
  };

  const handleOpenWholesalerCatalog = (wholesaler: Wholesaler) => {
    setSelectedWholesaler(wholesaler);
    setIsCatalogModalOpen(true);
  };

  const handleOrderStock = (product: any, wholesalerId: string) => {
    // Check if retailer has set their location
    if (!profile.location_lat || !profile.location_lng) {
      toast.error("Please set your store location in Profile Settings before ordering from wholesalers");
      return;
    }
    
    const wholesaler = realWholesalers.find((w) => w.id === wholesalerId);
    setSelectedProduct(product);
    setSelectedWholesaler(wholesaler);
    setIsOrderModalOpen(true);
  };

  const handleConfirmOrder = async (quantity: number, paymentMethod: string) => {
    if (!selectedProduct || !selectedWholesaler) return;

    try {
      const totalPrice = selectedProduct.price * quantity;
      
      // Create pending order in database (payment will be done after approval)
      const { data: orderData, error: orderError } = await supabase
        .from("orders")
        .insert([{
          buyer_id: profile.id,
          seller_id: selectedWholesaler.id,
          product_id: selectedProduct.id,
          product_name: selectedProduct.name,
          quantity: quantity,
          total_price: totalPrice,
          status: "pending",
          payment_method: null, // Will be set after approval
          is_paid: false,
          delivery_address: "Retailer Store",
        }])
        .select();

      if (orderError) throw orderError;

      toast.success(`Stock request sent to ${selectedWholesaler.full_name}! Waiting for approval.`);
      setIsOrderModalOpen(false);
      setCatalogRefresh(prev => prev + 1);
      setSelectedProduct(null);
      fetchOrders(); // Refresh orders list
    } catch (error: any) {
      console.error("Error placing order:", error);
      toast.error(error.message || "Failed to place order");
    }
  };

  const handleConfirmPayment = async (orderId: string, paymentMethod: string, paymentId?: string) => {
    try {
      console.log("Updating order:", orderId, "with payment:", paymentMethod, "Payment ID:", paymentId);
      
      const updateData: any = {
        payment_method: paymentMethod,
        is_paid: paymentMethod === "online",
        status: "order_confirmed"
      };

      // Store payment ID if provided (for online payments)
      if (paymentId) {
        updateData.payment_id = paymentId;
      }
      
      const { data, error } = await supabase
        .from("orders")
        .update(updateData)
        .eq("id", orderId)
        .select();

      if (error) throw error;
      
      console.log("Order updated:", data);

      toast.success(`Payment confirmed! ${paymentMethod === "online" ? "Payment successful" : "COD selected"}. Order confirmed, waiting for wholesaler to ship.`);
      setIsPaymentModalOpen(false);
      setSelectedOrderForPayment(null);
      
      // Force refresh the orders
      await fetchOrders();
    } catch (error: any) {
      console.error("Error confirming payment:", error);
      toast.error("Failed to confirm payment");
    }
  };

  const handleAddStockToInventory = async (order: Order) => {
    try {
      // Check if retailer already has this product by name
      const { data: existingProduct, error: fetchError } = await supabase
        .from("products")
        .select("*")
        .eq("seller_id", profile.id)
        .eq("name", order.product_name)
        .maybeSingle();

      if (fetchError) throw fetchError;

      if (existingProduct) {
        // Product exists - add to existing stock
        const newStock = existingProduct.stock + order.quantity;
        
        const { error: updateError } = await supabase
          .from("products")
          .update({ stock: newStock })
          .eq("id", existingProduct.id);

        if (updateError) throw updateError;
        
        toast.success(`Added ${order.quantity} units to existing product "${order.product_name}". New stock: ${newStock}`);
      } else {
        // Product doesn't exist - create new product from wholesale order
        const unitPrice = order.total_price / order.quantity;
        
        const { error: insertError } = await supabase
          .from("products")
          .insert([{
            name: order.product_name,
            price: unitPrice * 1.3, // 30% markup over wholesale price
            stock: order.quantity,
            category: "Wholesale Received",
            seller_id: profile.id,
          }]);

        if (insertError) throw insertError;
        
        toast.success(`New product "${order.product_name}" added to inventory with ${order.quantity} units`);
      }

      // Mark order as received in inventory to prevent duplicate additions
      const { error: statusError } = await supabase
        .from("orders")
        .update({ status: "received_in_inventory" })
        .eq("id", order.id);

      if (statusError) throw statusError;

      // Refresh products and orders
      fetchProducts();
      fetchOrders();
    } catch (error: any) {
      console.error("Error adding stock to inventory:", error);
      toast.error(error.message || "Failed to add stock to inventory");
    }
  };

  const handleClearCompletedOrders = async () => {
    try {
      const completedStatuses = ['delivered', 'cancelled', 'rejected'];
      const ordersToDelete = realOrders
        .filter(order => completedStatuses.includes(order.status))
        .map(order => order.id);

      if (ordersToDelete.length === 0) {
        toast.info("No completed orders to clear");
        return;
      }

      const { error } = await supabase
        .from("orders")
        .delete()
        .in("id", ordersToDelete);

      if (error) throw error;

      toast.success(`Cleared ${ordersToDelete.length} completed order(s)`);
      fetchOrders();
    } catch (error: any) {
      console.error("Error clearing orders:", error);
      toast.error("Failed to clear completed orders");
    }
  };

  const handleEditProduct = (product: Product) => {
    setEditingProduct(product);
  };

  const handleSaveProduct = (productId: string, updates: Partial<Product>) => {
    updateProduct(productId, updates);
  };

  const handleDeleteProduct = (product: any) => {
    setDeletingProduct(product);
  };

  const handleConfirmDelete = async () => {
    if (deletingProduct) {
      try {
        const { error } = await supabase
          .from("products")
          .delete()
          .eq("id", deletingProduct.id)
          .eq("seller_id", profile.id); // Security: ensure it's the user's product

        if (error) throw error;

        toast.success("Product deleted successfully!");
        fetchProducts(); // Refresh the list
        setDeletingProduct(null);
      } catch (error: any) {
        console.error("Error deleting product:", error);
        toast.error("Failed to delete product");
      }
    }
  };

  const handleReceiveStock = (orderId: string, productName: string, quantity: number) => {
    receiveStock(orderId, productName, quantity, retailerId);
    toast.success(`Stock received! ${productName} added to inventory.`);
  };

  const handleShipOrder = (orderId: string) => {
    updateOrderStatus(orderId, "out_for_delivery");
    toast.success("Order marked as shipped!");
  };

  const handleReplyToQuery = (queryId: string) => {
    replyToQuery(queryId);
    toast.success("Reply sent to customer!");
  };

  const handleTogglePayment = (orderId: string, currentStatus: boolean) => {
    updateOrderPaymentStatus(orderId, !currentStatus);
    toast.success(!currentStatus ? "Marked as paid" : "Marked as unpaid");
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold mb-2">Retailer Dashboard</h2>
          <p className="text-muted-foreground">Manage your store and inventory</p>
        </div>
        <Dialog open={isAddModalOpen} onOpenChange={setIsAddModalOpen}>
          <DialogTrigger asChild>
            <Button className="bg-secondary hover:bg-secondary/90">
              <Plus className="h-4 w-4 mr-2" />
              Add Product
            </Button>
          </DialogTrigger>
          <DialogContent className="bg-card">
            <DialogHeader>
              <DialogTitle>Add New Product</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="name">Product Name *</Label>
                <Input
                  id="name"
                  value={newProduct.name}
                  onChange={(e) => setNewProduct({ ...newProduct, name: e.target.value })}
                  placeholder="e.g., Fresh Apples"
                />
              </div>
              <div>
                <Label htmlFor="price">Price (₹) *</Label>
                <Input
                  id="price"
                  type="number"
                  step="1"
                  value={newProduct.price}
                  onChange={(e) => setNewProduct({ ...newProduct, price: e.target.value })}
                  placeholder="e.g., 410"
                />
              </div>
              <div>
                <Label htmlFor="stock">Stock Quantity *</Label>
                <Input
                  id="stock"
                  type="number"
                  value={newProduct.stock}
                  onChange={(e) => setNewProduct({ ...newProduct, stock: e.target.value })}
                  placeholder="e.g., 50"
                />
              </div>
              <div>
                <Label htmlFor="category">Category</Label>
                <Input
                  id="category"
                  value={newProduct.category}
                  onChange={(e) => setNewProduct({ ...newProduct, category: e.target.value })}
                  placeholder="e.g., Fruits, Vegetables"
                />
              </div>
              <div className="flex gap-2 pt-4">
                <Button variant="outline" className="flex-1" onClick={() => setIsAddModalOpen(false)}>
                  Cancel
                </Button>
                <Button className="flex-1" onClick={handleAddProduct}>
                  Add Product
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats Cards */}
      <div className="grid md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground mb-1">Total Products</p>
                <p className="text-2xl font-bold">{inventory.length}</p>
              </div>
              <div className="w-12 h-12 bg-secondary/10 rounded-xl flex items-center justify-center">
                <Package className="h-6 w-6 text-secondary" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground mb-1">Active Orders</p>
                <p className="text-2xl font-bold">{activeOrders.length}</p>
              </div>
              <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center">
                <Store className="h-6 w-6 text-primary" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground mb-1">Total Revenue</p>
                <p className="text-2xl font-bold">₹{customerOrders.reduce((sum, o) => sum + (o.total_price || 0), 0).toFixed(0)}</p>
              </div>
              <div className="w-12 h-12 bg-accent/10 rounded-xl flex items-center justify-center">
                <TrendingUp className="h-6 w-6 text-accent" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground mb-1">Pending Queries</p>
                <p className="text-2xl font-bold">{pendingQueries.length}</p>
              </div>
              <div className="w-12 h-12 bg-secondary/10 rounded-xl flex items-center justify-center">
                <MessageSquare className="h-6 w-6 text-secondary" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Customer Support Inbox */}
      {pendingQueries.length > 0 && (
        <Card className="border-primary/50">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <MessageSquare className="h-5 w-5" />
                Support Inbox
              </CardTitle>
              <Badge variant="destructive">{pendingQueries.length} pending</Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {pendingQueries.map((query) => (
                <Card key={query.id} className="bg-accent/5">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <p className="font-semibold text-sm mb-1">{query.customerName}</p>
                        <p className="text-sm text-muted-foreground mb-2">{query.message}</p>
                        <p className="text-xs text-muted-foreground">
                          {format(new Date(query.createdAt), "PPp")}
                        </p>
                      </div>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setReplyingToQuery(query)}
                      >
                        <MessageSquare className="h-4 w-4 mr-2" />
                        Reply
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Main Content - Sales Operations */}
      <Card>
        <CardHeader>
          <CardTitle>Sales Operations</CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="inventory" className="space-y-4" onValueChange={(value) => {
            // Refresh data when switching tabs
            if (value === "inventory") {
              fetchProducts();
            } else if (value === "schedule") {
              fetchOrders();
            }
          }}>
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="inventory">Inventory</TabsTrigger>
              <TabsTrigger value="sales">Sales History</TabsTrigger>
              <TabsTrigger value="schedule">
                <Calendar className="h-4 w-4 mr-1" />
                Delivery Schedule
              </TabsTrigger>
            </TabsList>

        {/* Inventory Tab */}
        <TabsContent value="inventory">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <CardTitle>Your Inventory</CardTitle>
                  <Badge variant="secondary">{inventory.length} products</Badge>
                </div>
                <div className="flex gap-2">
                  <SeedProductsButton 
                    userId={profile.id} 
                    userRole="retailer"
                    onSuccess={fetchProducts}
                  />
                  <Button onClick={() => setIsAddModalOpen(true)}>
                    <Plus className="h-4 w-4 mr-2" />
                    Add Product
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {inventory.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <Package className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p className="mb-4">No products in your inventory yet</p>
                  <div className="flex gap-2 justify-center">
                    <SeedProductsButton 
                      userId={profile.id} 
                      userRole="retailer"
                      onSuccess={fetchProducts}
                    />
                    <Button variant="outline" onClick={() => setIsAddModalOpen(true)}>
                      <Plus className="h-4 w-4 mr-2" />
                      Add Your First Product
                    </Button>
                  </div>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Product</TableHead>
                      <TableHead>Category</TableHead>
                      <TableHead>Price</TableHead>
                      <TableHead>Stock</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {inventory.map((product) => (
                      <TableRow key={product.id}>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <img
                              src={product.image}
                              alt={product.name}
                              className="w-10 h-10 rounded object-cover"
                            />
                            <span className="font-medium">{product.name}</span>
                          </div>
                        </TableCell>
                        <TableCell>{product.category}</TableCell>
                        <TableCell className="font-semibold">₹{product.price.toFixed(0)}</TableCell>
                        <TableCell>{product.stock}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleEditProduct(product)}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleDeleteProduct(product)}
                            >
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Sales History Tab */}
        <TabsContent value="sales">
          <Card>
            <CardHeader>
              <CardTitle>Sales History</CardTitle>
            </CardHeader>
            <CardContent>
              {completedOrders.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <Package className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No completed orders yet</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Order ID</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Payment Method</TableHead>
                      <TableHead>Payment Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {completedOrders.map((order) => (
                      <TableRow key={order.id}>
                        <TableCell className="font-mono text-sm">
                          #{order.id.toString().slice(-8)}
                        </TableCell>
                        <TableCell>{format(new Date(order.created_at), "PP")}</TableCell>
                        <TableCell className="font-semibold">₹{order.total_price?.toFixed(0) || '0'}</TableCell>
                        <TableCell>{order.payment_method}</TableCell>
                        <TableCell>
                          {order.payment_method === "Cash on Delivery" ? (
                            <Badge variant="outline">COD</Badge>
                          ) : (
                            <Badge variant="default">Paid Online</Badge>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Delivery Schedule Tab */}
        <TabsContent value="schedule">
          <DeliverySchedule
            orders={activeOrders}
            onUpdateOrderStatus={async (orderId, newStatus) => {
              try {
                const { error } = await supabase
                  .from('orders')
                  .update({ status: newStatus })
                  .eq('id', orderId);
                
                if (error) throw error;
                toast.success("Order status updated");
                fetchOrders();
              } catch (error: any) {
                toast.error("Failed to update order status");
              }
            }}
          />
        </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Wholesaler Operations */}
      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Wholesaler Operations</CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="orders" className="space-y-4">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="orders">
                Active Orders
                {wholesalerOrders.filter((o) => !['received_in_inventory', 'cancelled', 'rejected'].includes(o.status)).length > 0 && (
                  <Badge variant="secondary" className="ml-2">
                    {wholesalerOrders.filter((o) => !['received_in_inventory', 'cancelled', 'rejected'].includes(o.status)).length}
                  </Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="completed">
                Completed
                {wholesalerOrders.filter((o) => o.status === 'received_in_inventory').length > 0 && (
                  <Badge variant="secondary" className="ml-2">
                    {wholesalerOrders.filter((o) => o.status === 'received_in_inventory').length}
                  </Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="wholesalers">Wholesalers</TabsTrigger>
            </TabsList>

        {/* Stock Replenishment Orders Tab */}
        <TabsContent value="orders">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Active Stock Orders</CardTitle>
                {wholesalerOrders.filter(o => ['cancelled', 'rejected'].includes(o.status)).length > 0 && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleClearCompletedOrders}
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Clear Rejected/Cancelled
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {loadingOrders ? (
                <div className="text-center py-12 text-muted-foreground">Loading orders...</div>
              ) : wholesalerOrders.filter((o) => !['received_in_inventory', 'cancelled', 'rejected'].includes(o.status)).length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <TruckIcon className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No stock orders yet</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Order ID</TableHead>
                      <TableHead>Wholesaler</TableHead>
                      <TableHead>Product</TableHead>
                      <TableHead>Quantity</TableHead>
                      <TableHead>Payment</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {wholesalerOrders.filter((o) => !['received_in_inventory', 'cancelled', 'rejected'].includes(o.status)).map((order) => (
                      <TableRow key={order.id}>
                        <TableCell className="font-mono text-sm">
                          #{order.id.toString().slice(-8)}
                        </TableCell>
                        <TableCell>{order.seller?.full_name || order.seller?.business_name || "Wholesaler"}</TableCell>
                        <TableCell>{order.product_name}</TableCell>
                        <TableCell>{order.quantity}</TableCell>
                        <TableCell>
                          {order.payment_method ? (
                            <Badge variant={order.is_paid ? "default" : "outline"}>
                              {order.payment_method === "online" ? "Paid Online" : "COD"}
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="text-muted-foreground">
                              Not selected
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell>{format(new Date(order.created_at), "PP")}</TableCell>
                        <TableCell>
                          {order.status === "pending" && (
                            <Badge variant="outline" className="bg-yellow-500/10 text-yellow-700 border-yellow-300">
                              Waiting for wholesaler's approval
                            </Badge>
                          )}
                          {order.status === "approved" && (
                            <Button
                              size="sm"
                              className="bg-green-600 hover:bg-green-700"
                              onClick={() => {
                                setSelectedOrderForPayment(order);
                                setIsPaymentModalOpen(true);
                              }}
                            >
                              Select Payment & Confirm
                            </Button>
                          )}
                          {order.status === "order_confirmed" && (
                            <Badge variant="default" className="bg-blue-600">
                              Waiting for order to be shipped
                            </Badge>
                          )}
                          {order.status === "rejected" && (
                            <Badge variant="destructive">
                              Rejected - Insufficient Stock
                            </Badge>
                          )}
                          {order.status === "shipped" && (
                            <Badge variant="default" className="bg-purple-600">
                              <TruckIcon className="h-3 w-3 mr-1" />
                              In Transit
                            </Badge>
                          )}
                          {order.status === "delivered" && (
                            <div className="flex gap-2 items-center">
                              <Button
                                size="sm"
                                className="bg-green-600 hover:bg-green-700"
                                onClick={() => handleAddStockToInventory(order)}
                              >
                                <CheckCircle className="h-3 w-3 mr-1" />
                                Add to Inventory
                              </Button>
                            </div>
                          )}
                          {order.status === "received_in_inventory" && (
                            <Badge variant="default" className="bg-emerald-700">
                              <CheckCircle className="h-3 w-3 mr-1" />
                              Added to Inventory
                            </Badge>
                          )}
                          {order.status === "cancelled" && (
                            <Badge variant="destructive">
                              Cancelled
                            </Badge>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Completed Orders Tab */}
        <TabsContent value="completed">
          <Card>
            <CardHeader>
              <CardTitle>Completed Stock Orders</CardTitle>
            </CardHeader>
            <CardContent>
              {loadingOrders ? (
                <div className="text-center py-12 text-muted-foreground">Loading orders...</div>
              ) : wholesalerOrders.filter((o) => o.status === 'received_in_inventory').length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <CheckCircle className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No completed orders yet</p>
                  <p className="text-sm mt-2">Orders that have been added to your inventory will appear here</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Order ID</TableHead>
                      <TableHead>Wholesaler</TableHead>
                      <TableHead>Product</TableHead>
                      <TableHead>Quantity</TableHead>
                      <TableHead>Total Price</TableHead>
                      <TableHead>Completed Date</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {wholesalerOrders.filter((o) => o.status === 'received_in_inventory').map((order) => (
                      <TableRow key={order.id}>
                        <TableCell className="font-mono text-sm">
                          #{order.id.toString().slice(-8)}
                        </TableCell>
                        <TableCell>{order.seller?.full_name || order.seller?.business_name || "Wholesaler"}</TableCell>
                        <TableCell>{order.product_name}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className="font-semibold">
                            {order.quantity} units
                          </Badge>
                        </TableCell>
                        <TableCell className="font-semibold">₹{order.total_price?.toFixed(0) || 0}</TableCell>
                        <TableCell>{format(new Date(order.updated_at || order.created_at), "PPp")}</TableCell>
                        <TableCell>
                          <Badge variant="default" className="bg-emerald-700">
                            <CheckCircle className="h-3 w-3 mr-1" />
                            Added to Inventory
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Wholesaler Network Tab */}
        <TabsContent value="wholesalers">
          <Card>
            <CardHeader>
              <CardTitle>Wholesaler Network</CardTitle>
            </CardHeader>
            <CardContent>
              {loadingWholesalers ? (
                <div className="text-center py-12">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto" />
                </div>
              ) : wholesalers.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <Building2 className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No wholesalers available yet</p>
                </div>
              ) : (
                <div className="relative">
                  <div className="flex gap-4 overflow-x-auto pb-4 snap-x snap-mandatory">
                    {wholesalers.map((wholesaler) => {
                      // Calculate distance if both have location data
                      let distance = "-";
                      if (profile.location_lat && profile.location_lng && wholesaler.location_lat && wholesaler.location_lng) {
                        const distanceKm = calculateDistance(
                          profile.location_lat,
                          profile.location_lng,
                          wholesaler.location_lat,
                          wholesaler.location_lng
                        );
                        distance = formatDistanceMiles(distanceKm);
                      }
                      
                      return (
                        <Card key={wholesaler.id} className="hover:shadow-lg transition-shadow flex-shrink-0 w-[calc(33.333%-11px)] min-w-[280px] snap-start">
                          <CardContent className="p-6">
                            <div className="flex items-start gap-3 mb-4">
                              <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center flex-shrink-0">
                                <Building2 className="h-6 w-6 text-primary" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <h3 className="font-semibold mb-1 truncate">{wholesaler.full_name}</h3>
                                <p className="text-sm text-muted-foreground">{wholesaler.business_name || 'Wholesaler'}</p>
                              </div>
                            </div>
                            <div className="space-y-2 mb-4 text-sm">
                              <div className="flex justify-between">
                                <span className="text-muted-foreground">Distance:</span>
                                <span className="font-medium">{distance}</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-muted-foreground">Rating:</span>
                                <span className="font-medium">⭐ {wholesalerStats[wholesaler.id]?.rating || 4.5}</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-muted-foreground">Products:</span>
                                <span className="font-medium">{wholesalerStats[wholesaler.id]?.productCount || 0}</span>
                              </div>
                            </div>
                            <Button
                              variant="outline"
                              className="w-full"
                              size="sm"
                              onClick={() => handleOpenWholesalerCatalog(wholesaler)}
                            >
                              Request Stock
                            </Button>
                          </CardContent>
                        </Card>
                      );
                    })}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Modals */}
        <WholesalerCatalogModal
          wholesaler={selectedWholesaler}
          isOpen={isCatalogModalOpen}
          onClose={() => setIsCatalogModalOpen(false)}
          onOrderStock={handleOrderStock}
          refreshTrigger={catalogRefresh}
          hasLocation={!!(profile.location_lat && profile.location_lng)}
        />      <StockOrderModal
        product={selectedProduct}
        wholesaler={selectedWholesaler}
        isOpen={isOrderModalOpen}
        onClose={() => setIsOrderModalOpen(false)}
        onConfirmOrder={handleConfirmOrder}
      />

      <PaymentModal
        order={selectedOrderForPayment}
        isOpen={isPaymentModalOpen}
        onClose={() => setIsPaymentModalOpen(false)}
        onConfirmPayment={handleConfirmPayment}
        userProfile={{
          full_name: profile.full_name,
          phone: profile.phone
        }}
      />

      <EditProductModal
        product={editingProduct}
        isOpen={!!editingProduct}
        onClose={() => setEditingProduct(null)}
        onSave={handleSaveProduct}
      />

      <DeleteConfirmDialog
        isOpen={!!deletingProduct}
        onClose={() => setDeletingProduct(null)}
        onConfirm={handleConfirmDelete}
        productName={deletingProduct?.name || ""}
      />

      <SupportReplyModal
        query={replyingToQuery}
        isOpen={!!replyingToQuery}
        onClose={() => setReplyingToQuery(null)}
        onSend={handleReplyToQuery}
      />
    </div>
  );
};

export default RetailerDashboard;
