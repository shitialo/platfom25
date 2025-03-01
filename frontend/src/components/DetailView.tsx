import { useState } from "react";
import { Star, MapPin, ChevronLeft, ChevronRight } from "lucide-react";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import Map from "./Map";
import { Location } from "./Map";

interface Review {
  id: number;
  userName: string;
  rating: number;
  date: string;
  comment: string;
  userImage?: string;
}

interface DetailViewProps {
  title: string;
  images: string[];
  description: string;
  rating: number;
  price: string;
  amenities?: string[];
  location: Location;
  reviews: Review[];
  type: "stay" | "food";
  additionalInfo?: {
    bedrooms?: number;
    beds?: number;
    baths?: number;
    cuisine?: string;
    specialties?: string[];
  };
}

const DetailView = ({
  title,
  images,
  description,
  rating,
  price,
  amenities,
  location,
  reviews,
  type,
  additionalInfo,
}: DetailViewProps) => {
  const [currentImageIndex, setCurrentImageIndex] = useState(0);

  const nextImage = () => {
    setCurrentImageIndex((prev) => (prev + 1) % images.length);
  };

  const previousImage = () => {
    setCurrentImageIndex((prev) => (prev - 1 + images.length) % images.length);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-sage-50 to-terracotta-50 animate-fadeIn">
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-4xl font-bold mb-4 text-gray-800">{title}</h1>
        <div className="flex items-center gap-4 mb-6">
          <div className="flex items-center">
            <Star className="w-5 h-5 text-yellow-500 fill-yellow-500" />
            <span className="ml-1 font-medium">{rating}</span>
          </div>
          <Badge variant="secondary" className="bg-sage-100">
            {type === "stay" ? "Stay" : "Food"}
          </Badge>
          <span className="text-lg font-medium text-sage-700">{price}</span>
        </div>

        <div className="relative h-[500px] mb-8 rounded-xl overflow-hidden group">
          <img
            src={images[currentImageIndex]}
            alt={`${title} - Image ${currentImageIndex + 1}`}
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-black bg-opacity-20 opacity-0 group-hover:opacity-100 transition-opacity">
            <Button
              variant="ghost"
              className="absolute left-4 top-1/2 -translate-y-1/2 bg-white/80 hover:bg-white"
              onClick={previousImage}
            >
              <ChevronLeft className="w-6 h-6" />
            </Button>
            <Button
              variant="ghost"
              className="absolute right-4 top-1/2 -translate-y-1/2 bg-white/80 hover:bg-white"
              onClick={nextImage}
            >
              <ChevronRight className="w-6 h-6" />
            </Button>
          </div>
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2">
            {images.map((_, index) => (
              <button
                key={index}
                className={`w-2 h-2 rounded-full transition-all ${
                  index === currentImageIndex
                    ? "bg-white scale-125"
                    : "bg-white/50 hover:bg-white/80"
                }`}
                onClick={() => setCurrentImageIndex(index)}
              />
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-12">
          <div className="md:col-span-2">
            <div className="bg-white rounded-xl p-6 shadow-sm mb-8">
              <h2 className="text-2xl font-semibold mb-4">About this {type}</h2>
              <p className="text-gray-600 mb-6">{description}</p>
              {type === "stay" && additionalInfo && (
                <div className="flex gap-4 text-gray-600">
                  <span>{additionalInfo.bedrooms} bedrooms</span>
                  <span>{additionalInfo.beds} beds</span>
                  <span>{additionalInfo.baths} baths</span>
                </div>
              )}
              {type === "food" && additionalInfo && (
                <div className="space-y-4">
                  <p className="text-gray-600">Cuisine: {additionalInfo.cuisine}</p>
                  {additionalInfo.specialties && (
                    <div className="flex flex-wrap gap-2">
                      {additionalInfo.specialties.map((specialty, index) => (
                        <Badge key={index} variant="outline">
                          {specialty}
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="bg-white rounded-xl p-6 shadow-sm">
              <h2 className="text-2xl font-semibold mb-6">Reviews</h2>
              <div className="space-y-6">
                {reviews.map((review) => (
                  <div key={review.id} className="border-b pb-6 last:border-0">
                    <div className="flex items-center gap-4 mb-3">
                      <div className="w-12 h-12 rounded-full overflow-hidden bg-sage-100">
                        {review.userImage ? (
                          <img
                            src={review.userImage}
                            alt={review.userName}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-sage-500">
                            {review.userName[0].toUpperCase()}
                          </div>
                        )}
                      </div>
                      <div>
                        <h3 className="font-medium">{review.userName}</h3>
                        <div className="flex items-center gap-2">
                          <div className="flex">
                            {[...Array(5)].map((_, i) => (
                              <Star
                                key={i}
                                className={`w-4 h-4 ${
                                  i < review.rating
                                    ? "text-yellow-500 fill-yellow-500"
                                    : "text-gray-300"
                                }`}
                              />
                            ))}
                          </div>
                          <span className="text-sm text-gray-500">
                            {review.date}
                          </span>
                        </div>
                      </div>
                    </div>
                    <p className="text-gray-600">{review.comment}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="md:col-span-1">
            <div className="bg-white rounded-xl p-6 shadow-sm sticky top-24">
              <h2 className="text-2xl font-semibold mb-4">Location</h2>
              <div className="h-[300px] rounded-lg overflow-hidden mb-4">
                <Map
                  locations={[location]}
                  highlightedLocation={location}
                />
              </div>
              <div className="flex items-start gap-2 text-gray-600">
                <MapPin className="w-5 h-5 mt-1 flex-shrink-0" />
                <p>{location.description}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DetailView;