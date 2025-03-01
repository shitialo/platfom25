import { useState } from "react";
import MainLayout from "@/components/layout/MainLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/contexts/AuthContext";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { 
  User, Settings, CreditCard, Bell, Shield, 
  History, Heart, Calendar, Edit, Camera 
} from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";

const Profile = () => {
  const { user } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [profileData, setProfileData] = useState({
    name: user?.name || "",
    email: user?.email || "",
    phone: "+1234567890",
    language: "English",
    currency: "USD",
    timezone: "UTC-5",
  });

  const bookings = [
    {
      id: 1,
      type: "Food Experience",
      title: "jollof rice",
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
  ];

  const favorites = [
    {
      id: 1,
      type: "Food Experience",
      title: "jollof rice",
      price: "$45.50",
      image: "/images/jollof.jpg",
    },
    {
      id: 2,
      type: "Stay",
      title: "mountain view",
      price: "$45.99/night",
      image: "/images/mountain.jpg",

    },
  ];

  return (
    <MainLayout>
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-6xl mx-auto">
          {/* Profile Header */}
          <Card className="mb-8">
            <CardContent className="p-6">
              <div className="flex flex-col md:flex-row items-center gap-6">
                <div className="relative">
                  <Avatar className="w-24 h-24">
                    <AvatarImage src={user?.image || "/images/kenji.jpg"} />
                    <AvatarFallback>{user?.name?.charAt(0)}</AvatarFallback>
                  </Avatar>
                  <Button 

                    size="icon" 
                    variant="secondary" 
                    className="absolute bottom-0 right-0 rounded-full"
                  >
                    <Camera className="w-4 h-4" />
                  </Button>
                </div>
                <div className="flex-1 text-center md:text-left">
                  <h1 className="text-2xl font-bold">{user?.name}</h1>
                  <p className="text-muted-foreground">{user?.email}</p>
                  {user?.is_host && (
                    <div className="mt-2">
                      <span className="bg-primary/10 text-primary px-3 py-1 rounded-full text-sm">
                        Host
                      </span>
                    </div>
                  )}
                </div>
                <Button 
                  variant="outline" 
                  onClick={() => setIsEditing(!isEditing)}
                  className="md:self-start"
                >
                  <Edit className="w-4 h-4 mr-2" />
                  Edit Profile
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Main Content */}
          <Tabs defaultValue="bookings" className="space-y-4">
            <TabsList className="grid grid-cols-4 md:w-[400px]">
              <TabsTrigger value="bookings">Bookings</TabsTrigger>
              <TabsTrigger value="favorites">Favorites</TabsTrigger>
              <TabsTrigger value="settings">Settings</TabsTrigger>
              <TabsTrigger value="security">Security</TabsTrigger>
            </TabsList>

            <TabsContent value="bookings" className="space-y-4">
              <h2 className="text-xl font-semibold mb-4">Your Bookings</h2>
              <div className="grid gap-4">
                {bookings.map((booking) => (
                  <Card key={booking.id}>
                    <CardContent className="p-4">
                      <div className="flex gap-4">
                        <img
                          src={booking.image}
                          alt={booking.title}
                          className="w-24 h-24 object-cover rounded-lg"
                        />
                        <div className="flex-1">
                          <div className="flex justify-between items-start">
                            <div>
                              <p className="text-sm text-muted-foreground">
                                {booking.type}
                              </p>
                              <h3 className="font-semibold">{booking.title}</h3>
                              <p className="text-sm">
                                <Calendar className="w-4 h-4 inline mr-1" />
                                {booking.date}
                              </p>
                            </div>
                            <span className="text-sm font-medium text-primary">
                              {booking.status}
                            </span>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </TabsContent>

            <TabsContent value="favorites" className="space-y-4">
              <h2 className="text-xl font-semibold mb-4">Your Favorites</h2>
              <div className="grid md:grid-cols-2 gap-4">
                {favorites.map((item) => (
                  <Card key={item.id}>
                    <CardContent className="p-4">
                      <div className="flex gap-4">
                        <img
                          src={item.image}
                          alt={item.title}
                          className="w-24 h-24 object-cover rounded-lg"
                        />
                        <div className="flex-1">
                          <p className="text-sm text-muted-foreground">
                            {item.type}
                          </p>
                          <h3 className="font-semibold">{item.title}</h3>
                          <p className="text-sm font-medium">{item.price}</p>
                        </div>
                        <Button size="icon" variant="ghost">
                          <Heart className="w-4 h-4 text-red-500" fill="currentColor" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </TabsContent>

            <TabsContent value="settings" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Profile Settings</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Full Name</Label>
                      <Input 
                        value={profileData.name}
                        onChange={(e) => setProfileData({...profileData, name: e.target.value})}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Email</Label>
                      <Input 
                        value={profileData.email}
                        onChange={(e) => setProfileData({...profileData, email: e.target.value})}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Phone</Label>
                      <Input 
                        value={profileData.phone}
                        onChange={(e) => setProfileData({...profileData, phone: e.target.value})}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Language</Label>
                      <Input 
                        value={profileData.language}
                        onChange={(e) => setProfileData({...profileData, language: e.target.value})}
                      />
                    </div>
                  </div>

                  <Separator className="my-6" />

                  <div className="space-y-4">
                    <h3 className="font-semibold">Preferences</h3>
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label>Email Notifications</Label>
                        <p className="text-sm text-muted-foreground">
                          Receive email about your bookings and account
                        </p>
                      </div>
                      <Switch />
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label>Marketing Communications</Label>
                        <p className="text-sm text-muted-foreground">
                          Receive updates about new experiences and offers
                        </p>
                      </div>
                      <Switch />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="security" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Security Settings</CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="space-y-4">
                    <h3 className="font-semibold">Password</h3>
                    <Button variant="outline">Change Password</Button>
                  </div>

                  <Separator />

                  <div className="space-y-4">
                    <h3 className="font-semibold">Two-Factor Authentication</h3>
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label>Enable 2FA</Label>
                        <p className="text-sm text-muted-foreground">
                          Add an extra layer of security to your account
                        </p>
                      </div>
                      <Switch />
                    </div>
                  </div>

                  <Separator />

                  <div className="space-y-4">
                    <h3 className="font-semibold">Connected Accounts</h3>
                    <div className="space-y-2">
                      <Button variant="outline" className="w-full justify-start">
                        <img src="/images/google.svg" alt="Google" className="w-4 h-4 mr-2" />
                        Connect Google Account
                      </Button>
                      <Button variant="outline" className="w-full justify-start">

                        <img src="/images/facebook.svg" alt="Facebook" className="w-4 h-4 mr-2" />
                        Connect Facebook Account
                      </Button>
                    </div>

                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </MainLayout>
  );
};

export default Profile; 