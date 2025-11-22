import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Store, Users, Package, MapPin, ShoppingCart, TrendingUp } from "lucide-react";
import { Link } from "react-router-dom";
const Landing = () => {
  return <div className="min-h-screen bg-background">
      {/* Hero Section */}
      <div className="relative overflow-hidden bg-gradient-to-br from-background via-muted to-background">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-accent/5 to-transparent" />
        
        <div className="container mx-auto px-4 py-16 relative">
          <div className="text-center max-w-4xl mx-auto mb-16">
            <div className="inline-flex items-center gap-2 bg-primary/10 text-primary px-4 py-2 rounded-full text-sm font-medium mb-6">
              <TrendingUp className="h-4 w-4" />
              Connecting Local Businesses
            </div>
            
            <h1 className="text-5xl md:text-6xl font-bold mb-6 bg-gradient-to-r from-primary via-secondary to-primary bg-clip-text text-orange-600">
              LIVE MART  
            </h1>
            
            <p className="text-xl text-muted-foreground mb-8 leading-relaxed">
              The ultimate multi-role e-commerce platform connecting customers, retailers, 
              and wholesalers in one seamless marketplace. Shop local, support local.
            </p>
            
            <div className="flex flex-wrap gap-4 justify-center">
              <Link to="/auth">
                <Button size="lg" className="bg-primary hover:bg-primary-light transition-all">
                  Get Started
                  <ShoppingCart className="ml-2 h-5 w-5" />
                </Button>
              </Link>
            </div>
          </div>

          {/* Role Cards */}
          <div className="grid md:grid-cols-3 gap-6 max-w-6xl mx-auto">
            <Card className="group hover:shadow-strong transition-all duration-300 hover:-translate-y-1 border-2 hover:border-primary/50">
              <CardContent className="p-6 text-center">
                <div className="w-16 h-16 bg-gradient-to-br from-primary to-primary-light rounded-2xl flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform">
                  <ShoppingCart className="h-8 w-8 text-white" />
                </div>
                <h3 className="text-xl font-bold mb-3">Customers</h3>
                <p className="text-muted-foreground mb-4">
                  Browse local products, compare prices, and enjoy fast delivery from nearby retailers
                </p>
                <ul className="text-sm text-left space-y-2 text-muted-foreground">
                  <li className="flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-primary" />
                    Location-based shopping
                  </li>
                  <li className="flex items-center gap-2">
                    <Package className="h-4 w-4 text-primary" />
                    Fast local delivery
                  </li>
                  <li className="flex items-center gap-2">
                    <Store className="h-4 w-4 text-primary" />
                    Support local businesses
                  </li>
                </ul>
              </CardContent>
            </Card>

            <Card className="group hover:shadow-strong transition-all duration-300 hover:-translate-y-1 border-2 hover:border-secondary/50">
              <CardContent className="p-6 text-center">
                <div className="w-16 h-16 bg-gradient-to-br from-secondary to-secondary/80 rounded-2xl flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform">
                  <Store className="h-8 w-8 text-white" />
                </div>
                <h3 className="text-xl font-bold mb-3">Retailers</h3>
                <p className="text-muted-foreground mb-4">
                  Manage your inventory, connect with wholesalers, and reach more customers
                </p>
                <ul className="text-sm text-left space-y-2 text-muted-foreground">
                  <li className="flex items-center gap-2">
                    <Package className="h-4 w-4 text-secondary" />
                    Inventory management
                  </li>
                  <li className="flex items-center gap-2">
                    <Users className="h-4 w-4 text-secondary" />
                    Proxy selling options
                  </li>
                  <li className="flex items-center gap-2">
                    <TrendingUp className="h-4 w-4 text-secondary" />
                    Sales analytics
                  </li>
                </ul>
              </CardContent>
            </Card>

            <Card className="group hover:shadow-strong transition-all duration-300 hover:-translate-y-1 border-2 hover:border-accent/50">
              <CardContent className="p-6 text-center">
                <div className="w-16 h-16 bg-gradient-to-br from-accent to-accent/80 rounded-2xl flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform">
                  <Package className="h-8 w-8 text-white" />
                </div>
                <h3 className="text-xl font-bold mb-3">Wholesalers</h3>
                <p className="text-muted-foreground mb-4">
                  Supply retailers with bulk inventory and manage large-scale distribution
                </p>
                <ul className="text-sm text-left space-y-2 text-muted-foreground">
                  <li className="flex items-center gap-2">
                    <Package className="h-4 w-4 text-accent" />
                    Bulk inventory management
                  </li>
                  <li className="flex items-center gap-2">
                    <Users className="h-4 w-4 text-accent" />
                    Retailer network
                  </li>
                  <li className="flex items-center gap-2">
                    <TrendingUp className="h-4 w-4 text-accent" />
                    Order fulfillment
                  </li>
                </ul>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* Features Section */}
      <div className="container mx-auto px-4 py-16">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold mb-4">Why Choose Live MART?</h2>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            A complete ecosystem designed to streamline the supply chain and promote local commerce
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[{
          icon: MapPin,
          title: "Location-Based",
          desc: "Shop from nearby stores"
        }, {
          icon: Package,
          title: "Smart Inventory",
          desc: "Real-time stock updates"
        }, {
          icon: Users,
          title: "Multi-Role",
          desc: "Three user types in one"
        }, {
          icon: TrendingUp,
          title: "Analytics",
          desc: "Track your business growth"
        }].map((feature, i) => <Card key={i} className="text-center hover:shadow-medium transition-all">
              <CardContent className="p-6">
                <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center mx-auto mb-4">
                  <feature.icon className="h-6 w-6 text-primary" />
                </div>
                <h3 className="font-semibold mb-2">{feature.title}</h3>
                <p className="text-sm text-muted-foreground">{feature.desc}</p>
              </CardContent>
            </Card>)}
        </div>
      </div>

      {/* CTA Section */}
      <div className="container mx-auto px-4 py-16">
        <Card className="bg-gradient-to-br from-primary via-secondary to-primary text-white border-0">
          <CardContent className="p-12 text-center">
            <h2 className="text-3xl font-bold mb-4">Ready to Get Started?</h2>
            <p className="text-white/90 mb-6 text-lg">
              Join thousands of users already benefiting from Live MART
            </p>
            <Link to="/auth">
              <Button size="lg" variant="secondary" className="hover:scale-105 transition-transform">
                Create Your Account
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    </div>;
};
export default Landing;