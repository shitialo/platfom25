import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Clock, Users, Star } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { StarIcon } from "lucide-react";

interface ImageData {
  url: string;
  full_url?: string;
}

interface FoodExperience {
  id: number;
  title: string;
  description: string;
  images: ImageData[];
  price_per_person: number;
  cuisine_type: string;
  host: {
    name: string;
    rating: number;
    reviews: number;
  };
  location_name: string;
  details: {
    duration: string;
    groupSize: string;
    includes: string[];
    language: string;
    location: string;
  };
}

interface FoodCardProps {
  experience: FoodExperience;
  onClick?: () => void;
}

export const FoodCard = ({ experience, onClick }: FoodCardProps) => {
  // Add default values for missing data
  const {
    title = 'Untitled Experience',
    images = [],
    price_per_person = 0,
    host = {
      name: 'Unknown Host',
      rating: 0,
      reviews: 0
    },
    location_name = 'Location not specified',
    cuisine_type = 'Various'
  } = experience || {};

  // Only use image if it exists
  const hasImage = images.length > 0 && images[0]?.url;

  return (
    <Card 
      className="overflow-hidden cursor-pointer hover:shadow-lg transition-shadow"
      onClick={onClick}
    >
      <div className="relative h-48 bg-gray-100">
        {hasImage && (
          <img
            src={images[0].url}
            alt={title}
            className="w-full h-full object-cover"
            loading="lazy"
          />
        )}
        <div className="absolute top-2 right-2">
          <Badge variant="secondary">
            ${price_per_person.toFixed(2)}/person
          </Badge>
        </div>
      </div>
      
      <CardHeader>
        <div className="flex justify-between items-start">
          <CardTitle className="text-lg">{title}</CardTitle>
          <div className="flex items-center gap-1">
            <StarIcon className="w-4 h-4 fill-yellow-400 stroke-yellow-400" />
            <span className="text-sm">
              {host.rating.toFixed(1)} ({host.reviews})
            </span>
          </div>
        </div>
      </CardHeader>
      
      <CardContent>
        <p className="text-sm text-gray-600 mb-2">
          Hosted by {host.name}
        </p>
        <p className="text-sm text-gray-600">
          {location_name}
        </p>
        <Badge variant="outline" className="mt-2">
          {cuisine_type}
        </Badge>
      </CardContent>
    </Card>
  );
}; 