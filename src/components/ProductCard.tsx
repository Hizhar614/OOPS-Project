import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Clock, TrendingUp, Package, Star } from "lucide-react";
import { Product, useMockData } from "@/contexts/MockDataContext";

interface ProductCardProps {
  product: Product;
  onAddToCart?: (product: Product) => void;
  onClick?: (product: Product) => void;
}

const ProductCard = ({ product, onAddToCart, onClick }: ProductCardProps) => {
  const { getProductReviews } = useMockData();
  const isOutOfStock = product.stock === 0;
  const isLowStock = product.stock < 10 && product.stock > 0;
  
  const reviews = getProductReviews(product.id);
  const hasReviews = reviews.length > 0;
  const averageRating = hasReviews
    ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length
    : 0;

  return (
    <Card 
      className="flex-shrink-0 w-[280px] overflow-hidden hover:shadow-xl transition-all duration-300 cursor-pointer hover-scale"
      onClick={() => onClick?.(product)}
    >
      <div className="relative aspect-square">
        <img
          src={product.image}
          alt={product.name}
          className="object-cover w-full h-full"
        />
        {product.isLocal && (
          <Badge 
            className="absolute top-2 left-2 bg-secondary text-secondary-foreground"
          >
            Local
          </Badge>
        )}
      </div>
      <CardContent className="p-4 space-y-3">
        <div>
          <h3 className="font-semibold line-clamp-2 mb-1 min-h-[2.5rem]">
            {product.name}
          </h3>
          <p className="text-xs text-muted-foreground line-clamp-1">
            {product.sellerName}
          </p>
        </div>

        {/* Rating */}
        <div className="flex items-center gap-1 mb-2">
          {hasReviews ? (
            <>
              <div className="flex items-center">
                {[1, 2, 3, 4, 5].map((star) => (
                  <Star
                    key={star}
                    className={`h-3 w-3 ${
                      star <= Math.round(averageRating)
                        ? "fill-yellow-400 text-yellow-400"
                        : "text-gray-300"
                    }`}
                  />
                ))}
              </div>
              <span className="text-xs text-muted-foreground ml-1">
                ({reviews.length})
              </span>
            </>
          ) : (
            <Badge variant="secondary" className="text-xs px-2 py-0.5">
              No ratings yet
            </Badge>
          )}
        </div>

        {/* Price - Large and Bold */}
        <div className="flex items-baseline gap-2">
          <span className="text-3xl font-bold text-primary">
            ₹{product.price.toFixed(0)}
          </span>
        </div>

        {/* Stock Status */}
        <div className="flex items-center justify-between py-2 px-3 bg-accent/10 rounded-md">
          <div className="flex items-center gap-2">
            <Package 
              className={`h-4 w-4 ${
                isOutOfStock 
                  ? "text-red-600" 
                  : isLowStock 
                  ? "text-orange-600" 
                  : "text-green-600"
              }`} 
            />
            <span 
              className={`text-sm font-medium ${
                isOutOfStock 
                  ? "text-red-600" 
                  : isLowStock 
                  ? "text-orange-600" 
                  : "text-green-600"
              }`}
            >
              {isOutOfStock ? "Out of Stock" : isLowStock ? "Low Stock" : "In Stock"}
            </span>
          </div>
          {!isOutOfStock && (
            <span className="text-sm text-muted-foreground">
              {product.stock} left
            </span>
          )}
        </div>

        {/* Availability Date */}
        <div className="flex items-center gap-2 text-sm">
          <Clock className="h-4 w-4 text-muted-foreground" />
          <span className="text-muted-foreground">
            Available: <span className="font-medium text-foreground">{product.availabilityDate}</span>
          </span>
        </div>

        {/* Add to Cart Button */}
        <Button 
          className="w-full" 
          size="sm"
          disabled={isOutOfStock}
          onClick={(e) => {
            e.stopPropagation();
            onAddToCart?.(product);
          }}
        >
          {isOutOfStock ? "Out of Stock" : "Add to Cart"}
        </Button>
      </CardContent>
    </Card>
  );
};

export default ProductCard;
