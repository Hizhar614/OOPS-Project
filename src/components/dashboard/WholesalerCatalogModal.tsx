import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { ShoppingCart, MapPin, AlertCircle } from "lucide-react";
import { Product } from "@/contexts/MockDataContext";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface WholesalerCatalogModalProps {
  wholesaler: any | null;
  isOpen: boolean;
  onClose: () => void;
  onOrderStock: (product: any, wholesalerId: string) => void;
  refreshTrigger?: number;
  hasLocation?: boolean;
}

const WholesalerCatalogModal = ({
  wholesaler,
  isOpen,
  onClose,
  onOrderStock,
  refreshTrigger,
  hasLocation = true,
}: WholesalerCatalogModalProps) => {
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (wholesaler && isOpen) {
      fetchWholesalerProducts();
    }
  }, [wholesaler, isOpen, refreshTrigger]);

  const fetchWholesalerProducts = async () => {
    if (!wholesaler) return;
    
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("products")
        .select("*")
        .eq("seller_id", wholesaler.id);

      if (error) throw error;
      setProducts(data || []);
    } catch (error) {
      console.error("Error fetching products:", error);
      toast.error("Failed to load wholesaler products");
    } finally {
      setLoading(false);
    }
  };

  if (!wholesaler) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl bg-card">
        <DialogHeader>
          <DialogTitle className="text-2xl">
            {wholesaler.full_name} - Product Catalog
          </DialogTitle>
          <p className="text-sm text-muted-foreground">
            Browse and order products from this wholesaler
          </p>
        </DialogHeader>
        {!hasLocation && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              <strong>Location Required:</strong> You must set your store location in Profile Settings before you can order from wholesalers.
            </AlertDescription>
          </Alert>
        )}
        <ScrollArea className="max-h-[500px] pr-4">
          {loading ? (
            <div className="text-center py-8 text-muted-foreground">Loading products...</div>
          ) : products.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">No products available from this wholesaler</div>
          ) : (
            <div className="space-y-4">
              {products.map((product) => (
                <div
                  key={product.id}
                  className="flex items-center gap-4 p-4 border rounded-lg hover:bg-accent/5 transition-colors"
                >
                  <img
                    src={product.image_url || "https://images.unsplash.com/photo-1488459716781-31db52582fe9?w=400"}
                    alt={product.name}
                    className="w-20 h-20 rounded object-cover flex-shrink-0"
                  />
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold mb-1">{product.name}</h3>
                    <div className="flex items-center gap-2 mb-2">
                      <Badge variant="secondary">{product.category}</Badge>
                      <span className="text-sm text-muted-foreground">
                        Stock: {product.stock} units
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground line-clamp-2">
                      {product.description}
                    </p>
                  </div>
                  <div className="flex flex-col items-end gap-2 flex-shrink-0">
                    <span className="text-xl font-bold text-primary">
                      ₹{product.price?.toFixed(0) || 0}
                    </span>
                    <Button
                      size="sm"
                      onClick={() => onOrderStock(product, wholesaler.id)}
                      disabled={!hasLocation}
                      title={!hasLocation ? "Set your location first" : ""}
                    >
                      {!hasLocation ? (
                        <>
                          <MapPin className="h-4 w-4 mr-2" />
                          Set Location First
                        </>
                      ) : (
                        <>
                          <ShoppingCart className="h-4 w-4 mr-2" />
                          Order Stock
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
};

export default WholesalerCatalogModal;
