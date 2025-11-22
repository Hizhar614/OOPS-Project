import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { MapPin, Settings, AlertCircle } from "lucide-react";
import LocationPicker from "./LocationPicker";

interface ProfileSettingsProps {
  profile: {
    id: string;
    full_name: string;
    business_name?: string;
    location_lat?: number;
    location_lng?: number;
    location_address?: string;
    phone?: string;
  };
  userRole: string;
  onProfileUpdate: () => void;
}

const ProfileSettings = ({ profile, userRole, onProfileUpdate }: ProfileSettingsProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [fullName, setFullName] = useState(profile.full_name || "");
  const [businessName, setBusinessName] = useState(profile.business_name || "");
  // Remove +91 prefix if present when loading
  const [phone, setPhone] = useState(profile.phone ? profile.phone.replace(/^\+91/, '') : "");
  const [phoneError, setPhoneError] = useState("");
  const [locationLat, setLocationLat] = useState(profile.location_lat || null);
  const [locationLng, setLocationLng] = useState(profile.location_lng || null);
  const [locationAddress, setLocationAddress] = useState(profile.location_address || "");
  const [showLocationPicker, setShowLocationPicker] = useState(false);

  // Check if profile is incomplete
  const isProfileIncomplete = !profile.location_lat || !profile.location_lng || !profile.phone;

  const validatePhone = (value: string) => {
    // Remove any non-digit characters
    const digitsOnly = value.replace(/\D/g, '');
    
    if (digitsOnly.length === 0) {
      setPhoneError("");
      return true;
    }
    
    if (digitsOnly.length !== 10) {
      setPhoneError("Phone number must be exactly 10 digits");
      return false;
    }
    
    setPhoneError("");
    return true;
  };

  const handlePhoneChange = (value: string) => {
    // Only allow digits
    const digitsOnly = value.replace(/\D/g, '');
    
    // Limit to 10 digits
    if (digitsOnly.length <= 10) {
      setPhone(digitsOnly);
      validatePhone(digitsOnly);
    }
  };

  const handleSave = async () => {
    // Validate phone before saving
    if (phone && !validatePhone(phone)) {
      toast.error("Please enter a valid 10-digit phone number");
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase
        .from("profiles")
        .update({
          full_name: fullName,
          business_name: businessName || null,
          phone: phone ? `+91${phone}` : null,
          location_lat: locationLat,
          location_lng: locationLng,
          location_address: locationAddress,
        })
        .eq("id", profile.id);

      if (error) throw error;

      toast.success("Profile updated successfully!");
      setIsOpen(false);
      onProfileUpdate();
    } catch (error: any) {
      console.error("Error updating profile:", error);
      toast.error("Failed to update profile");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="relative">
          <Settings className="h-4 w-4 mr-2" />
          Profile Settings
          {isProfileIncomplete && (
            <span className="absolute -top-1 -right-1 flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-destructive opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-destructive"></span>
            </span>
          )}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Profile Settings</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          {isProfileIncomplete && (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                {userRole === 'customer'
                  ? 'Please complete your profile by updating your delivery address and mobile number.'
                  : 'Please complete your profile by updating your store location and mobile number for better connectivity with customers.'}
              </AlertDescription>
            </Alert>
          )}
          <div className="space-y-2">
            <Label htmlFor="fullName">Full Name</Label>
            <Input
              id="fullName"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
            />
          </div>

          {userRole !== 'customer' && (
            <div className="space-y-2">
              <Label htmlFor="businessName">Business Name</Label>
              <Input
                id="businessName"
                value={businessName}
                onChange={(e) => setBusinessName(e.target.value)}
              />
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="phone">Phone</Label>
            <div className="flex gap-2">
              <div className="flex items-center px-3 py-2 border rounded-md bg-muted text-muted-foreground">
                +91
              </div>
              <div className="flex-1 space-y-1">
                <Input
                  id="phone"
                  value={phone}
                  onChange={(e) => handlePhoneChange(e.target.value)}
                  placeholder="9876543210"
                  maxLength={10}
                  type="tel"
                />
                {phoneError && (
                  <p className="text-xs text-destructive">{phoneError}</p>
                )}
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <Label>{userRole === 'customer' ? 'Your Delivery Address' : 'Location'}</Label>
            {locationLat && locationLng ? (
              <div className="p-3 border rounded-lg bg-muted/50">
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <p className="text-sm font-medium flex items-center gap-2">
                      <MapPin className="h-4 w-4" />
                      {locationAddress || "Location set"}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {locationLat.toFixed(6)}, {locationLng.toFixed(6)}
                    </p>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowLocationPicker(!showLocationPicker)}
                  >
                    Change
                  </Button>
                </div>
              </div>
            ) : (
              <Button
                variant="outline"
                className="w-full"
                onClick={() => setShowLocationPicker(!showLocationPicker)}
              >
                <MapPin className="h-4 w-4 mr-2" />
                Set Location
              </Button>
            )}
          </div>

          {showLocationPicker && (
            <LocationPicker
              initialLat={locationLat || 40.7128}
              initialLng={locationLng || -74.006}
              initialAddress={locationAddress}
              onLocationSelect={(lat, lng, address) => {
                setLocationLat(lat);
                setLocationLng(lng);
                setLocationAddress(address);
                setShowLocationPicker(false);
              }}
            />
          )}

          <div className="flex gap-2 pt-4">
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => setIsOpen(false)}
            >
              Cancel
            </Button>
            <Button
              className="flex-1"
              onClick={handleSave}
              disabled={loading}
            >
              {loading ? "Saving..." : "Save Changes"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ProfileSettings;
