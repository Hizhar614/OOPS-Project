import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { 
  Star, 
  Plus, 
  Minus, 
  ShoppingCart, 
  Package, 
  Building2, 
  Store,
  TrendingUp,
  Clock,
  MapPin
} from "lucide-react";
import { Product, useMockData } from "@/contexts/MockDataContext";
import { useCart } from "@/contexts/CartContext";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

interface SellerOption {
  productId: string;
  sellerId: string;
  sellerName: string;
  sellerBusinessName?: string;
  price: number;
  stock: number;
  distance: number | null;
  distanceFormatted: string;
  isLocal: boolean;
  location_lat?: number;
  location_lng?: number;
}

interface ProductDetailsModalProps {
  product: Product | null;
  isOpen: boolean;
  onClose: () => void;
  sellers?: SellerOption[];
  onAddFromSeller?: (seller: SellerOption, quantity: number) => void;
}

const ProductDetailsModal = ({ product, isOpen, onClose, sellers, onAddFromSeller }: ProductDetailsModalProps) => {
  const { getProductReviews } = useMockData();
  const { addToCart } = useCart();
  const [quantity, setQuantity] = useState(1);
  const [selectedSeller, setSelectedSeller] = useState<SellerOption | null>(
    sellers && sellers.length > 0 ? sellers[0] : null
  );

  // Reviews state
  const [reviews, setReviews] = useState<any[]>([]);
  const [averageRating, setAverageRating] = useState<number | null>(null);
  const [loadingReviews, setLoadingReviews] = useState(false);

  // Fetch reviews when modal opens
  useEffect(() => {
    if (!isOpen || !product) return;

    const fetchReviews = async () => {
      try {
        setLoadingReviews(true);
        
        // For multi-seller: use the selected seller's product ID
        // For single-seller: use the product's own ID
        const productIdToQuery = selectedSeller?.productId || product.id;

        console.log('🔍 Fetching reviews for product ID:', productIdToQuery);
        console.log('🔍 Selected seller:', selectedSeller);
        console.log('🔍 Product:', product);

        // Fetch reviews for this specific seller's product
        const { data: reviewsData, error: reviewsError } = await supabase
          .from('reviews')
          .select('*')
          .eq('product_id', productIdToQuery)
          .order('created_at', { ascending: false });

        if (reviewsError) {
          console.error('❌ Error fetching reviews:', reviewsError);
          throw reviewsError;
        }

        console.log('📝 Found reviews:', reviewsData);
        console.log('📝 Number of reviews:', reviewsData?.length || 0);

        const revs = reviewsData || [];
        setReviews(revs);

        // Calculate average
        if (revs.length === 0) {
          setAverageRating(null);
        } else {
          const avg = revs.reduce((sum: number, r: any) => sum + (r.rating || 0), 0) / revs.length;
          setAverageRating(avg);
        }
      } catch (err) {
        console.error('Failed to fetch reviews:', err);
        setReviews([]);
        setAverageRating(null);
      } finally {
        setLoadingReviews(false);
      }
    };

    fetchReviews();
  }, [isOpen, product, selectedSeller]);

  if (!product) return null;

  const isMultipleSellers = sellers && sellers.length > 1;

  const hasReviews = reviews.length > 0;

  const isLowStock = product.stock < 10;

  const handleAddToCart = () => {
    if (isMultipleSellers && selectedSeller && onAddFromSeller) {
      // Use the custom handler for multi-seller products
      onAddFromSeller(selectedSeller, quantity);
    } else {
      // Default single-seller behavior
      addToCart(product, quantity);
      toast.success(
        `Added ${quantity} × ${product.name} to cart!`,
        {
          description: `Total: ₹${(product.price * quantity).toFixed(0)}`,
        }
      );
      onClose();
    }
    setQuantity(1);
  };

  const handleSelectSeller = (seller: SellerOption) => {
    setSelectedSeller(seller);
  };

  const incrementQuantity = () => {
    if (quantity < product.stock) {
      setQuantity(quantity + 1);
    }
  };

  const decrementQuantity = () => {
    if (quantity > 1) {
      setQuantity(quantity - 1);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] p-0 overflow-hidden animate-scale-in">
        <div className="grid md:grid-cols-2 gap-0 max-h-[90vh] overflow-y-auto">
          {/* Left Side - Product Image */}
          <div className="relative bg-accent/5 p-4 md:p-8 flex items-center justify-center min-h-[300px] md:min-h-0">
            <div className="relative w-full max-w-md aspect-square">
              <img
                src={product.image}
                alt={product.name}
                className="w-full h-full object-cover rounded-lg shadow-lg"
              />
              {product.isLocal && (
                <Badge 
                  className="absolute top-4 left-4 bg-secondary text-secondary-foreground shadow-lg"
                >
                  Local
                </Badge>
              )}
            </div>
          </div>

          {/* Right Side - Product Details */}
          <div className="p-4 md:p-6 lg:p-8 flex flex-col max-h-[calc(90vh-300px)] md:max-h-[90vh] overflow-y-auto">
            {/* Header */}
            <div className="space-y-2 md:space-y-3 mb-4 md:mb-6">
              <div>
                <h2 className="text-xl md:text-2xl lg:text-3xl font-bold mb-1 md:mb-2">
                  {product.name}
                </h2>
                <p className="text-xs md:text-sm text-muted-foreground">
                  {product.category}
                </p>
              </div>

              {/* Rating */}
              <div className="flex items-center gap-2">
                {hasReviews ? (
                  <>
                    <div className="flex items-center">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <Star
                          key={star}
                          className={`h-4 w-4 ${
                            averageRating !== null && star <= Math.round(averageRating)
                              ? "fill-yellow-400 text-yellow-400"
                              : "text-gray-300"
                          }`}
                        />
                      ))}
                    </div>
                    <span className="text-sm font-medium">
                      {averageRating !== null ? `${averageRating.toFixed(1)}/5` : '0/5'}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      ({reviews.length} {reviews.length === 1 ? "review" : "reviews"})
                    </span>
                  </>
                ) : (
                  <Badge variant="secondary" className="text-xs">
                    New Arrival - Be the first to review!
                  </Badge>
                )}
              </div>
            </div>

            <Separator className="my-4" />

            {/* Price */}
            <div className="mb-4 md:mb-6">
              <div className="flex items-baseline gap-2 mb-1 md:mb-2">
                <span className="text-3xl md:text-4xl font-bold text-primary">
                  ₹{product.price.toFixed(0)}
                </span>
              </div>
              <p className="text-sm text-muted-foreground">
                Price per unit
              </p>
            </div>

            {/* Stock & Availability Info */}
            <div className="grid grid-cols-2 gap-2 md:gap-3 mb-4 md:mb-6">
              <div className="flex items-center gap-2 p-2 md:p-3 bg-accent/10 rounded-lg">
                <Package className={`h-4 md:h-5 w-4 md:w-5 ${isLowStock ? "text-red-600" : "text-green-600"}`} />
                <div>
                  <p className="text-xs text-muted-foreground">Stock</p>
                  <p className={`text-xs md:text-sm font-semibold ${isLowStock ? "text-red-600" : "text-green-600"}`}>
                    {product.stock} left
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 p-2 md:p-3 bg-accent/10 rounded-lg">
                <Clock className="h-4 md:h-5 w-4 md:w-5 text-muted-foreground" />
                <div>
                  <p className="text-xs text-muted-foreground">Available</p>
                  <p className="text-xs md:text-sm font-semibold">
                    {product.availabilityDate}
                  </p>
                </div>
              </div>
            </div>

            {/* Description */}
            <div className="mb-4 md:mb-6">
              <h3 className="text-xs md:text-sm font-semibold mb-1 md:mb-2">Description</h3>
              <p className="text-xs md:text-sm text-muted-foreground leading-relaxed">
                {product.description || `${product.name} - Freshly sourced from ${product.sellerName}. High quality product guaranteed with proper storage and handling.`}
              </p>
            </div>

            {/* Multi-Seller Selection - STEP 3 */}
            {isMultipleSellers && sellers && sellers.length > 1 && (
              <div className="mb-4 md:mb-6">
                <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
                  <Store className="h-4 w-4" />
                  Select a Seller ({sellers.length} options)
                </h3>
                <div className="space-y-2 max-h-[200px] overflow-y-auto pr-2">
                  {sellers.map((seller) => {
                    const isSelected = selectedSeller?.sellerId === seller.sellerId;
                    const displayName = seller.sellerBusinessName || seller.sellerName;
                    
                    return (
                      <div
                        key={seller.sellerId}
                        onClick={() => handleSelectSeller(seller)}
                        className={`p-3 border-2 rounded-lg cursor-pointer transition-all ${
                          isSelected
                            ? 'border-primary bg-primary/5'
                            : 'border-border hover:border-primary/50 hover:bg-accent/5'
                        }`}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <p className="font-semibold text-sm">{displayName}</p>
                              {seller.isLocal && (
                                <Badge variant="secondary" className="text-xs">
                                  Local
                                </Badge>
                              )}
                              {isSelected && (
                                <Badge variant="default" className="text-xs">
                                  Selected
                                </Badge>
                              )}
                            </div>
                            <div className="flex items-center gap-3 text-xs text-muted-foreground">
                              {seller.distance !== null && (
                                <span className="flex items-center gap-1">
                                  <MapPin className="h-3 w-3" />
                                  {seller.distanceFormatted}
                                </span>
                              )}
                              <span className="flex items-center gap-1">
                                <Package className="h-3 w-3" />
                                {seller.stock} in stock
                                </span>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="text-lg font-bold text-primary">
                              ₹{seller.price.toFixed(0)}
                            </p>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  💡 Sellers are sorted by distance from your location
                </p>
              </div>
            )}

            {/* Seller Info (for single seller) */}
            {!isMultipleSellers && (
              <div className="mb-4 md:mb-6 p-2 md:p-3 bg-accent/5 rounded-lg">
                <p className="text-xs text-muted-foreground mb-1">Sold by</p>
                <p className="text-xs md:text-sm font-semibold">{product.sellerName}</p>
              </div>
            )}

            <Separator className="my-3 md:my-4" />

            {/* Quantity Selector */}
            <div className="space-y-3 md:space-y-4 mt-auto">
              <div className="flex items-center justify-between">
                <span className="text-xs md:text-sm font-semibold">Quantity</span>
                <div className="flex items-center gap-2 md:gap-3">
                  <Button
                    size="icon"
                    variant="outline"
                    className="h-8 w-8 md:h-10 md:w-10"
                    onClick={decrementQuantity}
                    disabled={quantity <= 1}
                  >
                    <Minus className="h-3 w-3 md:h-4 md:w-4" />
                  </Button>
                  <span className="text-lg md:text-xl font-bold w-8 md:w-12 text-center">
                    {quantity}
                  </span>
                  <Button
                    size="icon"
                    variant="outline"
                    className="h-8 w-8 md:h-10 md:w-10"
                    onClick={incrementQuantity}
                    disabled={quantity >= product.stock}
                  >
                    <Plus className="h-3 w-3 md:h-4 md:w-4" />
                  </Button>
                </div>
              </div>

              {/* Subtotal */}
              <div className="flex items-center justify-between py-2 md:py-3 px-3 md:px-4 bg-primary/5 rounded-lg">
                <span className="text-xs md:text-sm font-semibold">Subtotal</span>
                <span className="text-xl md:text-2xl font-bold text-primary">
                  ₹{((selectedSeller?.price || product.price) * quantity).toFixed(0)}
                </span>
              </div>

              {/* Add to Cart Button */}
              <Button 
                className="w-full h-10 md:h-12 text-sm md:text-base" 
                size="lg"
                onClick={handleAddToCart}
                disabled={product.stock === 0 || (isMultipleSellers && !selectedSeller)}
              >
                <ShoppingCart className="h-4 w-4 md:h-5 md:w-5 mr-2" />
                {product.stock === 0 
                  ? "Out of Stock" 
                  : isMultipleSellers && selectedSeller
                    ? `Add from ${selectedSeller.sellerBusinessName || selectedSeller.sellerName}`
                    : "Add to Cart"}
              </Button>
            </div>

            {/* Customer Reviews Section */}
            <Separator className="my-4 md:my-6" />
            
            <div className="space-y-4">
              <h3 className="text-base md:text-lg font-semibold">Customer Reviews</h3>
              
              {loadingReviews ? (
                <div className="text-center py-6 md:py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
                  <p className="text-sm text-muted-foreground mt-2">Loading reviews...</p>
                </div>
              ) : reviews.length === 0 ? (
                <div className="text-center py-6 md:py-8 bg-accent/5 rounded-lg">
                  <Star className="h-10 w-10 md:h-12 md:w-12 mx-auto mb-2 text-muted-foreground" />
                  <p className="text-sm text-muted-foreground">
                    No reviews yet. Be the first to leave feedback!
                  </p>
                </div>
              ) : (
                <div className="space-y-3 md:space-y-4 max-h-[300px] overflow-y-auto">
                  {reviews.map((review) => (
                    <div
                      key={review.id}
                      className="p-3 md:p-4 bg-accent/5 rounded-lg border border-border/50"
                    >
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <p className="text-sm font-semibold">
                            Verified Buyer
                          </p>
                          <div className="flex items-center gap-1 mt-1">
                            {[1, 2, 3, 4, 5].map((star) => (
                              <Star
                                key={star}
                                className={`h-3 w-3 md:h-4 md:w-4 ${
                                  star <= review.rating
                                    ? "fill-yellow-400 text-yellow-400"
                                    : "text-gray-300"
                                }`}
                              />
                            ))}
                          </div>
                        </div>
                        <span className="text-xs text-muted-foreground">
                          {new Date(review.created_at).toLocaleDateString()}
                        </span>
                      </div>
                      {review.comment && (
                        <p className="text-xs md:text-sm text-muted-foreground leading-relaxed">
                          {review.comment}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ProductDetailsModal;
