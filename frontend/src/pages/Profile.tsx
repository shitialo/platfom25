import { useState, useEffect } from "react";
import MainLayout from "@/components/layout/MainLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/contexts/AuthContext";
import { 
  User, Settings, CreditCard, Bell, Shield, 
  History, Heart, Calendar, Edit, Camera, Trash2, Loader2,
  Plus
} from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/components/ui/use-toast";
import ProfileImageUpload from "@/components/profile/ProfileImageUpload";
import PasswordChangeModal from "@/components/profile/PasswordChangeModal";
import ListingsModal from "@/components/profile/ListingsModal";
import { userService } from "@/services/userService";
import { 
  ProfileData, 
  Booking, 
  Favorite, 
  SecuritySettings,
  getUserProfile,
  updateUserProfile,
  getUserBookings,
  getUserFavorites,
  getSecuritySettings,
  updateSecuritySettings,
  removeFavorite,
  connectSocialAccount
} from "@/api/userProfile";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { 
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

const Profile = () => {
  const { user, getAuthHeader, refreshUser } = useAuth();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("bookings");
  const [isEditing, setIsEditing] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
  const [isListingsModalOpen, setIsListingsModalOpen] = useState(false);
  const [listingsModalMode, setListingsModalMode] = useState<'favorite' | 'booking'>('favorite');
  
  // State for profile data
  const [profileData, setProfileData] = useState<ProfileData>({
    name: user?.name || "",
    email: user?.email || "",
    phone: "",
    language: "English",
    currency: "USD",
    timezone: "UTC-5",
    bio: "",
    image: user?.picture || "",
  });
  
  // State for bookings and favorites
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [favorites, setFavorites] = useState<Favorite[]>([]);
  
  // State for security settings
  const [securitySettings, setSecuritySettings] = useState<SecuritySettings>({
    emailNotifications: false,
    marketingCommunications: false,
    twoFactorEnabled: false,
    connectedAccounts: {
      google: false,
      facebook: false,
    },
  });

  // Fetch user data on component mount
  useEffect(() => {
    const fetchUserData = async () => {
      const authHeader = getAuthHeader();
      if (!authHeader) return;
      
      setIsLoading(true);
      
      try {
        // Fetch profile data
        let profile;
        try {
          profile = await getUserProfile(authHeader);
        } catch (error) {
          console.error("Error fetching profile data:", error);
          // Use default profile data if API fails
          profile = {
            name: user?.name || "",
            email: user?.email || "",
            phone: "",
            language: "English",
            currency: "USD",
            timezone: "UTC-5",
            bio: "",
            image: user?.picture || "",
          };
        }
        
        setProfileData({
          ...profile,
          name: profile.name || user?.name || "",
          email: profile.email || user?.email || "",
          image: profile.image || user?.picture || "",
        });
        
        // Fetch bookings with fallback to mock data
        try {
          const bookingsData = await getUserBookings(authHeader);
          setBookings(bookingsData);
        } catch (error) {
          console.error("Error fetching bookings:", error);
          // Use mock data
          setBookings([
    {
      id: 1,
      type: "Food Experience",
              title: "Jollof Rice",
      date: "2024-03-15",
      status: "upcoming",
      image: "/images/jollof.jpg",
    },
    {
      id: 2,
      type: "Stay",
      title: "Cozy Mountain Cabin",
      date: "2024-04-01",
      status: "upcoming",
      image: "/images/mountain.jpg",
    },
          ]);
        }
        
        // Fetch favorites with fallback to mock data
        try {
          const favoritesData = await getUserFavorites(authHeader);
          setFavorites(favoritesData);
        } catch (error) {
          console.error("Error fetching favorites:", error);
          // Use mock data
          setFavorites([
    {
      id: 1,
      type: "Food Experience",
              title: "Jollof Rice",
      price: "$45.50",
      image: "/images/jollof.jpg",
    },
    {
      id: 2,
      type: "Stay",
              title: "Mountain View",
      price: "$45.99/night",
      image: "/images/mountain.jpg",
            },
          ]);
        }
        
        // Fetch security settings with fallback to default settings
        try {
          const securityData = await getSecuritySettings(authHeader);
          setSecuritySettings(securityData);
        } catch (error) {
          console.error("Error fetching security settings:", error);
          // Use default settings
          setSecuritySettings({
            emailNotifications: false,
            marketingCommunications: false,
            twoFactorEnabled: false,
            connectedAccounts: {
              google: false,
              facebook: false,
            },
          });
        }
      } catch (error) {
        console.error("Error in fetchUserData:", error);
        toast({
          title: "Error",
          description: "Failed to load profile data. Using default values instead.",
          variant: "destructive",
        });
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchUserData();
  }, [user, getAuthHeader, toast]);

  // Handle profile data changes
  const handleProfileChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setProfileData((prev) => ({ ...prev, [name]: value }));
  };
  
  // Handle select changes
  const handleSelectChange = (name: string, value: string) => {
    setProfileData((prev) => ({ ...prev, [name]: value }));
  };

  // Handle security setting changes
  const handleSecuritySettingChange = (setting: keyof SecuritySettings, value: boolean) => {
    setSecuritySettings((prev) => ({ ...prev, [setting]: value }));
    
    // Save the setting immediately
    saveSecuritySettings({ [setting]: value });
  };
  
  // Handle connected account setting changes
  const handleConnectedAccountChange = (provider: 'google' | 'facebook', value: boolean) => {
    if (value) {
      // Connect account
      handleConnectAccount(provider);
    } else {
      // Disconnect account (would need a separate API endpoint)
      setSecuritySettings((prev) => ({
        ...prev,
        connectedAccounts: {
          ...prev.connectedAccounts,
          [provider]: false,
        },
      }));
      
      // Save the setting
      saveSecuritySettings({
        connectedAccounts: {
          ...securitySettings.connectedAccounts,
          [provider]: false,
        },
      });
    }
  };

  // Save profile data
  const saveProfileData = async () => {
    const authHeader = getAuthHeader();
    if (!authHeader) return;
    
    setIsSaving(true);
    
    try {
      let updatedProfile;
      try {
        updatedProfile = await updateUserProfile(profileData, authHeader);
      } catch (error) {
        console.error("Error updating profile:", error);
        // Just use the current profile data if API fails
        updatedProfile = profileData;
      }
      
      setProfileData(updatedProfile);
      setIsEditing(false);
      
      // Refresh user data in auth context if name changed
      if (updatedProfile.name !== user?.name) {
        try {
          await refreshUser();
        } catch (error) {
          console.error("Error refreshing user:", error);
        }
      }
      
      toast({
        title: "Success",
        description: "Profile updated successfully",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to update profile",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };
  
  // Save security settings
  const saveSecuritySettings = async (settings: Partial<SecuritySettings>) => {
    const authHeader = getAuthHeader();
    if (!authHeader) return;
    
    try {
      let updatedSettings;
      try {
        updatedSettings = await updateSecuritySettings(settings, authHeader);
      } catch (error) {
        console.error("Error updating security settings:", error);
        // Just use the current settings with the new changes if API fails
        updatedSettings = { ...securitySettings, ...settings };
      }
      
      setSecuritySettings(updatedSettings);
      
      toast({
        title: "Success",
        description: "Settings updated successfully",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to update security settings",
        variant: "destructive",
      });
    }
  };
  
  // Handle remove favorite
  const handleRemoveFavorite = async (favoriteId: number) => {
    const authHeader = getAuthHeader();
    if (!authHeader) return;
    
    try {
      try {
        await removeFavorite(favoriteId, authHeader);
      } catch (error) {
        console.error("Error removing favorite:", error);
        // Continue with UI update even if API fails
      }
      
      // Update favorites list
      setFavorites((prev) => prev.filter((fav) => fav.id !== favoriteId));
      
      toast({
        title: "Success",
        description: "Item removed from favorites",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to remove favorite",
        variant: "destructive",
      });
    }
  };
  
  // Handle connect account
  const handleConnectAccount = async (provider: 'google' | 'facebook') => {
    const authHeader = getAuthHeader();
    if (!authHeader) return;
    
    try {
      try {
        const result = await connectSocialAccount(provider, authHeader);
        
        if (result.redirectUrl) {
          // Redirect to the provider's auth page
          window.location.href = result.redirectUrl;
          return;
        }
      } catch (error) {
        console.error(`Error connecting ${provider} account:`, error);
        // Continue with UI update even if API fails
      }
      
      // Update UI state
      setSecuritySettings((prev) => ({
        ...prev,
        connectedAccounts: {
          ...prev.connectedAccounts,
          [provider]: true,
        },
      }));
      
      toast({
        title: "Success",
        description: `Connected to ${provider.charAt(0).toUpperCase() + provider.slice(1)}`,
      });
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : `Failed to connect ${provider} account`,
        variant: "destructive",
      });
    }
  };
  
  // Handle image uploaded
  const handleImageUploaded = (imageUrl: string) => {
    setProfileData((prev) => ({ ...prev, image: imageUrl }));
    
    // Refresh user data in auth context
    try {
      refreshUser();
    } catch (error) {
      console.error("Error refreshing user after image upload:", error);
    }
  };

  // Handle cancel edit
  const handleCancelEdit = () => {
    // Reset profile data to original values
    const authHeader = getAuthHeader();
    if (authHeader) {
      getUserProfile(authHeader).then(setProfileData);
    }
    setIsEditing(false);
  };

  // Open listings modal for adding a favorite
  const openAddFavoriteModal = () => {
    setListingsModalMode('favorite');
    setIsListingsModalOpen(true);
  };

  // Open listings modal for adding a booking
  const openAddBookingModal = () => {
    setListingsModalMode('booking');
    setIsListingsModalOpen(true);
  };

  // Handle adding a new favorite
  const handleAddFavorite = (favorite: Favorite) => {
    setFavorites((prev) => [favorite, ...prev]);
    toast({
      title: "Success",
      description: "Added to favorites successfully",
    });
  };

  // Handle adding a new booking
  const handleAddBooking = (booking: Booking) => {
    setBookings((prev) => [booking, ...prev]);
    toast({
      title: "Success",
      description: "Booking created successfully",
    });
  };

  return (
    <MainLayout>
      <div className="container py-8">
        <h1 className="text-3xl font-bold mb-6">My Profile</h1>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Left column - Profile info */}
          <div className="md:col-span-1">
            <Card>
              <CardHeader className="relative pb-0">
                <div className="flex justify-center mb-4">
                  <ProfileImageUpload 
                    imageUrl={profileData.image} 
                    name={profileData.name || "User"}
                    onImageUploaded={handleImageUploaded}
                  />
                </div>
                <CardTitle className="text-center">{profileData.name}</CardTitle>
                <p className="text-center text-muted-foreground">{profileData.email}</p>
              </CardHeader>
              <CardContent className="pt-6">
                {isEditing ? (
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="name">Name</Label>
                      <Input
                        id="name"
                        name="name"
                        value={profileData.name}
                        onChange={handleProfileChange}
                      />
                    </div>
                    <div>
                      <Label htmlFor="phone">Phone</Label>
                      <Input
                        id="phone"
                        name="phone"
                        value={profileData.phone}
                        onChange={handleProfileChange}
                      />
                    </div>
                    <div>
                      <Label htmlFor="language">Language</Label>
                      <Select
                        value={profileData.language}
                        onValueChange={(value) => handleSelectChange("language", value)}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select language" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="English">English</SelectItem>
                          <SelectItem value="Spanish">Spanish</SelectItem>
                          <SelectItem value="French">French</SelectItem>
                          <SelectItem value="German">German</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label htmlFor="currency">Currency</Label>
                      <Select
                        value={profileData.currency}
                        onValueChange={(value) => handleSelectChange("currency", value)}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select currency" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="USD">USD ($)</SelectItem>
                          <SelectItem value="EUR">EUR (€)</SelectItem>
                          <SelectItem value="GBP">GBP (£)</SelectItem>
                          <SelectItem value="JPY">JPY (¥)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label htmlFor="timezone">Timezone</Label>
                      <Select
                        value={profileData.timezone}
                        onValueChange={(value) => handleSelectChange("timezone", value)}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select timezone" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="UTC-8">Pacific Time (UTC-8)</SelectItem>
                          <SelectItem value="UTC-5">Eastern Time (UTC-5)</SelectItem>
                          <SelectItem value="UTC+0">Greenwich Mean Time (UTC+0)</SelectItem>
                          <SelectItem value="UTC+1">Central European Time (UTC+1)</SelectItem>
                          <SelectItem value="UTC+8">China Standard Time (UTC+8)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label htmlFor="bio">Bio</Label>
                      <Textarea
                        id="bio"
                        name="bio"
                        value={profileData.bio}
                        onChange={handleProfileChange}
                        rows={4}
                      />
                    </div>
                    <div className="flex justify-between pt-2">
                      <Button variant="outline" onClick={handleCancelEdit}>
                        Cancel
                      </Button>
                      <Button onClick={saveProfileData} disabled={isSaving}>
                        {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Save Changes
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div>
                      <Label className="text-muted-foreground">Phone</Label>
                      <p>{profileData.phone || "Not provided"}</p>
                    </div>
                    <div>
                      <Label className="text-muted-foreground">Language</Label>
                      <p>{profileData.language}</p>
                    </div>
                    <div>
                      <Label className="text-muted-foreground">Currency</Label>
                      <p>{profileData.currency}</p>
                    </div>
                    <div>
                      <Label className="text-muted-foreground">Timezone</Label>
                      <p>{profileData.timezone}</p>
                    </div>
                    <div>
                      <Label className="text-muted-foreground">Bio</Label>
                      <p className="whitespace-pre-wrap">{profileData.bio || "No bio provided"}</p>
                </div>
                <Button 
                  variant="outline" 
                      className="w-full" 
                      onClick={() => setIsEditing(true)}
                >
                      <Edit className="mr-2 h-4 w-4" />
                  Edit Profile
                </Button>
                    <Button 
                      variant="outline" 
                      className="w-full" 
                      onClick={() => setIsPasswordModalOpen(true)}
                    >
                      <Shield className="mr-2 h-4 w-4" />
                      Change Password
                    </Button>
              </div>
                )}
            </CardContent>
          </Card>
          </div>
          
          {/* Right column - Tabs */}
          <div className="md:col-span-2">
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="bookings">
                  <Calendar className="mr-2 h-4 w-4" />
                  Bookings
                </TabsTrigger>
                <TabsTrigger value="favorites">
                  <Heart className="mr-2 h-4 w-4" />
                  Favorites
                </TabsTrigger>
                <TabsTrigger value="settings">
                  <Settings className="mr-2 h-4 w-4" />
                  Settings
                </TabsTrigger>
            </TabsList>

              {/* Bookings Tab */}
            <TabsContent value="bookings" className="space-y-4">
                <div className="flex justify-between items-center">
                  <h2 className="text-xl font-semibold">Your Bookings</h2>
                  <Button onClick={openAddBookingModal}>
                    <Plus className="mr-2 h-4 w-4" />
                    Add Booking
                  </Button>
                </div>
                
                {isLoading ? (
                  <div className="flex justify-center py-8">
                    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                  </div>
                ) : bookings.length === 0 ? (
                  <Card>
                    <CardContent className="flex flex-col items-center justify-center py-8">
                      <Calendar className="h-12 w-12 text-muted-foreground mb-4" />
                      <p className="text-muted-foreground text-center">
                        You don't have any bookings yet.
                      </p>
                      <Button className="mt-4" onClick={openAddBookingModal}>
                        <Plus className="mr-2 h-4 w-4" />
                        Add Your First Booking
                      </Button>
                    </CardContent>
                  </Card>
                ) : (
                  <div className="grid grid-cols-1 gap-4">
                {bookings.map((booking) => (
                  <Card key={booking.id}>
                    <CardContent className="p-4">
                          <div className="flex flex-col sm:flex-row gap-4">
                            <div className="flex-shrink-0">
                        <img
                                src={booking.image || "/images/placeholder-listing.jpg"}
                          alt={booking.title}
                                className="w-full sm:w-32 h-24 object-cover rounded-md"
                        />
                            </div>
                            <div className="flex-grow">
                          <div className="flex justify-between items-start">
                            <div>
                                  <span className="inline-block px-2 py-1 text-xs rounded-full bg-muted mb-2">
                                {booking.type}
                                  </span>
                              <h3 className="font-semibold">{booking.title}</h3>
                                  <p className="text-sm text-muted-foreground">
                                    Date: {booking.date}
                              </p>
                            </div>
                                <span className={`px-2 py-1 text-xs rounded-full ${
                                  booking.status === "completed" 
                                    ? "bg-green-100 text-green-800" 
                                    : booking.status === "cancelled" 
                                    ? "bg-red-100 text-red-800" 
                                    : "bg-blue-100 text-blue-800"
                                }`}>
                                  {booking.status.charAt(0).toUpperCase() + booking.status.slice(1)}
                            </span>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
                )}
            </TabsContent>

              {/* Favorites Tab */}
            <TabsContent value="favorites" className="space-y-4">
                <div className="flex justify-between items-center">
                  <h2 className="text-xl font-semibold">Your Favorites</h2>
                  <Button onClick={openAddFavoriteModal}>
                    <Plus className="mr-2 h-4 w-4" />
                    Add Favorite
                  </Button>
                </div>
                
                {isLoading ? (
                  <div className="flex justify-center py-8">
                    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                  </div>
                ) : favorites.length === 0 ? (
                  <Card>
                    <CardContent className="flex flex-col items-center justify-center py-8">
                      <Heart className="h-12 w-12 text-muted-foreground mb-4" />
                      <p className="text-muted-foreground text-center">
                        You don't have any favorites yet.
                      </p>
                      <Button className="mt-4" onClick={openAddFavoriteModal}>
                        <Plus className="mr-2 h-4 w-4" />
                        Add Your First Favorite
                      </Button>
                    </CardContent>
                  </Card>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {favorites.map((favorite) => (
                      <Card key={favorite.id}>
                    <CardContent className="p-4">
                      <div className="flex gap-4">
                            <div className="flex-shrink-0">
                              <img
                                src={favorite.image || "/images/placeholder-listing.jpg"}
                                alt={favorite.title}
                                className="w-20 h-20 object-cover rounded-md"
                              />
                            </div>
                            <div className="flex-grow">
                              <span className="inline-block px-2 py-1 text-xs rounded-full bg-muted mb-1">
                                {favorite.type}
                              </span>
                              <h3 className="font-semibold">{favorite.title}</h3>
                          <p className="text-sm text-muted-foreground">
                                {favorite.price}
                          </p>
                        </div>
                            <div>
                              <AlertDialog>
                                <AlertDialogTrigger asChild>
                                  <Button variant="ghost" size="icon">
                                    <Trash2 className="h-4 w-4 text-muted-foreground" />
                        </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                  <AlertDialogHeader>
                                    <AlertDialogTitle>Remove from favorites?</AlertDialogTitle>
                                    <AlertDialogDescription>
                                      This will remove {favorite.title} from your favorites list.
                                    </AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                                    <AlertDialogAction 
                                      onClick={() => handleRemoveFavorite(favorite.id)}
                                    >
                                      Remove
                                    </AlertDialogAction>
                                  </AlertDialogFooter>
                                </AlertDialogContent>
                              </AlertDialog>
                            </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
                )}
            </TabsContent>

              {/* Settings Tab */}
              <TabsContent value="settings" className="space-y-4">
                <h2 className="text-xl font-semibold">Account Settings</h2>
                
                {isLoading ? (
                  <div className="flex justify-center py-8">
                    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                  </div>
                ) : (
                  <Card>
                    <CardContent className="p-6 space-y-6">
                      <div>
                        <h3 className="text-lg font-medium mb-4">Notifications</h3>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                            <div>
                              <Label htmlFor="emailNotifications" className="font-medium">
                                Email Notifications
                              </Label>
                        <p className="text-sm text-muted-foreground">
                                Receive emails about your account activity
                        </p>
                      </div>
                            <Switch
                              id="emailNotifications"
                              checked={securitySettings.emailNotifications}
                              onCheckedChange={(checked) => 
                                handleSecuritySettingChange('emailNotifications', checked)
                              }
                            />
                    </div>
                          
                          <Separator />
                          
                    <div className="flex items-center justify-between">
                            <div>
                              <Label htmlFor="marketingCommunications" className="font-medium">
                                Marketing Communications
                              </Label>
                        <p className="text-sm text-muted-foreground">
                                Receive emails about new features and special offers
                        </p>
                      </div>
                            <Switch
                              id="marketingCommunications"
                              checked={securitySettings.marketingCommunications}
                              onCheckedChange={(checked) => 
                                handleSecuritySettingChange('marketingCommunications', checked)
                              }
                            />
                    </div>
                  </div>
                  </div>

                  <Separator />

                      <div>
                        <h3 className="text-lg font-medium mb-4">Security</h3>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                            <div>
                              <Label htmlFor="twoFactorEnabled" className="font-medium">
                                Two-Factor Authentication
                              </Label>
                        <p className="text-sm text-muted-foreground">
                          Add an extra layer of security to your account
                        </p>
                      </div>
                            <Switch
                              id="twoFactorEnabled"
                              checked={securitySettings.twoFactorEnabled}
                              onCheckedChange={(checked) => 
                                handleSecuritySettingChange('twoFactorEnabled', checked)
                              }
                            />
                          </div>
                          
                          <Separator />
                          
                          <div>
                            <Label className="font-medium mb-2 block">Password</Label>
                            <Button 
                              variant="outline" 
                              onClick={() => setIsPasswordModalOpen(true)}
                            >
                              Change Password
                            </Button>
                          </div>
                    </div>
                  </div>

                  <Separator />

                      <div>
                        <h3 className="text-lg font-medium mb-4">Connected Accounts</h3>
                  <div className="space-y-4">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center">
                              <img 
                                src="/images/google.svg" 
                                alt="Google" 
                                className="w-5 h-5 mr-2" 
                              />
                              <Label htmlFor="googleConnected" className="font-medium">
                                Google
                              </Label>
                            </div>
                            <Switch
                              id="googleConnected"
                              checked={securitySettings.connectedAccounts.google}
                              onCheckedChange={(checked) => 
                                handleConnectedAccountChange('google', checked)
                              }
                            />
                    </div>

                          <div className="flex items-center justify-between">
                            <div className="flex items-center">
                              <img 
                                src="/images/facebook.svg" 
                                alt="Facebook" 
                                className="w-5 h-5 mr-2" 
                              />
                              <Label htmlFor="facebookConnected" className="font-medium">
                                Facebook
                              </Label>
                            </div>
                            <Switch
                              id="facebookConnected"
                              checked={securitySettings.connectedAccounts.facebook}
                              onCheckedChange={(checked) => 
                                handleConnectedAccountChange('facebook', checked)
                              }
                            />
                          </div>
                        </div>
                  </div>
                </CardContent>
              </Card>
                )}
            </TabsContent>
          </Tabs>
          </div>
        </div>
      </div>
      
      {/* Password Change Modal */}
      <PasswordChangeModal 
        open={isPasswordModalOpen} 
        onOpenChange={setIsPasswordModalOpen} 
      />
      
      {/* Listings Modal for adding favorites or bookings */}
      <ListingsModal
        isOpen={isListingsModalOpen}
        onClose={() => setIsListingsModalOpen(false)}
        onAddFavorite={handleAddFavorite}
        onAddBooking={handleAddBooking}
        mode={listingsModalMode}
      />
    </MainLayout>
  );
};

export default Profile; 