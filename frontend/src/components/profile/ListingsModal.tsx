import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/use-toast";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { Loader2, Search } from "lucide-react";
import { Booking, Favorite } from "@/api/userProfile";

export interface ListingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddFavorite: (favorite: Favorite) => void;
  onAddBooking: (booking: Booking) => void;
  mode: 'favorite' | 'booking';
}

const ListingsModal = ({ 
  isOpen, 
  onClose, 
  onAddFavorite, 
  onAddBooking, 
  mode 
}: ListingsModalProps) => {
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'stays' | 'food' | 'experiences'>('stays');
  
  // Mock data for listings
  const [listings, setListings] = useState<Array<{
    id: number;
    type: string;
    title: string;
    price: string;
    image: string;
    date?: string;
  }>>([
    {
      id: 1,
      type: "Stay",
      title: "Luxury Beach House",
      price: "$199/night",
      image: "/images/beach-house.jpg",
    },
    {
      id: 2,
      type: "Stay",
      title: "Mountain Cabin",
      price: "$149/night",
      image: "/images/mountain.jpg",
    },
    {
      id: 3,
      type: "Food Experience",
      title: "Authentic Jollof Rice",
      price: "$45",
      image: "/images/jollof.jpg",
    },
    {
      id: 4,
      type: "Food Experience",
      title: "Sushi Making Class",
      price: "$65",
      image: "/images/sushi.jpg",
    },
    {
      id: 5,
      type: "Experience",
      title: "Safari Adventure",
      price: "$120",
      image: "/images/safari.jpg",
    },
    {
      id: 6,
      type: "Experience",
      title: "City Tour",
      price: "$35",
      image: "/images/city-tour.jpg",
    },
  ]);

  // Filter listings based on search term and active tab
  const filteredListings = listings.filter(listing => {
    const matchesSearch = listing.title.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesTab = 
      (activeTab === 'stays' && listing.type === 'Stay') ||
      (activeTab === 'food' && listing.type === 'Food Experience') ||
      (activeTab === 'experiences' && listing.type === 'Experience');
    
    return matchesSearch && matchesTab;
  });

  // Handle search input change
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
  };

  // Handle adding a favorite
  const handleAddFavorite = (listing: any) => {
    const favorite: Favorite = {
      id: listing.id,
      type: listing.type,
      title: listing.title,
      price: listing.price,
      image: listing.image,
    };
    
    onAddFavorite(favorite);
    onClose();
    
    toast({
      title: "Added to favorites",
      description: `${listing.title} has been added to your favorites`,
    });
  };

  // Handle adding a booking
  const handleAddBooking = (listing: any) => {
    // Get current date in YYYY-MM-DD format
    const today = new Date();
    const formattedDate = today.toISOString().split('T')[0];
    
    const booking: Booking = {
      id: listing.id,
      type: listing.type,
      title: listing.title,
      date: formattedDate,
      status: "upcoming",
      image: listing.image,
    };
    
    onAddBooking(booking);
    onClose();
    
    toast({
      title: "Booking created",
      description: `Your booking for ${listing.title} has been created`,
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>
            {mode === 'favorite' ? 'Add to Favorites' : 'Create a Booking'}
          </DialogTitle>
          <DialogDescription>
            {mode === 'favorite' 
              ? 'Browse and add listings to your favorites' 
              : 'Select a listing to create a new booking'}
          </DialogDescription>
        </DialogHeader>
        
        <div className="relative mb-4">
          <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search listings..."
            className="pl-10"
            value={searchTerm}
            onChange={handleSearchChange}
          />
        </div>
        
        <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as any)}>
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="stays">Stays</TabsTrigger>
            <TabsTrigger value="food">Food</TabsTrigger>
            <TabsTrigger value="experiences">Experiences</TabsTrigger>
          </TabsList>
          
          <div className="mt-4 max-h-[400px] overflow-y-auto">
            {isLoading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : filteredListings.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No listings found. Try a different search term.
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {filteredListings.map((listing) => (
                  <Card key={listing.id} className="overflow-hidden">
                    <div className="relative h-32">
                      <img
                        src={listing.image || "/images/placeholder-listing.jpg"}
                        alt={listing.title}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <CardContent className="p-4">
                      <div>
                        <span className="inline-block px-2 py-1 text-xs rounded-full bg-muted mb-1">
                          {listing.type}
                        </span>
                        <h3 className="font-semibold">{listing.title}</h3>
                        <p className="text-sm text-muted-foreground mb-3">
                          {listing.price}
                        </p>
                        <Button 
                          size="sm" 
                          className="w-full"
                          onClick={() => mode === 'favorite' 
                            ? handleAddFavorite(listing) 
                            : handleAddBooking(listing)
                          }
                        >
                          {mode === 'favorite' ? 'Add to Favorites' : 'Book Now'}
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </Tabs>
        
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default ListingsModal; 