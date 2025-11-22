import { useState } from "react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Package, Loader2 } from "lucide-react";

interface SeedProductsButtonProps {
  userId: string;
  userRole: "retailer" | "wholesaler";
  onSuccess?: () => void;
}

const SeedProductsButton = ({ userId, userRole, onSuccess }: SeedProductsButtonProps) => {
  const [loading, setLoading] = useState(false);

  const seedProducts = async () => {
    setLoading(true);
    
    try {
      // Default products for seeding
      const defaultProducts = [
        {
          name: "Fresh Apples",
          description: "Crisp and juicy apples from local orchards",
          price: 3.99,
          stock: 100,
          category: "Fruits",
          is_local_specialty: true,
          seller_id: userId,
          seller_type: userRole,
          image_url: "https://images.unsplash.com/photo-1560806887-1e4cd0b6cbd6?w=400",
          proxy_available: true,
        },
        {
          name: "Organic Tomatoes",
          description: "Fresh organic tomatoes, locally grown",
          price: 4.50,
          stock: 75,
          category: "Vegetables",
          is_local_specialty: true,
          seller_id: userId,
          seller_type: userRole,
          image_url: "https://images.unsplash.com/photo-1546470427-e26264959f8e?w=400",
          proxy_available: false,
        },
        {
          name: "Farm Fresh Eggs",
          description: "Free-range eggs from happy chickens",
          price: 5.99,
          stock: 50,
          category: "Dairy & Eggs",
          is_local_specialty: false,
          seller_id: userId,
          seller_type: userRole,
          image_url: "https://images.unsplash.com/photo-1582722872445-44dc5f7e3c8f?w=400",
          proxy_available: true,
        },
        {
          name: "Whole Wheat Bread",
          description: "Freshly baked whole wheat bread",
          price: 3.50,
          stock: 30,
          category: "Bakery",
          is_local_specialty: false,
          seller_id: userId,
          seller_type: userRole,
          image_url: "https://images.unsplash.com/photo-1509440159596-0249088772ff?w=400",
          proxy_available: false,
        },
        {
          name: "Local Honey",
          description: "Pure honey from local beekeepers",
          price: 8.99,
          stock: 25,
          category: "Pantry",
          is_local_specialty: true,
          seller_id: userId,
          seller_type: userRole,
          image_url: "https://images.unsplash.com/photo-1587049352846-4a222e784f4d?w=400",
          proxy_available: true,
        },
      ];

      const { data, error } = await supabase
        .from("products")
        .insert(defaultProducts)
        .select();

      if (error) throw error;

      toast.success(`Successfully added ${data.length} products to your inventory!`);
      
      if (onSuccess) {
        onSuccess();
      }
    } catch (error: any) {
      console.error("Error seeding products:", error);
      toast.error(error.message || "Failed to seed products");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button
      onClick={seedProducts}
      disabled={loading}
      variant="outline"
      className="gap-2"
    >
      {loading ? (
        <>
          <Loader2 className="h-4 w-4 animate-spin" />
          Adding Products...
        </>
      ) : (
        <>
          <Package className="h-4 w-4" />
          Seed 5 Sample Products
        </>
      )}
    </Button>
  );
};

export default SeedProductsButton;
