import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { useState, useEffect } from "react";
import { CalendarIcon, Loader2, ArrowLeft, MapPin, Store, Home } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { useCart } from "@/contexts/CartContext";
import { useMockData } from "@/contexts/MockDataContext";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import LocationPicker from "@/components/LocationPicker";
import { initiateStripePayment } from "@/lib/stripe";

interface CheckoutModalProps {
  isOpen: boolean;
  onClose: () => void;
  cartTotal: number;
}

const CheckoutModal = ({ isOpen, onClose, cartTotal }: CheckoutModalProps) => {
  const { cartItems, clearCart } = useCart();
  const { addOrder, decreaseProductStock } = useMockData();
  const navigate = useNavigate();
  
  // Order Type State
  const [orderType, setOrderType] = useState<'delivery' | 'pickup'>('delivery');
  
  const [address, setAddress] = useState("");
  const [location, setLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [showLocationPicker, setShowLocationPicker] = useState(false);
  const [paymentMode, setPaymentMode] = useState<"online" | "cod">("online");
  const [deliveryDate, setDeliveryDate] = useState<Date>();
  const [isProcessing, setIsProcessing] = useState(false);

  // Fetch user's profile to get existing delivery address (only for home delivery)
  useEffect(() => {
    if (isOpen && orderType === 'delivery') {
      fetchUserProfile();
    }
  }, [isOpen, orderType]);

  const fetchUserProfile = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: profile, error } = await supabase
        .from('profiles')
        .select('location_address, location_lat, location_lng')
        .eq('id', user.id)
        .single();

      if (error) throw error;

      if (profile?.location_address) {
        setAddress(profile.location_address);
      }

      if (profile?.location_lat && profile?.location_lng) {
        setLocation({
          lat: profile.location_lat,
          lng: profile.location_lng
        });
      }
    } catch (error: any) {
      console.error('Error fetching profile:', error);
    }
  };

  const handleLocationSelect = (lat: number, lng: number, addr: string) => {
    setLocation({ lat, lng });
    setAddress(addr);
    setShowLocationPicker(false);
    toast.success("Delivery location set!");
  };

  const handlePlaceOrder = async () => {
    console.log('🛒 Starting order placement...');
    console.log('📦 Order Type:', orderType);
    
    // Validation based on order type
    if (orderType === 'delivery') {
      // Home Delivery validation
      if (!address.trim()) {
        toast.error("Please enter delivery address");
        return;
      }

      if (!deliveryDate) {
        toast.error("Please select a delivery date");
        return;
      }
    } else {
      // Store Pickup validation
      if (!deliveryDate) {
        toast.error("Please select a collection date");
        return;
      }
    }

    setIsProcessing(true);

    try {
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error("You must be logged in to place an order");
        setIsProcessing(false);
        return;
      }

      // Process online payment with Stripe (only for home delivery with online payment)
      if (orderType === 'delivery' && paymentMode === "online") {
        const { data: profile } = await supabase
          .from('profiles')
          .select('full_name, phone')
          .eq('id', user.id)
          .single();

        const totalAmount = cartItems.reduce((sum, item) => sum + (item.product.price * item.quantity), 0);
        const tempOrderId = `order_${Date.now()}`;
        
        try {
          await new Promise<void>((resolve, reject) => {
            initiateStripePayment({
              amount: totalAmount,
              orderId: tempOrderId,
              customerName: profile?.full_name,
              description: `Order for ${cartItems.length} items from LiveMart`,
              onSuccess: (paymentId) => {
                console.log('✅ Payment successful:', paymentId);
                toast.success("Payment successful!");
                resolve();
              },
              onFailure: (error) => {
                console.error('❌ Payment failed:', error);
                toast.error(error.message || "Payment failed");
                reject(error);
              }
            });
          });
        } catch (paymentError) {
          setIsProcessing(false);
          return;
        }
      }

      // Group cart items by seller
      const itemsBySeller = cartItems.reduce((acc, item) => {
        const sellerId = item.product.sellerId;
        if (!acc[sellerId]) {
          acc[sellerId] = [];
        }
        acc[sellerId].push(item);
        return acc;
      }, {} as Record<string, typeof cartItems>);

      // Create separate orders for each seller
      for (const [sellerId, items] of Object.entries(itemsBySeller)) {
        const orderTotal = items.reduce((sum, item) => sum + (item.product.price * item.quantity), 0);

        // Order type specific data
        let deliveryAddressData;
        let paymentMethodValue;

        if (orderType === 'pickup') {
          // Store Pickup configuration
          deliveryAddressData = {
            address: "Self Pickup from Store",
            lat: null,
            lng: null
          };
          paymentMethodValue = "Pay at Store";
          
          console.log('🏪 Store Pickup Order - Payment at counter');
        } else {
          // Home Delivery configuration
          deliveryAddressData = { 
            address: address,
            lat: location?.lat || null,
            lng: location?.lng || null
          };
          paymentMethodValue = paymentMode === 'online' ? 'Online Payment' : 'Cash on Delivery';
          
          console.log('🏠 Home Delivery Order - Address:', deliveryAddressData);
        }

        console.log('📍 Delivery address being saved:', deliveryAddressData);

        // Create order in database - using buyer_id to match database schema
        const { data: orderData, error: orderError } = await supabase
          .from('orders')
          .insert({
            buyer_id: user.id,
            seller_id: sellerId,
            status: 'placed',
            payment_method: paymentMethodValue,
            total_price: orderTotal,
            delivery_address: deliveryAddressData,
            scheduled_delivery: deliveryDate?.toISOString() || null,
            product_name: items.map(i => i.product.name).join(', '),
            quantity: items.reduce((sum, i) => sum + i.quantity, 0),
          })
          .select()
          .single();

        console.log('✅ Order created:', orderData);

        if (orderError) {
          console.error('Order creation error:', orderError);
          throw orderError;
        }

        const orderId = orderData.id;

        // Create order items
        const orderItems = items.map(item => ({
          order_id: orderId,
          product_id: item.product.id,
          quantity: item.quantity,
          price: item.product.price,
        }));

        const { error: itemsError } = await supabase
          .from('order_items')
          .insert(orderItems);

        if (itemsError) throw itemsError;

        // Update product stock for each item
        for (const item of items) {
          console.log('Updating stock for product:', item.product.id, 'Current quantity:', item.quantity);
          
          const { data: product, error: fetchError } = await supabase
            .from('products')
            .select('stock')
            .eq('id', item.product.id)
            .single();

          if (fetchError) {
            console.error('Error fetching product stock:', fetchError);
            continue;
          }

          if (product) {
            const newStock = Math.max(0, product.stock - item.quantity);
            console.log(`Product ${item.product.name}: ${product.stock} -> ${newStock}`);
            
            const { error: updateError } = await supabase
              .from('products')
              .update({ stock: newStock })
              .eq('id', item.product.id);
            
            if (updateError) {
              console.error('Error updating stock:', updateError);
            } else {
              console.log('Stock updated successfully for', item.product.name);
            }
          }
        }
      }

      // Clear cart
      clearCart();

      setIsProcessing(false);
      
      // Success message based on order type
      if (orderType === 'pickup') {
        toast.success(
          "Order placed! You can collect it from the store on your selected date.",
          { duration: 5000 }
        );
      } else {
        toast.success(
          paymentMode === "online" 
            ? "Payment successful! Order placed for delivery." 
            : "Order placed successfully! Pay on delivery.",
          { duration: 5000 }
        );
      }

      onClose();
      navigate("/orders");
    } catch (error: any) {
      console.error('Order placement error:', error);
      toast.error(error.message || "Failed to place order. Please try again.");
      setIsProcessing(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              className="h-8 w-8 p-0"
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <DialogTitle>Checkout</DialogTitle>
          </div>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Order Summary */}
          <div className="p-4 bg-accent/10 rounded-lg">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-muted-foreground">Total Items</span>
              <span className="font-semibold">{cartItems.length}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-base font-semibold">Total Amount</span>
              <span className="text-xl font-bold text-primary">₹{cartTotal.toFixed(0)}</span>
            </div>
          </div>

          {/* Order Type Toggle */}
          <div className="space-y-3">
            <Label className="text-base font-semibold">Order Type</Label>
            <Tabs value={orderType} onValueChange={(value: any) => setOrderType(value)} className="w-full">
              <TabsList className="grid w-full grid-cols-2 h-auto p-1">
                <TabsTrigger 
                  value="delivery" 
                  className="flex items-center gap-2 py-3 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
                >
                  <Home className="h-4 w-4" />
                  <span className="font-medium">Home Delivery</span>
                </TabsTrigger>
                <TabsTrigger 
                  value="pickup" 
                  className="flex items-center gap-2 py-3 data-[state=active]:bg-secondary data-[state=active]:text-secondary-foreground"
                >
                  <Store className="h-4 w-4" />
                  <span className="font-medium">Store Pickup</span>
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </div>

          {/* HOME DELIVERY FORM */}
          {orderType === 'delivery' && (
            <>
              {/* Delivery Address */}
              <div className="space-y-2">
                <Label htmlFor="address">Delivery Address *</Label>
                
                {!showLocationPicker ? (
                  <>
                    <Textarea
                      id="address"
                      placeholder="Enter your complete delivery address..."
                      value={address}
                      onChange={(e) => setAddress(e.target.value)}
                      rows={3}
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="w-full mt-2"
                      onClick={() => setShowLocationPicker(true)}
                    >
                      <MapPin className="mr-2 h-4 w-4" />
                      {address ? "Change Location on Map" : "Select Location on Map"}
                    </Button>
                  </>
                ) : (
                  <div className="space-y-2">
                    <LocationPicker
                      initialLat={location?.lat}
                      initialLng={location?.lng}
                      initialAddress={address}
                      onLocationSelect={handleLocationSelect}
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="w-full"
                      onClick={() => setShowLocationPicker(false)}
                    >
                      Close Map
                    </Button>
                  </div>
                )}
              </div>

              {/* Payment Mode */}
              <div className="space-y-3">
                <Label>Payment Mode *</Label>
                <RadioGroup value={paymentMode} onValueChange={(value: any) => setPaymentMode(value)}>
                  <div className="flex items-center space-x-2 p-3 border rounded-lg">
                    <RadioGroupItem value="online" id="online" />
                    <Label htmlFor="online" className="flex-1 cursor-pointer">
                      Online Payment (Mock)
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2 p-3 border rounded-lg">
                    <RadioGroupItem value="cod" id="cod" />
                    <Label htmlFor="cod" className="flex-1 cursor-pointer">
                      Cash on Delivery (Offline)
                    </Label>
                  </div>
                </RadioGroup>
              </div>

              {/* Delivery Date Picker */}
              <div className="space-y-2">
                <Label>Select Delivery Date *</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !deliveryDate && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {deliveryDate ? format(deliveryDate, "PPP") : "Pick a delivery date"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={deliveryDate}
                      onSelect={setDeliveryDate}
                      disabled={(date) => date < new Date()}
                      initialFocus
                      className="pointer-events-auto"
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </>
          )}

          {/* STORE PICKUP FORM */}
          {orderType === 'pickup' && (
            <>
              {/* Collection Date Picker */}
              <div className="space-y-2">
                <Label>Select Collection Date *</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !deliveryDate && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {deliveryDate ? format(deliveryDate, "PPP") : "Pick a collection date"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={deliveryDate}
                      onSelect={setDeliveryDate}
                      disabled={(date) => date < new Date()}
                      initialFocus
                      className="pointer-events-auto"
                    />
                  </PopoverContent>
                </Popover>
              </div>

              {/* Store Pickup Info */}
              <div className="p-4 bg-secondary/10 border border-secondary/30 rounded-lg">
                <div className="flex items-start gap-3">
                  <Store className="h-5 w-5 text-secondary mt-0.5" />
                  <div className="flex-1">
                    <p className="text-sm font-semibold mb-1">Store Pickup Information</p>
                    <ul className="text-xs text-muted-foreground space-y-1">
                      <li>• Collect your order from the store counter</li>
                      <li>• Payment will be collected at the time of pickup</li>
                      <li>• Please bring your order confirmation</li>
                      <li>• Store hours: 9:00 AM - 8:00 PM (Daily)</li>
                    </ul>
                  </div>
                </div>
              </div>

              {/* Payment Badge */}
              <div className="flex items-center justify-center">
                <Badge variant="outline" className="py-2 px-4">
                  💰 Payment at Store Counter
                </Badge>
              </div>
            </>
          )}

          {/* Place Order Button */}
          <Button 
            className="w-full" 
            size="lg"
            onClick={handlePlaceOrder}
            disabled={isProcessing}
          >
            {isProcessing ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                {orderType === 'delivery' 
                  ? (paymentMode === "online" ? "Processing Payment..." : "Placing Order...")
                  : "Placing Order..."
                }
              </>
            ) : (
              <>
                {orderType === 'delivery' ? "Place Order" : "Confirm Pickup Order"}
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default CheckoutModal;
