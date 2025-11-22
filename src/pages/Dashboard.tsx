import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LogOut, User, Package } from "lucide-react";
import { toast } from "sonner";
import CustomerDashboard from "@/components/dashboard/CustomerDashboard";
import RetailerDashboard from "@/components/dashboard/RetailerDashboard";
import WholesalerDashboard from "@/components/dashboard/WholesalerDashboard";
import CartDrawer from "@/components/cart/CartDrawer";
import NotificationBell from "@/components/NotificationBell";
import ProfileSettings from "@/components/ProfileSettings";
import { useMockData } from "@/contexts/MockDataContext";

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

const Dashboard = () => {
  const navigate = useNavigate();
  const { currentUser } = useMockData();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkUser();
  }, []);

  const checkUser = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        navigate("/auth");
        return;
      }

      const { data: profileData, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", session.user.id)
        .single();

      if (error) {
        // If profile doesn't exist (new user), create one
        if (error.code === 'PGRST116') {
          console.log("No profile found, creating profile for new user...");
          
          const newProfile = {
            id: session.user.id,
            full_name: session.user.user_metadata?.full_name || 
                       session.user.user_metadata?.name || 
                       session.user.email?.split('@')[0] || 
                       'User',
            role: (session.user.user_metadata?.role || 'customer') as 'customer' | 'retailer' | 'wholesaler',
            location: null,
            phone: null,
          };

          const { data: createdProfile, error: createError } = await supabase
            .from("profiles")
            .insert([newProfile])
            .select()
            .single();

          if (createError) {
            console.error("Error creating profile:", createError);
            throw createError;
          }
          
          setProfile(createdProfile);
          toast.success("Welcome to Live MART!");
        } else {
          throw error;
        }
      } else {
        setProfile(profileData);
      }
    } catch (error) {
      console.error("Error fetching profile:", error);
      toast.error("Failed to load profile");
    } finally {
      setLoading(false);
    }
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate("/");
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary" />
      </div>
    );
  }

  if (!profile) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-muted to-background">
      {/* Header */}
      <header className="border-b bg-card/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <h1 className="text-2xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
              Live MART
            </h1>
            <span className="text-sm text-muted-foreground capitalize">
              {profile.role} Portal
            </span>
          </div>
          <div className="flex items-center gap-4">
            <NotificationBell userId={currentUser.id} />
            <ProfileSettings profile={profile} userRole={profile.role} onProfileUpdate={checkUser} />
            <div className="flex items-center gap-2 text-sm">
              <User className="h-4 w-4 text-muted-foreground" />
              <span className="font-medium">{profile.full_name}</span>
            </div>
            {profile.role === "customer" && (
              <>
                <Button 
                  variant="ghost" 
                  size="sm"
                  onClick={() => navigate("/orders")}
                >
                  <Package className="h-4 w-4 mr-2" />
                  My Orders
                </Button>
                <CartDrawer />
              </>
            )}
            <Button variant="outline" size="sm" onClick={handleSignOut}>
              <LogOut className="h-4 w-4 mr-2" />
              Sign Out
            </Button>
          </div>
        </div>
      </header>

      {/* Dashboard Content */}
      <main className="container mx-auto px-4 py-8">
        {profile.role === "customer" && <CustomerDashboard profile={profile} />}
        {profile.role === "retailer" && <RetailerDashboard profile={profile} />}
        {profile.role === "wholesaler" && <WholesalerDashboard profile={profile} />}
      </main>
    </div>
  );
};

export default Dashboard;
