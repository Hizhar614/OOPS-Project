import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import SeedProductsButton from "./SeedProductsButton";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { calculateDistance, formatDistanceMiles } from "@/lib/distance";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Package, Users, TrendingUp, Boxes, Plus, Store, CheckCircle, XCircle, MapPin, Trash2, TruckIcon } from "lucide-react";
import { useMockData } from "@/contexts/MockDataContext";
import { toast } from "sonner";

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

interface WholesalerDashboardProps {
  profile: Profile;
}

const WholesalerDashboard = ({ profile }: WholesalerDashboardProps) => {
  const {
    retailers,
    stockRequests,
    updateStockRequestStatus,
    decreaseProductStock,
  } = useMockData();

  const [realProducts, setRealProducts] = useState<any[]>([]);
  const [realOrders, setRealOrders] = useState<any[]>([]);
  const [realRetailers, setRealRetailers] = useState<any[]>([]);
  const [connectedRetailers, setConnectedRetailers] = useState(0);
  const [loadingProducts, setLoadingProducts] = useState(true);
  const [loadingOrders, setLoadingOrders] = useState(true);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newBulkProduct, setNewBulkProduct] = useState({
    name: "",
    category: "",
    price: "",
    stock: "",
    bulkUnit: "",
  });

  useEffect(() => {
    fetchProducts();
    fetchOrders();
    fetchConnectedRetailers();
  }, [profile.id]);

  const fetchProducts = async () => {
    try {
      setLoadingProducts(true);
      const { data, error } = await supabase
        .from("products")
        .select("*")
        .eq("seller_id", profile.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setRealProducts(data || []);
    } catch (error: any) {
      console.error("Error fetching products:", error);
      toast.error("Failed to load products");
    } finally {
      setLoadingProducts(false);
    }
  };

  const fetchOrders = async () => {
    try {
      setLoadingOrders(true);
      const { data, error } = await supabase
        .from("orders")
        .select(`
          *,
          buyer:profiles!orders_buyer_id_fkey(full_name, business_name)
        `)
        .eq("seller_id", profile.id)
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

  const fetchConnectedRetailers = async () => {
    try {
      // Get unique buyer IDs from orders
      const { data, error } = await supabase
        .from("orders")
        .select("buyer_id")
        .eq("seller_id", profile.id);

      if (error) throw error;

      // Count unique retailers
      const uniqueRetailers = new Set(data?.map(order => order.buyer_id) || []);
      setConnectedRetailers(uniqueRetailers.size);

      // Fetch full retailer profiles
      if (uniqueRetailers.size > 0) {
        const { data: retailersData, error: retailersError } = await supabase
          .from("profiles")
          .select("*")
          .in("id", Array.from(uniqueRetailers));

        if (retailersError) throw retailersError;
        setRealRetailers(retailersData || []);
      } else {
        setRealRetailers([]);
      }
    } catch (error: any) {
      console.error("Error fetching connected retailers:", error);
    }
  };

  const wholesalerId = profile.id;
  const bulkInventory = realProducts;
  const pendingOrders = realOrders.filter((req) => req.status === "pending");
  const completedOrders = realOrders.filter((req) => req.status === "delivered");

  const handleAddBulkStock = async () => {
    if (!newBulkProduct.name || !newBulkProduct.price || !newBulkProduct.stock) {
      toast.error("Please fill in all required fields");
      return;
    }

    try {
      const { data, error } = await supabase
        .from("products")
        .insert([
          {
            name: newBulkProduct.name,
            description: `${newBulkProduct.name} - Bulk wholesale product`,
            price: parseFloat(newBulkProduct.price),
            stock: parseInt(newBulkProduct.stock),
            category: newBulkProduct.category || "General",
            is_local_specialty: false,
            seller_id: profile.id,
            image_url: "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=400",
            proxy_available: true,
          },
        ])
        .select();

      if (error) throw error;

      toast.success("Bulk stock added successfully!");
      setIsAddModalOpen(false);
      setNewBulkProduct({
        name: "",
        category: "",
        price: "",
        stock: "",
        bulkUnit: "",
      });
      fetchProducts(); // Refresh the list
    } catch (error: any) {
      console.error("Error adding bulk stock:", error);
      toast.error(error.message || "Failed to add bulk stock");
    }
  };

  const handleApproveRequest = async (orderId: string) => {
    try {
      // Get the order details
      const order = realOrders.find(o => o.id === orderId);
      if (!order) {
        toast.error("Order not found");
        return;
      }

      // Check current stock
      const { data: productData, error: fetchError } = await supabase
        .from("products")
        .select("stock")
        .eq("id", order.product_id)
        .single();

      if (fetchError) throw fetchError;

      // Validate sufficient stock
      if (productData.stock < order.quantity) {
        // Insufficient stock - reject the order
        const { error: rejectError } = await supabase
          .from("orders")
          .update({ status: "rejected" })
          .eq("id", orderId);

        if (rejectError) throw rejectError;

        toast.error(`Insufficient stock! Required: ${order.quantity}, Available: ${productData.stock}. Order rejected.`);
        fetchOrders();
        fetchProducts();
        return;
      }

      // Deduct stock
      const newStock = productData.stock - order.quantity;
      const { error: stockError } = await supabase
        .from("products")
        .update({ stock: newStock })
        .eq("id", order.product_id);

      if (stockError) throw stockError;

      // Update order status to approved
      const { error: updateError } = await supabase
        .from("orders")
        .update({ status: "approved" })
        .eq("id", orderId);

      if (updateError) throw updateError;

      toast.success(`Order approved! Stock deducted: ${order.quantity} units. New stock: ${newStock}`);
      fetchOrders(); // Refresh orders
      fetchProducts(); // Refresh products to show updated stock
    } catch (error: any) {
      console.error("Error approving order:", error);
      toast.error("Failed to approve order");
    }
  };

  const handleMarkAsShipped = async (orderId: string) => {
    try {
      const { error } = await supabase
        .from("orders")
        .update({ status: "shipped" })
        .eq("id", orderId);

      if (error) throw error;

      toast.success("Order marked as shipped!");
      fetchOrders();
    } catch (error: any) {
      console.error("Error marking as shipped:", error);
      toast.error("Failed to mark as shipped");
    }
  };

  const handleMarkAsDelivered = async (orderId: string) => {
    try {
      const { error } = await supabase
        .from("orders")
        .update({ status: "delivered" })
        .eq("id", orderId);

      if (error) throw error;

      toast.success("Order marked as delivered!");
      fetchOrders();
    } catch (error: any) {
      console.error("Error marking as delivered:", error);
      toast.error("Failed to mark as delivered");
    }
  };

  const handleRejectRequest = async (orderId: string) => {
    try {
      // Update order status to cancelled
      const { error } = await supabase
        .from("orders")
        .update({ status: "cancelled" })
        .eq("id", orderId);

      if (error) throw error;

      toast.error("Order rejected");
      fetchOrders(); // Refresh orders
    } catch (error: any) {
      console.error("Error rejecting order:", error);
      toast.error("Failed to reject order");
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

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold mb-2">Wholesaler Dashboard</h2>
          <p className="text-muted-foreground">Manage bulk inventory and retailer network</p>
        </div>
        <Dialog open={isAddModalOpen} onOpenChange={setIsAddModalOpen}>
          <DialogTrigger asChild>
            <Button className="bg-accent hover:bg-accent/90">
              <Plus className="h-4 w-4 mr-2" />
              Add Bulk Stock
            </Button>
          </DialogTrigger>
          <DialogContent className="bg-card">
            <DialogHeader>
              <DialogTitle>Add Bulk Stock Item</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="bulk-name">Item Name *</Label>
                <Input
                  id="bulk-name"
                  value={newBulkProduct.name}
                  onChange={(e) => setNewBulkProduct({ ...newBulkProduct, name: e.target.value })}
                  placeholder="e.g., 50kg Rice Sack"
                />
              </div>
              <div>
                <Label htmlFor="bulk-category">Bulk Category</Label>
                <Input
                  id="bulk-category"
                  value={newBulkProduct.category}
                  onChange={(e) => setNewBulkProduct({ ...newBulkProduct, category: e.target.value })}
                  placeholder="e.g., Grains, Fruits"
                />
              </div>
              <div>
                <Label htmlFor="bulk-unit">Bulk Unit</Label>
                <Input
                  id="bulk-unit"
                  value={newBulkProduct.bulkUnit}
                  onChange={(e) => setNewBulkProduct({ ...newBulkProduct, bulkUnit: e.target.value })}
                  placeholder="e.g., 50kg bag, crate, drum"
                />
              </div>
              <div>
                <Label htmlFor="bulk-price">Price per Unit (₹) *</Label>
                <Input
                  id="bulk-price"
                  type="number"
                  step="1"
                  value={newBulkProduct.price}
                  onChange={(e) => setNewBulkProduct({ ...newBulkProduct, price: e.target.value })}
                  placeholder="e.g., 7500"
                />
              </div>
              <div>
                <Label htmlFor="bulk-stock">Total Quantity *</Label>
                <Input
                  id="bulk-stock"
                  type="number"
                  value={newBulkProduct.stock}
                  onChange={(e) => setNewBulkProduct({ ...newBulkProduct, stock: e.target.value })}
                  placeholder="e.g., 150"
                />
              </div>
              <div className="flex gap-2 pt-4">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => setIsAddModalOpen(false)}
                >
                  Cancel
                </Button>
                <Button className="flex-1" onClick={handleAddBulkStock}>
                  Add Stock
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
                <p className="text-sm text-muted-foreground mb-1">Bulk Products</p>
                <p className="text-2xl font-bold">{bulkInventory.length}</p>
              </div>
              <div className="w-12 h-12 bg-accent/10 rounded-xl flex items-center justify-center">
                <Boxes className="h-6 w-6 text-accent" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground mb-1">Connected Retailers</p>
                <p className="text-2xl font-bold">{connectedRetailers}</p>
              </div>
              <div className="w-12 h-12 bg-secondary/10 rounded-xl flex items-center justify-center">
                <Users className="h-6 w-6 text-secondary" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground mb-1">Pending Orders</p>
                <p className="text-2xl font-bold">{pendingOrders.length}</p>
              </div>
              <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center">
                <Package className="h-6 w-6 text-primary" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground mb-1">Completed Orders</p>
                <p className="text-2xl font-bold">{completedOrders.length}</p>
              </div>
              <div className="w-12 h-12 bg-accent/10 rounded-xl flex items-center justify-center">
                <TrendingUp className="h-6 w-6 text-accent" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Incoming Stock Requests */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <CardTitle>Order Management</CardTitle>
              <Badge variant="secondary">{realOrders.filter(o => !['delivered', 'cancelled', 'rejected'].includes(o.status)).length} active</Badge>
            </div>
            {realOrders.filter(o => ['delivered', 'cancelled', 'rejected'].includes(o.status)).length > 0 && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleClearCompletedOrders}
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Clear Completed
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {loadingOrders ? (
            <div className="text-center py-12 text-muted-foreground">Loading orders...</div>
          ) : realOrders.filter(o => !['delivered', 'cancelled', 'rejected'].includes(o.status)).length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Package className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No active orders at the moment</p>
            </div>
          ) : (
            <div className="space-y-3">
              {realOrders
                .filter(o => !['delivered', 'cancelled', 'rejected'].includes(o.status))
                .map((request) => (
                <div
                  key={request.id}
                  className="flex items-center justify-between p-4 border rounded-lg hover:bg-accent/5 transition-colors"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <Store className="h-4 w-4 text-muted-foreground" />
                      <span className="font-semibold">{request.buyer?.full_name || request.buyer?.business_name || "Retailer"}</span>
                    </div>
                    <p className="text-sm text-muted-foreground mb-1">
                      Requested <span className="font-medium text-foreground">{request.quantity}</span> units of{" "}
                      <span className="font-medium text-foreground">{request.product_name}</span>
                    </p>
                    {request.payment_method && (
                      <p className="text-xs text-muted-foreground mb-1">
                        Payment: <span className="font-medium">{request.payment_method === "online" ? "Paid Online" : "Cash on Delivery"}</span>
                        {request.is_paid && <Badge variant="default" className="ml-2">Paid ₹{request.total_price}</Badge>}
                      </p>
                    )}
                    <div className="flex items-center gap-2 mt-2">
                      <p className="text-xs text-muted-foreground">
                        {new Date(request.created_at).toLocaleDateString()} at{" "}
                        {new Date(request.created_at).toLocaleTimeString()}
                      </p>
                      {request.status === "pending" && (
                        <Badge variant="outline" className="bg-yellow-500/10 text-yellow-700">Pending Approval</Badge>
                      )}
                      {request.status === "approved" && !request.payment_method && (
                        <Badge variant="outline" className="bg-blue-500/10 text-blue-700">Waiting for Payment</Badge>
                      )}
                      {request.status === "order_confirmed" && (
                        <Badge variant="default" className="bg-green-600">Order Confirmed - Ready to Ship</Badge>
                      )}
                      {request.status === "shipped" && (
                        <Badge variant="secondary">Shipped</Badge>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    {request.status === "pending" && (
                      <>
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-red-600 hover:text-red-700 hover:bg-red-50"
                          onClick={() => handleRejectRequest(request.id)}
                        >
                          <XCircle className="h-4 w-4 mr-1" />
                          Reject
                        </Button>
                        <Button
                          size="sm"
                          className="bg-green-600 hover:bg-green-700"
                          onClick={() => handleApproveRequest(request.id)}
                        >
                          <CheckCircle className="h-4 w-4 mr-1" />
                          Accept Order
                        </Button>
                      </>
                    )}
                    {request.status === "approved" && !request.payment_method && (
                      <Badge variant="outline" className="bg-blue-500/10 text-blue-700">
                        Waiting for retailer payment
                      </Badge>
                    )}
                    {request.status === "order_confirmed" && (
                      <Button
                        size="sm"
                        className="bg-blue-600 hover:bg-blue-700"
                        onClick={() => handleMarkAsShipped(request.id)}
                      >
                        <TruckIcon className="h-4 w-4 mr-1" />
                        Mark as Shipped
                      </Button>
                    )}
                    {request.status === "shipped" && (
                      <Button
                        size="sm"
                        className="bg-green-600 hover:bg-green-700"
                        onClick={() => handleMarkAsDelivered(request.id)}
                      >
                        <CheckCircle className="h-4 w-4 mr-1" />
                        Mark as Delivered
                      </Button>
                    )}
                    {request.status === "delivered" && (
                      <Badge variant="default" className="bg-green-600">
                        <CheckCircle className="h-3 w-3 mr-1" />
                        Delivered
                      </Badge>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Bulk Inventory */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <CardTitle>Bulk Inventory</CardTitle>
              <Badge variant="secondary">{bulkInventory.length} items</Badge>
            </div>
            <div className="flex gap-2">
              <SeedProductsButton 
                userId={profile.id} 
                userRole="wholesaler"
                onSuccess={fetchProducts}
              />
              <Button onClick={() => setIsAddModalOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Add Bulk Stock
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {bulkInventory.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Boxes className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p className="mb-4">No bulk inventory added yet</p>
              <div className="flex gap-2 justify-center">
                <SeedProductsButton 
                  userId={profile.id} 
                  userRole="wholesaler"
                  onSuccess={fetchProducts}
                />
                <Button variant="outline" onClick={() => setIsAddModalOpen(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Bulk Stock
                </Button>
              </div>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Product</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Bulk Unit</TableHead>
                  <TableHead>Price</TableHead>
                  <TableHead>Stock</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {bulkInventory.map((product) => (
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
                    <TableCell>
                      <Badge variant="secondary">{product.category}</Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground">{product.bulkUnit}</TableCell>
                    <TableCell className="font-semibold">₹{product.price.toFixed(0)}</TableCell>
                    <TableCell>
                      <span className={product.stock < 50 ? "text-red-600 font-semibold" : ""}>
                        {product.stock}
                      </span>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Retailer Network */}
      <Card>
        <CardHeader>
          <CardTitle>Retailer Network</CardTitle>
        </CardHeader>
        <CardContent>
          {realRetailers.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Store className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No retailers have placed orders yet</p>
            </div>
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              {realRetailers.map((retailer) => {
                // Get order count for this retailer
                const orderCount = realOrders.filter(order => order.buyer_id === retailer.id).length;
                
                // Calculate distance if both have location data
                let distance = "-";
                if (profile.location_lat && profile.location_lng && retailer.location_lat && retailer.location_lng) {
                  const distanceKm = calculateDistance(
                    profile.location_lat,
                    profile.location_lng,
                    retailer.location_lat,
                    retailer.location_lng
                  );
                  distance = formatDistanceMiles(distanceKm);
                }
                
                return (
                  <Card key={retailer.id} className="hover:shadow-lg transition-shadow">
                    <CardContent className="p-6">
                      <div className="flex items-start gap-3 mb-4">
                        <div className="w-12 h-12 bg-secondary/10 rounded-lg flex items-center justify-center flex-shrink-0">
                          <Store className="h-6 w-6 text-secondary" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <h3 className="font-semibold truncate">{retailer.business_name || retailer.full_name}</h3>
                            <Badge variant="default" className="text-xs">Active</Badge>
                          </div>
                          <p className="text-sm text-muted-foreground flex items-center gap-1">
                            <MapPin className="h-3 w-3" />
                            {retailer.location_address || 'Location not set'}
                          </p>
                        </div>
                      </div>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Distance:</span>
                          <span className="font-medium">{distance}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Rating:</span>
                          <span className="font-medium">⭐ 4.5</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Orders:</span>
                          <span className="font-medium">{orderCount}</span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Completed Transactions */}
      {completedOrders.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Completed Transactions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {completedOrders.map((request) => (
                <div
                  key={request.id}
                  className="flex items-center justify-between p-3 border rounded-lg bg-green-50 dark:bg-green-950/20"
                >
                  <div className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-600" />
                    <span className="text-sm">
                      <span className="font-medium">{request.buyer?.business_name || request.buyer?.full_name}</span> received{" "}
                      <span className="font-medium">{request.quantity}</span> units of {request.product_name}
                    </span>
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {new Date(request.created_at).toLocaleDateString()}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default WholesalerDashboard;
