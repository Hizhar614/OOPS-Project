import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useState } from "react";
import { CreditCard, Banknote, Loader2 } from "lucide-react";
import { initiateStripePayment } from "@/lib/stripe";
import { toast } from "sonner";

interface PaymentModalProps {
  order: any | null;
  isOpen: boolean;
  onClose: () => void;
  onConfirmPayment: (orderId: string, paymentMethod: string, paymentId?: string) => void;
  userProfile?: {
    full_name?: string;
    phone?: string;
  };
}

const PaymentModal = ({
  order,
  isOpen,
  onClose,
  onConfirmPayment,
  userProfile,
}: PaymentModalProps) => {
  const [paymentMethod, setPaymentMethod] = useState("online");
  const [isProcessing, setIsProcessing] = useState(false);

  const handleConfirm = async () => {
    if (!order) return;
    
    if (paymentMethod === "online") {
      setIsProcessing(true);
      
      try {
        await initiateStripePayment({
          amount: order.total_price,
          orderId: order.id,
          customerName: userProfile?.full_name,
          customerPhone: userProfile?.phone,
          description: `Stock Order: ${order.product_name} (${order.quantity} units)`,
          onSuccess: (paymentId, orderId) => {
            console.log('✅ Payment successful:', paymentId);
            toast.success("Payment successful!");
            onConfirmPayment(order.id, paymentMethod, paymentId);
            setIsProcessing(false);
            setPaymentMethod("online");
          },
          onFailure: (error) => {
            console.error('❌ Payment failed:', error);
            toast.error(error.message || "Payment failed. Please try again.");
            setIsProcessing(false);
          }
        });
      } catch (error: any) {
        console.error('Payment error:', error);
        toast.error("Failed to process payment");
        setIsProcessing(false);
      }
    } else {
      // COD payment
      onConfirmPayment(order.id, paymentMethod);
      setPaymentMethod("online");
    }
  };

  const handleClose = () => {
    setPaymentMethod("online");
    onClose();
  };

  if (!order) return null;

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-md bg-card">
        <DialogHeader>
          <DialogTitle>
            {isProcessing ? "Processing Payment..." : "Select Payment Method"}
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6">
          {/* Order Info */}
          <div className="p-4 bg-accent/50 rounded-lg">
            <h3 className="font-semibold mb-2">{order.product_name}</h3>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Quantity:</span>
              <span className="font-medium">{order.quantity} units</span>
            </div>
            <div className="flex justify-between text-sm mt-1">
              <span className="text-muted-foreground">Total Amount:</span>
              <span className="text-lg font-bold text-primary">₹{order.total_price}</span>
            </div>
          </div>

          {/* Processing State */}
          {isProcessing && (
            <Alert>
              <Loader2 className="h-4 w-4 animate-spin" />
              <AlertDescription>
                Processing your payment through Stripe. Please wait...
              </AlertDescription>
            </Alert>
          )}

          {/* Payment Method */}
          <div className="space-y-2">
            <Label>Choose Payment Method</Label>
            <RadioGroup value={paymentMethod} onValueChange={setPaymentMethod} disabled={isProcessing}>
              <div className={`flex items-center space-x-2 p-3 border rounded-lg ${!isProcessing && 'hover:bg-accent/50 cursor-pointer'} ${isProcessing && 'opacity-50'}`}>
                <RadioGroupItem value="online" id="online" disabled={isProcessing} />
                <Label htmlFor="online" className={`flex items-center gap-2 ${!isProcessing && 'cursor-pointer'} flex-1`}>
                  <CreditCard className="h-4 w-4" />
                  <div className="flex flex-col">
                    <span>Online Payment via Stripe</span>
                    <span className="text-xs text-muted-foreground">Secure payment with UPI/Card</span>
                  </div>
                </Label>
              </div>
              <div className={`flex items-center space-x-2 p-3 border rounded-lg ${!isProcessing && 'hover:bg-accent/50 cursor-pointer'} ${isProcessing && 'opacity-50'}`}>
                <RadioGroupItem value="cod" id="cod" disabled={isProcessing} />
                <Label htmlFor="cod" className={`flex items-center gap-2 ${!isProcessing && 'cursor-pointer'} flex-1`}>
                  <Banknote className="h-4 w-4" />
                  <div className="flex flex-col">
                    <span>Cash on Delivery</span>
                    <span className="text-xs text-muted-foreground">Pay when order is delivered</span>
                  </div>
                </Label>
              </div>
            </RadioGroup>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3">
            <Button variant="outline" onClick={handleClose} className="flex-1" disabled={isProcessing}>
              Cancel
            </Button>
            <Button onClick={handleConfirm} className="flex-1" disabled={isProcessing}>
              {isProcessing ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Processing...
                </>
              ) : paymentMethod === "online" ? (
                <>
                  <CreditCard className="h-4 w-4 mr-2" />
                  Pay ₹{order.total_price}
                </>
              ) : (
                "Confirm COD"
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default PaymentModal;
