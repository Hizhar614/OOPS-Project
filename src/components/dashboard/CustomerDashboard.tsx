import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { ShoppingCart, Package, MapPin, Star, Search, Filter, X, Store } from "lucide-react";
import { useMockData } from "@/contexts/MockDataContext";
import ProductCard from "@/components/ProductCard";
import ProductDetailsModal from "@/components/products/ProductDetailsModal";
import { useState, useMemo, useEffect } from "react";
import { useCart } from "@/contexts/CartContext";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { calculateDistance } from "@/lib/distance";

type Profile = {
  id: string;
  full_name: string;
  role: "customer" | "retailer" | "wholesaler";
  location: any;
  location_lat?: number;
  location_lng?: number;
  phone: string | null;
};

interface CustomerDashboardProps {
  profile: Profile;
}

interface ProductWithSeller {
  id: string;
  name: string;
  description: string;
  price: number;
  stock: number;
  category: string;
  image_url: string;
  is_local_specialty: boolean;
  seller_id: string;
  seller_type: string;
  proxy_available: boolean;
  created_at: string;
  seller?: {
    id: string;
    full_name: string;
    business_name?: string;
    location_lat?: number;
    location_lng?: number;
    location_address?: string;
  };
}

// New interfaces for grouped products
interface GroupedProduct {
  name: string;
  image: string;
  category: string;
  minPrice: number;
  maxPrice: number;
  sellers: SellerOption[];
  sellerCount: number;
  nearestSeller: SellerOption | null;
  isLocal: boolean;
  totalStock: number;
  description: string;
}

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

const CustomerDashboard = ({ profile }: CustomerDashboardProps) => {
  const { retailers, orders } = useMockData();
  const { addToCart } = useCart();
  
  // Real products from database
  const [globalProducts, setGlobalProducts] = useState<ProductWithSeller[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(true);
  
  // Search and filter state
  const [searchQuery, setSearchQuery] = useState("");
  const [minPrice, setMinPrice] = useState("");
  const [maxPrice, setMaxPrice] = useState("");
  const [excludeOutOfStock, setExcludeOutOfStock] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  
  // Product details modal state
  const [selectedGroupedProduct, setSelectedGroupedProduct] = useState<GroupedProduct | null>(null);
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
  
  const activeOrders = orders.filter((o) => o.status !== "delivered");

  // Fetch global inventory on mount
  useEffect(() => {
    fetchGlobalInventory();
  }, []);

  const fetchGlobalInventory = async () => {
    try {
      setLoadingProducts(true);
      
      // Fetch all products with stock > 0, joining with seller profiles
      const { data, error } = await supabase
        .from("products")
        .select(`
          *,
          seller:profiles!products_seller_id_fkey(
            id,
            full_name,
            business_name,
            location_lat,
            location_lng,
            location_address
          )
        `)
        .gt("stock", 0) // Only show in-stock items
        .order("created_at", { ascending: false });

      if (error) throw error;

      console.log("Fetched global inventory:", data?.length || 0, "products");
      setGlobalProducts(data || []);
    } catch (error: any) {
      console.error("Error fetching global inventory:", error);
      toast.error("Failed to load products");
    } finally {
      setLoadingProducts(false);
    }
  };

  // Calculate distance between customer and seller
  const calculateSellerDistance = (seller: ProductWithSeller['seller']): number | null => {
    if (!profile.location_lat || !profile.location_lng || !seller?.location_lat || !seller?.location_lng) {
      return null;
    }
    return calculateDistance(
      profile.location_lat,
      profile.location_lng,
      seller.location_lat,
      seller.location_lng
    );
  };

  // Format distance for display
  const formatDistance = (distanceKm: number | null): string => {
    if (distanceKm === null) return "Distance unknown";
    if (distanceKm < 1) return `${(distanceKm * 1000).toFixed(0)}m away`;
    return `${distanceKm.toFixed(1)}km away`;
  };

  // STEP 1: Group products by name (deduplication)
  const groupedProducts = useMemo(() => {
    const grouped = new Map<string, GroupedProduct>();

    globalProducts.forEach((product) => {
      const key = product.name.toLowerCase().trim();
      
      // Calculate distance for this seller
      const distance = calculateSellerDistance(product.seller);

      const sellerOption: SellerOption = {
        productId: product.id,
        sellerId: product.seller_id,
        sellerName: product.seller?.full_name || "Unknown Seller",
        sellerBusinessName: product.seller?.business_name,
        price: product.price,
        stock: product.stock,
        distance,
        distanceFormatted: formatDistance(distance),
        isLocal: product.is_local_specialty,
        location_lat: product.seller?.location_lat,
        location_lng: product.seller?.location_lng,
      };

      if (grouped.has(key)) {
        const existing = grouped.get(key)!;
        existing.sellers.push(sellerOption);
        existing.sellerCount += 1;
        existing.minPrice = Math.min(existing.minPrice, product.price);
        existing.maxPrice = Math.max(existing.maxPrice, product.price);
        existing.totalStock += product.stock;
        existing.isLocal = existing.isLocal || product.is_local_specialty;

        // Update nearest seller if this one is closer
        if (distance !== null) {
          if (existing.nearestSeller === null || 
              (existing.nearestSeller.distance === null) ||
              (distance < existing.nearestSeller.distance)) {
            existing.nearestSeller = sellerOption;
          }
        }
      } else {
        grouped.set(key, {
          name: product.name,
          image: product.image_url || "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=400",
          category: product.category || "Other",
          minPrice: product.price,
          maxPrice: product.price,
          sellers: [sellerOption],
          sellerCount: 1,
          nearestSeller: sellerOption,
          isLocal: product.is_local_specialty,
          totalStock: product.stock,
          description: product.description || "",
        });
      }
    });

    // Sort sellers by distance within each group
    grouped.forEach((group) => {
      group.sellers.sort((a, b) => {
        if (a.distance === null) return 1;
        if (b.distance === null) return -1;
        return a.distance - b.distance;
      });
    });

    return Array.from(grouped.values());
  }, [globalProducts, profile.location_lat, profile.location_lng]);

  // Filter grouped products based on search and filters
  const filteredGroupedProducts = useMemo(() => {
    return groupedProducts.filter((p) => {
      // Search filter
      if (searchQuery && !p.name.toLowerCase().includes(searchQuery.toLowerCase())) {
        return false;
      }
      
      // Price range filter (use minPrice for filtering)
      if (minPrice && p.minPrice < parseFloat(minPrice)) return false;
      if (maxPrice && p.minPrice > parseFloat(maxPrice)) return false;
      
      // Stock filter
      if (excludeOutOfStock && p.totalStock === 0) return false;
      
      // Category filter
      if (selectedCategory !== "all" && p.category !== selectedCategory) return false;
      
      return true;
    });
  }, [groupedProducts, searchQuery, minPrice, maxPrice, excludeOutOfStock, selectedCategory]);

  // OLD CODE - Keep for reference but use grouped instead
  // Filter products based on search and filters
  const filteredProducts = useMemo(() => {
    return globalProducts.filter((p) => {
      
      // Search filter
      if (searchQuery && !p.name.toLowerCase().includes(searchQuery.toLowerCase())) {
        return false;
      }
      
      // Price range filter
      if (minPrice && p.price < parseFloat(minPrice)) return false;
      if (maxPrice && p.price > parseFloat(maxPrice)) return false;
      
      // Stock filter (redundant since we fetch stock > 0, but kept for consistency)
      if (excludeOutOfStock && p.stock === 0) return false;
      
      // Category filter
      if (selectedCategory !== "all" && p.category !== selectedCategory) return false;
      
      return true;
    });
  }, [globalProducts, searchQuery, minPrice, maxPrice, excludeOutOfStock, selectedCategory]);

  const hasActiveFilters = searchQuery || minPrice || maxPrice || excludeOutOfStock || selectedCategory !== "all";

  const clearFilters = () => {
    setSearchQuery("");
    setMinPrice("");
    setMaxPrice("");
    setExcludeOutOfStock(false);
    setSelectedCategory("all");
  };

  // Group filtered products by category (using grouped products)
  const productsByCategory = useMemo(() => {
    const grouped = filteredGroupedProducts.reduce((acc, product) => {
      const category = product.category || "Other";
      if (!acc[category]) {
        acc[category] = [];
      }
      acc[category].push(product);
      return acc;
    }, {} as Record<string, GroupedProduct[]>);

    return grouped;
  }, [filteredGroupedProducts]);

  // Define category order - Local Specialties first
  const categoryOrder = useMemo(() => {
    const categories = Object.keys(productsByCategory);
    
    // Sort categories with "Local Specialties" first, then alphabetically
    const localSpecialtiesProducts = filteredGroupedProducts.filter(p => p.isLocal);
    
    const sorted = [...categories].sort((a, b) => {
      // If Local Specialties exists, put it first
      if (a === "Local Specialties") return -1;
      if (b === "Local Specialties") return 1;
      return a.localeCompare(b);
    });

    // Add "Local Specialties" category if we have local specialty products but no category
    if (localSpecialtiesProducts.length > 0 && !sorted.includes("Local Specialties")) {
      return ["Local Specialties", ...sorted];
    }

    return sorted;
  }, [productsByCategory, filteredGroupedProducts]);

  // Get all unique categories for the filter dropdown
  const allCategories = useMemo(() => {
    return Array.from(new Set(groupedProducts.map(p => p.category || "Other"))).sort();
  }, [groupedProducts]);

  const handleProductClick = (product: GroupedProduct) => {
    setSelectedGroupedProduct(product);
    setIsDetailsModalOpen(true);
  };

  const handleAddToCart = (product: ProductWithSeller) => {
    // Transform database product to cart format
    const cartProduct = {
      id: product.id,
      name: product.name,
      price: product.price,
      image: product.image_url || "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=400",
      category: product.category || "Other",
      stock: product.stock,
      isLocal: product.is_local_specialty,
      sellerId: product.seller_id,
      sellerName: product.seller?.business_name || product.seller?.full_name || "Store",
      description: product.description || "",
      availabilityDate: "Today",
    };
    
    addToCart(cartProduct);
    toast.success(`${product.name} added to cart!`);
  };

  return (
    <>
      <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold mb-2">Welcome back, {profile.full_name}!</h2>
        <p className="text-muted-foreground">Discover fresh products from local retailers</p>
      </div>

      {/* Search and Filter Bar */}
      <Card>
        <CardContent className="p-4">
          <div className="flex gap-3">
            {/* Search Input */}
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search for products..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>

            {/* Filter Popover */}
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className="gap-2">
                  <Filter className="h-4 w-4" />
                  Filters
                  {hasActiveFilters && (
                    <Badge variant="secondary" className="ml-1 h-5 w-5 rounded-full p-0 flex items-center justify-center">
                      !
                    </Badge>
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-80" align="end">
                <div className="space-y-4">
                  <div className="space-y-2">
                    <h4 className="font-medium leading-none">Filter Products</h4>
                    <p className="text-sm text-muted-foreground">
                      Refine your search results
                    </p>
                  </div>

                  {/* Price Range */}
                  <div className="space-y-2">
                    <Label>Price Range (₹)</Label>
                    <div className="flex gap-2">
                      <Input
                        type="number"
                        placeholder="Min"
                        value={minPrice}
                        onChange={(e) => setMinPrice(e.target.value)}
                      />
                      <Input
                        type="number"
                        placeholder="Max"
                        value={maxPrice}
                        onChange={(e) => setMaxPrice(e.target.value)}
                      />
                    </div>
                  </div>

                  {/* Stock Availability */}
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="stock"
                      checked={excludeOutOfStock}
                      onCheckedChange={(checked) => setExcludeOutOfStock(checked as boolean)}
                    />
                    <label
                      htmlFor="stock"
                      className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                    >
                      Exclude Out of Stock
                    </label>
                  </div>

                  {/* Category Filter */}
                  <div className="space-y-2">
                    <Label>Category</Label>
                    <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                      <SelectTrigger>
                        <SelectValue placeholder="All Categories" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Categories</SelectItem>
                        {allCategories.map((category) => (
                          <SelectItem key={category} value={category}>
                            {category}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Clear Filters */}
                  {hasActiveFilters && (
                    <Button
                      variant="outline"
                      className="w-full"
                      onClick={clearFilters}
                    >
                      <X className="h-4 w-4 mr-2" />
                      Clear All Filters
                    </Button>
                  )}
                </div>
              </PopoverContent>
            </Popover>
          </div>

          {/* Active Filters Display */}
          {hasActiveFilters && (
            <div className="flex flex-wrap gap-2 mt-3">
              {searchQuery && (
                <Badge variant="secondary" className="gap-1">
                  Search: {searchQuery}
                  <X
                    className="h-3 w-3 cursor-pointer"
                    onClick={() => setSearchQuery("")}
                  />
                </Badge>
              )}
              {minPrice && (
                <Badge variant="secondary" className="gap-1">
                  Min: ₹{minPrice}
                  <X
                    className="h-3 w-3 cursor-pointer"
                    onClick={() => setMinPrice("")}
                  />
                </Badge>
              )}
              {maxPrice && (
                <Badge variant="secondary" className="gap-1">
                  Max: ₹{maxPrice}
                  <X
                    className="h-3 w-3 cursor-pointer"
                    onClick={() => setMaxPrice("")}
                  />
                </Badge>
              )}
              {excludeOutOfStock && (
                <Badge variant="secondary" className="gap-1">
                  In Stock Only
                  <X
                    className="h-3 w-3 cursor-pointer"
                    onClick={() => setExcludeOutOfStock(false)}
                  />
                </Badge>
              )}
              {selectedCategory !== "all" && (
                <Badge variant="secondary" className="gap-1">
                  {selectedCategory}
                  <X
                    className="h-3 w-3 cursor-pointer"
                    onClick={() => setSelectedCategory("all")}
                  />
                </Badge>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Stats Cards */}
      <div className="grid md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground mb-1">Unique Products</p>
                <p className="text-2xl font-bold">{groupedProducts.length}</p>
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
                <p className="text-sm text-muted-foreground mb-1">Total Listings</p>
                <p className="text-2xl font-bold">{globalProducts.length}</p>
              </div>
              <div className="w-12 h-12 bg-accent/10 rounded-xl flex items-center justify-center">
                <Star className="h-6 w-6 text-accent" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground mb-1">Nearby Stores</p>
                <p className="text-2xl font-bold">{retailers.length}</p>
              </div>
              <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center">
                <MapPin className="h-6 w-6 text-primary" />
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
              <div className="w-12 h-12 bg-secondary/10 rounded-xl flex items-center justify-center">
                <ShoppingCart className="h-6 w-6 text-secondary" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Loading State */}
      {loadingProducts && (
        <Card>
          <CardContent className="p-12 text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4" />
            <p className="text-muted-foreground">Loading products...</p>
          </CardContent>
        </Card>
      )}

      {/* No Results State */}
      {!loadingProducts && filteredGroupedProducts.length === 0 && (
        <Card>
          <CardContent className="p-12 text-center">
            <Package className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-xl font-semibold mb-2">No products found</h3>
            <p className="text-muted-foreground mb-4">
              {groupedProducts.length === 0 
                ? "No products are available at the moment. Check back soon!"
                : "No products match your search criteria. Try adjusting your filters."}
            </p>
            {hasActiveFilters && (
              <Button onClick={clearFilters} variant="outline">
                Clear Filters
              </Button>
            )}
          </CardContent>
        </Card>
      )}

      {/* Category Sections - Deduplicated View */}
      {!loadingProducts && filteredGroupedProducts.length > 0 && categoryOrder.map((category) => {
        // Get products for this category
        let categoryProducts: GroupedProduct[] = [];
        
        if (category === "Local Specialties") {
          // For Local Specialties, get all products marked as local specialty
          categoryProducts = filteredGroupedProducts.filter(p => p.isLocal);
        } else {
          categoryProducts = productsByCategory[category] || [];
        }

        if (categoryProducts.length === 0) return null;

        return (
          <Card key={category}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <CardTitle className="text-2xl">{category}</CardTitle>
                  <Badge variant="secondary">{categoryProducts.length} products</Badge>
                </div>
                {category === "Local Specialties" && (
                  <Badge variant="default" className="bg-green-600">
                    <Star className="h-3 w-3 mr-1 fill-current" />
                    Locally Sourced
                  </Badge>
                )}
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {categoryProducts.map((product, index) => (
                  <GroupedProductCard
                    key={`${product.name}-${index}`}
                    product={product}
                    onClick={() => handleProductClick(product)}
                  />
                ))}
              </div>
            </CardContent>
          </Card>
        );
      })}

      {/* Nearby Retailers */}
      <Card>
        <CardHeader>
          <CardTitle>Nearby Retailers</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {retailers.map((retailer) => (
              <div
                key={retailer.id}
                className="flex items-center justify-between p-4 border rounded-lg hover:bg-accent/5 transition-colors"
              >
                <div className="space-y-1">
                  <h3 className="font-semibold">{retailer.name}</h3>
                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <MapPin className="h-3 w-3" />
                      {retailer.distance}
                    </span>
                    <span className="flex items-center gap-1">
                      <Star className="h-3 w-3 fill-current text-primary" />
                      {retailer.rating}
                    </span>
                    <span>{retailer.productsCount} products</span>
                  </div>
                </div>
                <Button variant="outline" size="sm">
                  Browse
                </Button>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>

    {/* Seller Selection Modal - Shows multiple seller options */}
    {selectedGroupedProduct && (
      <ProductDetailsModal
        product={{
          id: selectedGroupedProduct.sellers[0].productId,
          name: selectedGroupedProduct.name,
          price: selectedGroupedProduct.minPrice,
          image: selectedGroupedProduct.image,
          category: selectedGroupedProduct.category,
          stock: selectedGroupedProduct.totalStock,
          isLocal: selectedGroupedProduct.isLocal,
          sellerId: selectedGroupedProduct.sellers[0].sellerId,
          sellerName: selectedGroupedProduct.sellers[0].sellerBusinessName || selectedGroupedProduct.sellers[0].sellerName,
          description: selectedGroupedProduct.description,
          availabilityDate: "Today",
        }}
        sellers={selectedGroupedProduct.sellers}
        onAddFromSeller={(seller, quantity) => {
          const cartProduct = {
            id: seller.productId,
            name: selectedGroupedProduct.name,
            price: seller.price,
            image: selectedGroupedProduct.image,
            category: selectedGroupedProduct.category,
            stock: seller.stock,
            isLocal: seller.isLocal,
            sellerId: seller.sellerId,
            sellerName: seller.sellerBusinessName || seller.sellerName,
            description: selectedGroupedProduct.description,
            availabilityDate: "Today",
          };
          
          addToCart(cartProduct, quantity);
          toast.success(`Added ${quantity} × ${selectedGroupedProduct.name} to cart from ${seller.sellerBusinessName || seller.sellerName}!`);
          setIsDetailsModalOpen(false);
          setSelectedGroupedProduct(null);
        }}
        isOpen={isDetailsModalOpen}
        onClose={() => {
          setIsDetailsModalOpen(false);
          setSelectedGroupedProduct(null);
        }}
      />
    )}
  </>
  );
};

// STEP 2: Grouped Product Card Component
interface GroupedProductCardProps {
  product: GroupedProduct;
  onClick: () => void;
}

const GroupedProductCard = ({ product, onClick }: GroupedProductCardProps) => {
  const isMultipleSellers = product.sellerCount > 1;
  const nearestStore = product.nearestSeller?.sellerBusinessName || product.nearestSeller?.sellerName || "Unknown Store";
  const priceRange = product.minPrice !== product.maxPrice;

  return (
    <Card 
      className="flex-shrink-0 w-full overflow-hidden hover:shadow-xl transition-all duration-300 cursor-pointer"
      onClick={onClick}
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
        {isMultipleSellers && (
          <Badge 
            variant="default" 
            className="absolute top-2 right-2 bg-blue-600"
          >
            {product.sellerCount} sellers
          </Badge>
        )}
      </div>
      <CardContent className="p-4 space-y-3">
        <div>
          <h3 className="font-semibold line-clamp-2 mb-1 min-h-[2.5rem]">
            {product.name}
          </h3>
          <p className="text-xs text-muted-foreground line-clamp-1">
            {isMultipleSellers ? (
              <span className="flex items-center gap-1">
                <Store className="h-3 w-3" />
                <strong>{nearestStore}</strong> + {product.sellerCount - 1} other{product.sellerCount - 1 > 1 ? 's' : ''}
              </span>
            ) : (
              nearestStore
            )}
          </p>
        </div>

        {/* Price */}
        <div className="flex items-baseline gap-2">
          <span className="text-2xl font-bold text-primary">
            {priceRange ? 'From ' : ''}₹{product.minPrice.toFixed(0)}
          </span>
          {priceRange && (
            <span className="text-sm text-muted-foreground line-through">
              ₹{product.maxPrice.toFixed(0)}
            </span>
          )}
        </div>

        {/* Stock Info */}
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>{product.totalStock} units available</span>
          {product.nearestSeller?.distance && (
            <span className="flex items-center gap-1">
              <MapPin className="h-3 w-3" />
              {product.nearestSeller.distanceFormatted}
            </span>
          )}
        </div>

        {/* Action Button */}
        <Button 
          className="w-full" 
          variant={isMultipleSellers ? "default" : "outline"}
          onClick={(e) => {
            e.stopPropagation();
            onClick();
          }}
        >
          {isMultipleSellers ? (
            <>
              <Store className="h-4 w-4 mr-2" />
              View {product.sellerCount} Options
            </>
          ) : (
            <>
              <ShoppingCart className="h-4 w-4 mr-2" />
              View Details
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  );
};

export default CustomerDashboard;
