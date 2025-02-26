import { useState, useEffect, useRef } from "react";
import { useParams } from "react-router-dom";
import MainLayout from "@/components/layout/MainLayout";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { 
  Clock, 
  Users, 
  MapPin, 
  ChefHat, 
  Globe, 
  Heart, 
  Share2, 
  Star, 
  Utensils, 
  MessageCircle,
  Loader2,
  Phone,
  Navigation,
  Info,
  Image as ImageIcon
} from "lucide-react";
import { ImageGallery } from "@/components/ImageGallery";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { 
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import { useLoadScript, GoogleMap, MarkerF } from '@react-google-maps/api';

interface FoodExperience {
  id: number;
  title: string;
  description: string;
  images: { url: string; order: number }[];
  price_per_person: number;
  cuisine_type: string;
  menu_description: string;
  host: {
    name: string;
    image: string;
    rating: number;
    reviews: number;
  };
  details: {
    duration: string;
    groupSize: string;
    includes: string[];
    language: string;
    location: string;
  };
}

interface Review {
  id: number;
  user: {
    name: string;
    image?: string;
  };
  rating: number;
  comment: string;
  date: string;
}

const FoodDetails = () => {
  const { id } = useParams();
  const [experience, setExperience] = useState<FoodExperience | null>(null);
  const [loading, setLoading] = useState(true);
  const [isFavorite, setIsFavorite] = useState(false);
  const [isImageDialogOpen, setIsImageDialogOpen] = useState(false);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const imageContainerRef = useRef<HTMLDivElement>(null);
  
  // Google Maps API loading
  const { isLoaded } = useLoadScript({
    googleMapsApiKey: 'AIzaSyDpB03uqoC8eWmdG8KRlBdiJaHWbXmtMgE',
    libraries: ['places']
  });
  
  // Mock reviews data - in a real app, this would come from the API
  const mockReviews: Review[] = [
    {
      id: 1,
      user: { name: "Sarah Johnson", image: "https://i.pravatar.cc/150?img=1" },
      rating: 5,
      comment: "Amazing food! The flavors were authentic and the host was very welcoming. I learned so much about African cuisine.",
      date: "2023-10-15"
    },
    {
      id: 2,
      user: { name: "Michael Chen" },
      rating: 4,
      comment: "Great food and atmosphere. The host shared interesting stories about the cultural significance of each dish.",
      date: "2023-09-22"
    },
    {
      id: 3,
      user: { name: "Emma Wilson", image: "https://i.pravatar.cc/150?img=5" },
      rating: 5,
      comment: "One of the best authentic meals I've had. The host's home was welcoming and the food was incredible!",
      date: "2023-08-30"
    }
  ];

  // Mock location coordinates - in a real app, this would come from the API
  const locationCoords = {
    lat: 40.7128,
    lng: -74.0060
  };

  const getFullImageUrl = (url: string) => {
    if (!url) return '/default-food.jpg';
    if (url.startsWith('http')) return url;
    return `${import.meta.env.VITE_API_URL}/${url}`;
  };

  useEffect(() => {
    const fetchExperience = async () => {
      try {
        const response = await fetch(`${import.meta.env.VITE_API_URL}/food-experiences/${id}`);
        if (!response.ok) throw new Error('Failed to fetch experience');
        const data = await response.json();
        // Process the images URLs
        const processedData = {
          ...data,
          images: data.images.map((img: { url: string; order?: number }, index: number) => ({
            url: getFullImageUrl(img.url),
            order: img.order ?? index
          })),
          host: {
            ...data.host,
            image: getFullImageUrl(data.host.image)
          }
        };
        setExperience(processedData);
      } catch (error) {
        console.error('Error:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchExperience();
  }, [id]);

  const toggleFavorite = () => {
    setIsFavorite(!isFavorite);
  };

  const openImageDialog = (index: number) => {
    setSelectedImageIndex(index);
    setIsImageDialogOpen(true);
  };

  if (loading) {
    return (
      <MainLayout>
        <div className="container mx-auto px-4 py-16 flex items-center justify-center min-h-[60vh]">
          <div className="text-center">
            <Loader2 className="h-12 w-12 animate-spin mx-auto text-primary" />
            <p className="mt-4 text-lg text-muted-foreground">Loading food details...</p>
          </div>
        </div>
      </MainLayout>
    );
  }

  if (!experience) {
    return (
      <MainLayout>
        <div className="container mx-auto px-4 py-16 text-center">
          <h2 className="text-2xl font-bold mb-4">Food not found</h2>
          <p className="text-muted-foreground mb-8">The food you're looking for doesn't exist or has been removed.</p>
          <Button>Browse Foods</Button>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="container mx-auto px-4 py-8">
        {/* Header Section */}
        <div className="mb-8">
          <div className="flex flex-wrap justify-between items-start gap-4 mb-4">
            <div>
              <h1 className="text-3xl md:text-4xl font-bold mb-2">{experience.title}</h1>
              <div className="flex flex-wrap items-center gap-4 text-muted-foreground">
                <div className="flex items-center gap-1">
                  <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
                  <span className="font-medium">{experience.host.rating}</span>
                  <span>({experience.host.reviews} reviews)</span>
                </div>
                <div className="flex items-center gap-1">
                  <MapPin className="w-4 h-4" />
                  <span>{experience.details.location}</span>
                </div>
                <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20">
                  {experience.cuisine_type}
                </Badge>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button 
                      variant="outline" 
                      size="icon" 
                      onClick={toggleFavorite}
                      className={isFavorite ? "text-red-500" : ""}
                    >
                      <Heart className={`w-5 h-5 ${isFavorite ? "fill-red-500" : ""}`} />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>{isFavorite ? "Remove from favorites" : "Add to favorites"}</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
              
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant="outline" size="icon">
                      <Share2 className="w-5 h-5" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Share this food</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
          </div>
        </div>

        {/* Enhanced Image Gallery - Compact Version */}
        <div className="mb-12">
          {experience.images.length > 0 && (
            <div className="relative" ref={imageContainerRef}>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-2 rounded-xl overflow-hidden max-h-[400px]">
                {/* Main image */}
                <div className="col-span-2 aspect-video relative overflow-hidden rounded-lg">
                  <img
                    src={experience.images[0].url}
                    alt={`${experience.title} - Main Image`}
                    className="w-full h-full object-cover hover:scale-105 transition-transform duration-300"
                    onClick={() => openImageDialog(0)}
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent opacity-0 hover:opacity-100 transition-opacity duration-300 flex items-end justify-start p-4">
                    <Button variant="secondary" size="sm" onClick={() => openImageDialog(0)}>
                      <ImageIcon className="w-4 h-4 mr-2" />
                      View All Photos
                    </Button>
                  </div>
                </div>
                
                {/* Thumbnail grid */}
                <div className="hidden md:grid grid-rows-2 gap-2">
                  {experience.images.slice(1, 3).map((image, index) => (
                    <div key={index} className="relative overflow-hidden rounded-lg">
                      <img
                        src={image.url}
                        alt={`${experience.title} - Image ${index + 2}`}
                        className="w-full h-full object-cover hover:scale-105 transition-transform duration-300"
                        onClick={() => openImageDialog(index + 1)}
                      />
                      {index === 1 && experience.images.length > 3 && (
                        <div 
                          className="absolute inset-0 bg-black/50 flex items-center justify-center cursor-pointer"
                          onClick={() => openImageDialog(0)}
                        >
                          <div className="text-white text-center">
                            <span className="text-xl font-bold">+{experience.images.length - 3}</span>
                            <p className="text-sm">more photos</p>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
              
              {/* Full-screen image dialog */}
              <Dialog open={isImageDialogOpen} onOpenChange={setIsImageDialogOpen}>
                <DialogContent className="max-w-5xl w-full p-0 bg-black/90">
                  <div className="relative h-[80vh]">
                    <ImageGallery 
                      images={experience.images} 
                    />
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="absolute top-2 right-2 text-white bg-black/50 hover:bg-black/70"
                      onClick={() => setIsImageDialogOpen(false)}
                    >
                      ✕
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[2fr_1fr] gap-8">
          {/* Left Column */}
          <div>
            <Tabs defaultValue="about" className="mb-12">
              <TabsList className="mb-6">
                <TabsTrigger value="about">About</TabsTrigger>
                <TabsTrigger value="menu">Menu</TabsTrigger>
                <TabsTrigger value="host">Host</TabsTrigger>
                <TabsTrigger value="reviews">Reviews</TabsTrigger>
                <TabsTrigger value="location">Location</TabsTrigger>
              </TabsList>
              
              <TabsContent value="about" className="space-y-8">
                <Card className="p-6">
                  <h2 className="text-2xl font-semibold mb-4">About this food</h2>
                  <p className="text-muted-foreground whitespace-pre-line leading-relaxed">
                    {experience.description}
                  </p>
                  
                  <div className="flex items-center gap-2 mt-6">
                    <ChefHat className="w-5 h-5 text-primary" />
                    <div>
                      <p className="font-medium">Cuisine Type</p>
                      <p className="text-sm text-muted-foreground">{experience.cuisine_type}</p>
                    </div>
                  </div>
                </Card>
              </TabsContent>
              
              <TabsContent value="menu" className="space-y-8">
                <Card className="p-6">
                  <h2 className="text-2xl font-semibold mb-4">Menu</h2>
                  <p className="text-muted-foreground whitespace-pre-line leading-relaxed">
                    {experience.menu_description}
                  </p>
                  
                  <div className="mt-8 p-4 bg-primary/5 rounded-lg border border-primary/10">
                    <div className="flex items-center gap-2 mb-2">
                      <Info className="w-5 h-5 text-primary" />
                      <p className="font-medium">Price</p>
                    </div>
                    <p className="text-lg font-semibold">${experience.price_per_person} per person</p>
                    <p className="text-sm text-muted-foreground mt-1">Pay directly to the host when you visit</p>
                  </div>
                </Card>
              </TabsContent>
              
              <TabsContent value="host" className="space-y-8">
                <Card className="p-6">
                  <div className="flex items-center gap-4 mb-6">
                    <Avatar className="w-16 h-16">
                      <AvatarImage src={experience.host.image} alt={experience.host.name} />
                      <AvatarFallback>{experience.host.name.charAt(0)}</AvatarFallback>
                    </Avatar>
                    <div>
                      <h3 className="text-xl font-semibold">Hosted by {experience.host.name}</h3>
                      <div className="flex items-center text-sm">
                        <Star className="w-4 h-4 text-yellow-500 fill-yellow-500 mr-1" />
                        <span className="font-medium">{experience.host.rating}</span>
                        <span className="text-muted-foreground ml-1">
                          ({experience.host.reviews} reviews)
                        </span>
                      </div>
                    </div>
                  </div>
                  
                  <p className="text-muted-foreground mb-6">
                    I'm passionate about sharing authentic cuisine from my culture. 
                    I've been cooking traditional dishes for over 15 years and love 
                    meeting people from around the world who appreciate our food traditions.
                  </p>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Button variant="default" className="w-full">
                      <MessageCircle className="w-4 h-4 mr-2" />
                      Message Host
                    </Button>
                    <Button variant="outline" className="w-full">
                      <Phone className="w-4 h-4 mr-2" />
                      Call Host
                    </Button>
                  </div>
                </Card>
              </TabsContent>
              
              <TabsContent value="reviews" className="space-y-8">
                <Card className="p-6">
                  <div className="flex items-center justify-between mb-6">
                    <h2 className="text-2xl font-semibold">Reviews</h2>
                    <div className="flex items-center">
                      <Star className="w-5 h-5 text-yellow-500 fill-yellow-500 mr-1" />
                      <span className="font-medium text-lg">{experience.host.rating}</span>
                      <span className="text-muted-foreground ml-1">
                        ({experience.host.reviews} reviews)
                      </span>
                    </div>
                  </div>
                  
                  <div className="space-y-6">
                    {mockReviews.map((review) => (
                      <div key={review.id} className="pb-6 border-b last:border-0">
                        <div className="flex items-center gap-3 mb-3">
                          <Avatar>
                            <AvatarImage src={review.user.image} alt={review.user.name} />
                            <AvatarFallback>{review.user.name.charAt(0)}</AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="font-medium">{review.user.name}</p>
                            <p className="text-sm text-muted-foreground">
                              {new Date(review.date).toLocaleDateString('en-US', { 
                                year: 'numeric', 
                                month: 'long', 
                                day: 'numeric' 
                              })}
                            </p>
                          </div>
                        </div>
                        <div className="flex mb-2">
                          {[...Array(5)].map((_, i) => (
                            <Star 
                              key={i} 
                              className={`w-4 h-4 ${i < review.rating ? "text-yellow-500 fill-yellow-500" : "text-gray-300"}`} 
                            />
                          ))}
                        </div>
                        <p className="text-muted-foreground">{review.comment}</p>
                      </div>
                    ))}
                  </div>
                </Card>
              </TabsContent>
              
              <TabsContent value="location" className="space-y-8">
                <Card className="p-6">
                  <h2 className="text-2xl font-semibold mb-4">Location</h2>
                  <div className="mb-4">
                    <p className="flex items-center gap-2 mb-2">
                      <MapPin className="w-5 h-5 text-primary" />
                      <span className="font-medium">{experience.details.location}</span>
                    </p>
                    <p className="text-muted-foreground ml-7">
                      Exact address will be provided after you contact the host
                    </p>
                  </div>
                  
                  {/* Google Maps Component */}
                  <div className="rounded-lg overflow-hidden mb-6 h-[300px]">
                    {!isLoaded ? (
                      <div className="w-full h-full bg-gray-100 flex items-center justify-center">
                        <Loader2 className="h-8 w-8 animate-spin text-primary" />
                      </div>
                    ) : (
                      <GoogleMap
                        zoom={14}
                        center={locationCoords}
                        mapContainerClassName="w-full h-full"
                        options={{
                          styles: [
                            {
                              featureType: "poi",
                              elementType: "labels",
                              stylers: [{ visibility: "off" }]
                            }
                          ]
                        }}
                      >
                        <MarkerF
                          position={locationCoords}
                          icon={{
                            url: '/images/food-marker.svg',
                            scaledSize: new google.maps.Size(40, 40)
                          }}
                        />
                      </GoogleMap>
                    )}
                  </div>
                  
                  <div className="flex justify-center mb-4">
                    <Button 
                      variant="outline" 
                      onClick={() => window.open(`https://www.google.com/maps/dir/?api=1&destination=${locationCoords.lat},${locationCoords.lng}`, '_blank')}
                    >
                      <Navigation className="w-4 h-4 mr-2" />
                      Get Directions
                    </Button>
                  </div>
                  
                  <div className="space-y-2">
                    <h3 className="font-medium">Nearby landmarks:</h3>
                    <ul className="list-disc list-inside text-muted-foreground ml-2">
                      <li>Central Park - 0.5 miles</li>
                      <li>Downtown Shopping Center - 1.2 miles</li>
                      <li>City Museum - 1.5 miles</li>
                    </ul>
                  </div>
                </Card>
              </TabsContent>
            </Tabs>
          </div>

          {/* Right Column - Contact Card */}
          <div>
            {/* Main contact card - sticky */}
            <Card className="p-6 sticky top-24 mb-6">
              <div className="flex justify-between items-center mb-6">
                <div>
                  <span className="text-3xl font-bold">
                    ${experience.price_per_person}
                  </span>
                  <span className="text-muted-foreground ml-1">per person</span>
                </div>
              </div>
              
              <Separator className="my-4" />
              
              <div className="space-y-4 mb-6">
                <div className="flex items-center gap-2">
                  <MapPin className="w-5 h-5 text-primary" />
                  <div>
                    <p className="font-medium">Location</p>
                    <p className="text-sm text-muted-foreground">{experience.details.location}</p>
                  </div>
                </div>
                
                <div className="flex items-center gap-2">
                  <ChefHat className="w-5 h-5 text-primary" />
                  <div>
                    <p className="font-medium">Cuisine</p>
                    <p className="text-sm text-muted-foreground">{experience.cuisine_type}</p>
                  </div>
                </div>
                
                <div className="flex items-center gap-2">
                  <Users className="w-5 h-5 text-primary" />
                  <div>
                    <p className="font-medium">Host</p>
                    <p className="text-sm text-muted-foreground">{experience.host.name}</p>
                  </div>
                </div>
              </div>
              
              <Separator className="my-4" />
              
              <div className="grid grid-cols-1 gap-3">
                <Button className="w-full" size="lg">
                  <MessageCircle className="w-4 h-4 mr-2" />
                  Contact Host
                </Button>
                
                <Button variant="outline" className="w-full">
                  <Phone className="w-4 h-4 mr-2" />
                  Call Host
                </Button>
              </div>
              
              <p className="text-center text-sm text-muted-foreground mt-4">
                Contact the host to arrange your visit
              </p>
            </Card>
            
            {/* Host info card - fixed position at bottom of sidebar */}
            <Card className="p-6 bg-white border shadow-md rounded-lg mt-auto">
              <div className="flex items-center gap-4">
                <Avatar className="w-12 h-12">
                  <AvatarImage src={experience.host.image} alt={experience.host.name} />
                  <AvatarFallback>{experience.host.name.charAt(0)}</AvatarFallback>
                </Avatar>
                <div>
                  <h3 className="font-semibold">Hosted by {experience.host.name}</h3>
                  <div className="flex items-center text-sm text-muted-foreground">
                    <Star className="w-4 h-4 text-yellow-500 fill-yellow-500 mr-1" />
                    <span>{experience.host.rating}</span>
                    <span className="ml-1">
                      ({experience.host.reviews} reviews)
                    </span>
                  </div>
                </div>
              </div>
              
              <Button variant="link" className="w-full mt-4 p-0">
                View host profile
              </Button>
            </Card>
          </div>
        </div>
      </div>
    </MainLayout>
  );
};

export default FoodDetails; 