import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useState } from "react";
import { toast } from "sonner";
import { CreditCard, Banknote } from "lucide-react";

interface StockOrderModalProps {
  product: any | null;
  wholesaler: any | null;
  isOpen: boolean;
  onClose: () => void;
  onConfirmOrder: (quantity: number, paymentMethod: string) => void;
}

const StockOrderModal = ({
  product,
  wholesaler,
  isOpen,
  onClose,
  onConfirmOrder,
}: StockOrderModalProps) => {
  const [quantity, setQuantity] = useState(1);

  const handleConfirm = () => {
    if (!product) return;
    
    if (quantity <= 0) {
      toast.error("Please enter a valid quantity");
      return;
    }

    if (quantity > product.stock) {
      toast.error(`Only ${product.stock} units available`);
      return;
    }

    onConfirmOrder(quantity, "pending"); // Payment will be selected after approval
    
    // Reset form
    setQuantity(1);
  };

  const handleClose = () => {
    setQuantity(1);
    onClose();
  };

  if (!product || !wholesaler) return null;

  const totalPrice = product.price * quantity;

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-md bg-card">
        <DialogHeader>
          <DialogTitle>Order Stock from {wholesaler.full_name}</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6">
          {/* Product Info */}
          <div className="flex items-center gap-4 p-4 bg-accent/50 rounded-lg">
            <img
              src={product.image_url || "https://images.unsplash.com/photo-1488459716781-31db52582fe9?w=400"}
              alt={product.name}
              className="w-16 h-16 rounded object-cover"
            />
            <div className="flex-1">
              <h3 className="font-semibold">{product.name}</h3>
              <p className="text-sm text-muted-foreground">
                Available: {product.stock} units
              </p>
              <p className="text-lg font-bold text-primary">₹{product.price}/unit</p>
            </div>
          </div>

          {/* Quantity Input */}
          <div className="space-y-2">
            <Label htmlFor="quantity">Quantity</Label>
            <Input
              id="quantity"
              type="number"
              min="1"
              max={product.stock}
              value={quantity}
              onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
              className="text-lg"
            />
            <p className="text-sm text-muted-foreground">
              Maximum: {product.stock} units available
            </p>
          </div>

          {/* Total */}
          <div className="flex justify-between items-center p-4 bg-primary/10 rounded-lg">
            <span className="font-semibold">Estimated Total:</span>
            <span className="text-2xl font-bold text-primary">₹{totalPrice.toFixed(2)}</span>
          </div>
          <p className="text-xs text-muted-foreground text-center">
            Payment method will be selected after wholesaler approves your order
          </p>

          {/* Action Buttons */}
          <div className="flex gap-3">
            <Button variant="outline" onClick={handleClose} className="flex-1">
              Cancel
            </Button>
            <Button onClick={handleConfirm} className="flex-1">
              Request Stock
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default StockOrderModal;
