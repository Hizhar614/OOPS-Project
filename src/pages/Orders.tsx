import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useMockData, Order } from "@/contexts/MockDataContext";
import { Package, MapPin, Calendar, CreditCard, Star, ArrowLeft, Eye } from "lucide-react";
import { format } from "date-fns";
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import ReviewModal from "@/components/reviews/ReviewModal";
import OrderTrackingModal from "@/components/orders/OrderTrackingModal";
import OrderReviewModal from "@/components/orders/OrderReviewModal";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const Orders = () => {
  const { orders, products } = useMockData();
  const navigate = useNavigate();
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const [selectedProductId, setSelectedProductId] = useState<string | null>(null);
  const [trackingOrder, setTrackingOrder] = useState<Order | null>(null);
  const [realOrders, setRealOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [reviewingOrder, setReviewingOrder] = useState<any | null>(null);

  useEffect(() => {
    fetchOrders();
  }, []);

  const fetchOrders = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('orders')
        .select(`
          *,
          seller:profiles!orders_seller_id_fkey(full_name, business_name),
          order_items(
            id,
            product_id,
            quantity,
            price,
            product:products(name, image_url, category)
          )
        `)
        .eq('buyer_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      console.log('📦 Fetched orders:', data);
      console.log('📍 First order delivery_address:', data?.[0]?.delivery_address);
      console.log('📍 Type of delivery_address:', typeof data?.[0]?.delivery_address);
      
      setRealOrders(data || []);
    } catch (error: any) {
      console.error('Error fetching orders:', error);
      toast.error('Failed to load orders');
    } finally {
      setLoading(false);
    }
  };

  // Helper function to format address from various formats
  const formatAddress = (addressData: any): string => {
    try {
      if (!addressData) {
        return "Address not provided";
      }

      // If it's a string that looks like JSON
      if (typeof addressData === 'string') {
        if (addressData.trim().startsWith('{')) {
          try {
            const parsed = JSON.parse(addressData);
            return parsed.address || addressData;
          } catch (parseError) {
            console.warn('Failed to parse address JSON:', parseError);
            return addressData;
          }
        }
        return addressData;
      }

      // If it's already an object
      if (typeof addressData === 'object') {
        if (addressData.address) {
          return addressData.address;
        }
        if (addressData.lat && addressData.lng) {
          return `Location: ${addressData.lat.toFixed(4)}, ${addressData.lng.toFixed(4)}`;
        }
      }

      return "Address not provided";
    } catch (error) {
      console.error('Error formatting address:', error);
      return "Address format error";
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "placed":
        return "bg-blue-500";
      case "processed":
        return "bg-yellow-500";
      case "out_for_delivery":
        return "bg-purple-500";
      case "delivered":
        return "bg-green-500";
      default:
        return "bg-gray-500";
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case "placed":
        return "Order Placed";
      case "processed":
        return "Processed";
      case "out_for_delivery":
        return "Out for Delivery";
      case "delivered":
        return "Delivered";
      default:
        return status;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-muted to-background">
      {/* Header */}
      <header className="border-b bg-card/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate("/dashboard")}
            className="mb-3"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Dashboard
          </Button>
          <div>
            <h1 className="text-2xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
              My Orders
            </h1>
            <p className="text-sm text-muted-foreground mt-2">
              Track your orders and leave reviews
            </p>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto" />
          </div>
        ) : realOrders.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <Package className="h-16 w-16 mx-auto text-muted-foreground mb-4 opacity-50" />
              <h3 className="text-xl font-semibold mb-2">No orders yet</h3>
              <p className="text-muted-foreground">
                Start shopping to see your orders here
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {realOrders.map((order) => (
              <Card key={order.id} className="cursor-pointer hover:shadow-lg transition-shadow">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardTitle className="text-lg mb-1">Order #{order.id.toString().slice(-8)}</CardTitle>
                      <p className="text-sm text-muted-foreground">
                        Placed on {format(new Date(order.created_at), "PPP")}
                      </p>
                      {order.seller && (
                        <p className="text-sm text-muted-foreground mt-1">
                          <span className="font-medium">Seller:</span> {order.seller.business_name || order.seller.full_name || 'Unknown Seller'}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge className={getStatusColor(order.status)}>
                        {getStatusLabel(order.status)}
                      </Badge>
                      {order.status === "delivered" ? (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setReviewingOrder(order)}
                        >
                          <Star className="h-4 w-4 mr-1" />
                          Review
                        </Button>
                      ) : (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setTrackingOrder(order)}
                        >
                          <Eye className="h-4 w-4 mr-1" />
                          Track
                        </Button>
                      )}
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Order Details */}
                <div className="grid md:grid-cols-3 gap-4 p-4 bg-accent/5 rounded-lg">
                  <div className="flex items-start gap-2">
                    <MapPin className="h-4 w-4 text-muted-foreground mt-0.5" />
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">Delivery Address</p>
                      <p className="text-sm font-medium">
                        {formatAddress(order.delivery_address)}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start gap-2">
                    <CreditCard className="h-4 w-4 text-muted-foreground mt-0.5" />
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">Payment Method</p>
                      <p className="text-sm font-medium">{order.payment_method}</p>
                    </div>
                  </div>
                  {order.scheduled_delivery && (
                    <div className="flex items-start gap-2">
                      <Calendar className="h-4 w-4 text-muted-foreground mt-0.5" />
                      <div>
                        <p className="text-xs text-muted-foreground mb-1">Scheduled Delivery</p>
                        <p className="text-sm font-medium">
                          {format(new Date(order.scheduled_delivery), "PPP")}
                        </p>
                      </div>
                    </div>
                  )}
                </div>

                {/* Order Items */}
                <div className="space-y-2">
                  <p className="text-sm font-semibold mb-2">Order Items</p>
                  {order.order_items?.map((item: any) => {
                    const product = item.product;
                    if (!product) return null;

                    return (
                      <div
                        key={item.id}
                        className="flex items-center justify-between p-3 border rounded-lg"
                      >
                        <div className="flex items-center gap-3">
                          <img
                            src={product.image_url || 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=400'}
                            alt={product.name}
                            className="w-12 h-12 rounded object-cover"
                          />
                          <div>
                            <p className="font-medium text-sm">{product.name}</p>
                            <p className="text-xs text-muted-foreground">
                              Qty: {item.quantity} × ₹{item.price.toFixed(0)}
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="font-semibold">₹{(item.price * item.quantity).toFixed(0)}</p>
                          {order.status === "delivered" && (
                            <Button
                              size="sm"
                              variant="ghost"
                              className="mt-1 h-7 text-xs"
                              onClick={() => {
                                setSelectedOrderId(order.id);
                                setSelectedProductId(product.id);
                              }}
                            >
                              <Star className="h-3 w-3 mr-1" />
                              Review
                            </Button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Order Total */}
                <div className="flex items-center justify-between pt-2 border-t">
                  <span className="font-semibold">Total Amount</span>
                  <span className="text-xl font-bold text-primary">
                    ₹{order.total_price?.toFixed(0) || '0'}
                  </span>
                </div>

                {/* Order Status Progress */}
                <div className="pt-4">
                  <div className="flex items-center justify-between mb-2">
                    {["placed", "processed", "out_for_delivery", "delivered"].map((status, index) => {
                      const isActive = ["placed", "processed", "out_for_delivery", "delivered"].indexOf(order.status) >= index;
                      return (
                        <div key={status} className="flex-1 relative">
                          <div
                            className={cn(
                              "h-2 rounded-full transition-colors",
                              isActive ? getStatusColor(status) : "bg-muted"
                            )}
                          />
                          {index < 3 && (
                            <div
                              className={cn(
                                "absolute top-0 left-full h-2 w-4 transition-colors",
                                isActive ? getStatusColor(status) : "bg-muted"
                              )}
                            />
                          )}
                        </div>
                      );
                    })}
                  </div>
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>Placed</span>
                    <span>Processed</span>
                    <span>Out for Delivery</span>
                    <span>Delivered</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </main>

      {selectedOrderId && selectedProductId && (
        <ReviewModal
          isOpen={true}
          onClose={() => {
            setSelectedOrderId(null);
            setSelectedProductId(null);
          }}
          productId={selectedProductId}
          orderId={selectedOrderId}
        />
      )}

      <OrderReviewModal
        order={reviewingOrder}
        isOpen={!!reviewingOrder}
        onClose={() => setReviewingOrder(null)}
        onReviewSubmitted={() => {
          fetchOrders();
          setReviewingOrder(null);
        }}
      />

      <OrderTrackingModal
        order={trackingOrder}
        isOpen={!!trackingOrder}
        onClose={() => setTrackingOrder(null)}
      />
    </div>
  );
};

function cn(...classes: any[]) {
  return classes.filter(Boolean).join(" ");
}

export default Orders;
