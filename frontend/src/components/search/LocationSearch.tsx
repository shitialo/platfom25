import { useState, useEffect, useRef } from 'react';
import { Search, MapPin, Loader2, Navigation } from 'lucide-react';
import { Input } from '../ui/input';
import { Button } from '../ui/button';
import { useLoadScript, GoogleMap, MarkerF } from '@react-google-maps/api';
import { useNavigate } from 'react-router-dom';
import { MapLoading } from '../ui/loading';

interface Location {
  address: string;
  zipcode: string;
  city: string;
  state: string;
  latitude: number;
  longitude: number;
  placeId: string;
}

interface Listing {
  id: number;
  title: string;
  type: 'food' | 'stay';
  latitude: number;
  longitude: number;
}

interface LocationSearchProps {
  onLocationSelect?: () => void;
}

const LocationSearch = ({ onLocationSelect }: LocationSearchProps) => {
  const [searchInput, setSearchInput] = useState('');
  const [suggestions, setSuggestions] = useState<Location[]>([]);
  const [selectedLocation, setSelectedLocation] = useState<Location | null>(null);
  const [showMap, setShowMap] = useState(false);
  const [nearbyListings, setNearbyListings] = useState<Listing[]>([]);
  const autocompleteService = useRef<google.maps.places.AutocompleteService | null>(null);
  const placesService = useRef<google.maps.places.PlacesService | null>(null);
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const { isLoaded } = useLoadScript({
    googleMapsApiKey: 'AIzaSyDpB03uqoC8eWmdG8KRlBdiJaHWbXmtMgE',
    libraries: ['places']
  });

  useEffect(() => {
    if (isLoaded && !autocompleteService.current) {
      autocompleteService.current = new google.maps.places.AutocompleteService();
    }
  }, [isLoaded]);

  const handleSearch = async (input: string) => {
    setSearchInput(input);
    if (!input || !autocompleteService.current) return;

    try {
      const result = await new Promise<google.maps.places.AutocompletePrediction[]>((resolve, reject) => {
        autocompleteService.current!.getPlacePredictions({
          input,
          componentRestrictions: { country: 'us' },
          types: ['postal_code'],
          bounds: {
            north: 35.0,
            south: 30.5,
            east: -81.0,
            west: -88.5,
          }
        }, (predictions, status) => {
          if (status === google.maps.places.PlacesServiceStatus.OK && predictions) {
            resolve(predictions);
          } else {
            reject(new Error('Failed to fetch suggestions'));
          }
        });
      });

      const locations = result.map(prediction => ({
        placeId: prediction.place_id,
        address: prediction.description,
        zipcode: '',
        city: '',
        state: '',
        latitude: 0,
        longitude: 0
      }));

      setSuggestions(locations);
    } catch (error) {
      console.error('Error fetching suggestions:', error);
      setSuggestions([]);
    }
  };

  const handleLocationSelect = async (location: Location) => {
    setIsLoading(true);
    if (!placesService.current) {
      const map = new google.maps.Map(document.createElement('div'));
      placesService.current = new google.maps.places.PlacesService(map);
    }

    try {
      const placeResult = await new Promise<google.maps.places.PlaceResult>((resolve, reject) => {
        placesService.current!.getDetails(
          {
            placeId: location.placeId,
            fields: ['geometry', 'address_components']
          },
          (place, status) => {
            if (status === google.maps.places.PlacesServiceStatus.OK && place) {
              resolve(place);
            } else {
              reject(new Error('Failed to fetch place details'));
            }
          }
        );
      });

      const addressComponents = placeResult.address_components || [];
      const zipcode = addressComponents.find(c => c.types.includes('postal_code'))?.long_name || '';
      const city = addressComponents.find(c => c.types.includes('locality'))?.long_name || '';
      const state = addressComponents.find(c => c.types.includes('administrative_area_level_1'))?.short_name || '';

      const updatedLocation: Location = {
        ...location,
        zipcode,
        city,
        state,
        latitude: placeResult.geometry?.location?.lat() || 0,
        longitude: placeResult.geometry?.location?.lng() || 0
      };

      setSelectedLocation(updatedLocation);
      setShowMap(true);
      setSuggestions([]); // Clear suggestions when location is selected

      // Fetch nearby listings
      const response = await fetch(
        `${import.meta.env.VITE_API_URL}/listings/nearby?lat=${updatedLocation.latitude}&lng=${updatedLocation.longitude}`
      );
      const data = await response.json();
      setNearbyListings(data);
    } catch (error) {
      console.error('Error fetching location details:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSearchType = (type: 'food' | 'stays') => {
    if (!selectedLocation) return;
    
    const searchParams = new URLSearchParams({
      zipcode: selectedLocation.zipcode,
      location: `${selectedLocation.city}, ${selectedLocation.state}`
    });

    navigate(`/${type}?${searchParams.toString()}`);
    console.log(`Navigating to /${type} with params:`, searchParams.toString());
    onLocationSelect?.();
  };

  const handleUseCurrentLocation = () => {
    if (!navigator.geolocation) {
      // Show error toast that geolocation is not supported
      return;
    }

    setIsLoading(true);
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        try {
          const { latitude, longitude } = position.coords;
          const response = await fetch(
            `https://maps.googleapis.com/maps/api/geocode/json?latlng=${latitude},${longitude}&key=AIzaSyDpB03uqoC8eWmdG8KRlBdiJaHWbXmtMgE`
          );
          const data = await response.json();
          
          if (data.results[0]) {
            const addressComponents = data.results[0].address_components;
            const zipcode = addressComponents.find(c => c.types.includes('postal_code'))?.long_name || '';
            const city = addressComponents.find(c => c.types.includes('locality'))?.long_name || '';
            const state = addressComponents.find(c => c.types.includes('administrative_area_level_1'))?.short_name || '';

            const location: Location = {
              placeId: data.results[0].place_id,
              address: data.results[0].formatted_address,
              zipcode,
              city,
              state,
              latitude,
              longitude
            };

            setSelectedLocation(location);
            setShowMap(true);
            setSearchInput(location.address);
            
            // Fetch nearby listings
            const listingsResponse = await fetch(
              `${import.meta.env.VITE_API_URL}/listings/nearby?lat=${latitude}&lng=${longitude}`
            );
            const listings = await listingsResponse.json();
            setNearbyListings(listings);
          }
        } catch (error) {
          console.error('Error getting location:', error);
        } finally {
          setIsLoading(false);
        }
      },
      (error) => {
        console.error('Error getting location:', error);
        setIsLoading(false);
      }
    );
  };

  const mapCenter = selectedLocation ? 
    { lat: selectedLocation.latitude, lng: selectedLocation.longitude } : 
    { lat: 32.7767, lng: -84.9377 }; // Center of GA/AL

  // Add a function to close the map
  const handleCloseMap = () => {
    setShowMap(false);
    setSelectedLocation(null);
    setNearbyListings([]);
  };

  return (
    <section className="py-12 bg-gray-50">
      <div className="container mx-auto px-4">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-4xl font-bold text-center mb-8 font-display">
            Find Local Food & Stays
          </h2>
          
          <div className="relative">
            <div className="relative">
              <Input
                type="text"
                placeholder="Enter zipcode..."
                value={searchInput}
                onChange={(e) => handleSearch(e.target.value)}
                className="w-full p-4 text-lg rounded-lg pr-24"
                disabled={isLoading}
              />
              <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-2">
                {isLoading ? (
                  <Loader2 className="w-5 h-5 animate-spin text-gray-400" />
                ) : (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-gray-500 hover:text-primary"
                    onClick={handleUseCurrentLocation}
                  >
                    <Navigation className="w-4 h-4" />
                  </Button>
                )}
              </div>
            </div>
            
            {suggestions.length > 0 && !showMap && (
              <div className="absolute w-full mt-2 bg-white rounded-lg shadow-lg z-10 overflow-hidden transition-all duration-200 ease-in-out">
                {suggestions.map((suggestion, index) => (
                  <button
                    key={index}
                    className="w-full p-4 text-left hover:bg-gray-50 flex items-center gap-3 transition-colors duration-150"
                    onClick={() => handleLocationSelect(suggestion)}
                    disabled={isLoading}
                  >
                    <MapPin className="text-primary" />
                    <div>
                      <p className="font-medium">{suggestion.address}</p>
                    </div>
                  </button>
                ))}
              </div>
            )}

            {showMap && (
              <div className="mt-4 rounded-lg overflow-hidden shadow-lg transition-all duration-300 ease-in-out">
                <div className="relative">
                  <Button
                    variant="outline"
                    size="sm"
                    className="absolute top-2 right-2 z-10 bg-white"
                    onClick={handleCloseMap}
                  >
                    Close Map
                  </Button>
                  
                  {!isLoaded ? (
                    <MapLoading />
                  ) : (
                    <GoogleMap
                      zoom={12}
                      center={mapCenter}
                      mapContainerClassName="w-full h-[300px]"
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
                      {selectedLocation && (
                        <MarkerF
                          position={{ 
                            lat: selectedLocation.latitude, 
                            lng: selectedLocation.longitude 
                          }}
                          icon={{
                            url: '/images/location-marker.svg',
                            scaledSize: new google.maps.Size(40, 40)
                          }}
                        />
                      )}
                      {nearbyListings.map((listing) => (
                        <MarkerF
                          key={listing.id}
                          position={{ lat: listing.latitude, lng: listing.longitude }}
                          icon={{
                            url: listing.type === 'food' ? '/images/food-marker.svg' : '/images/stay-marker.svg',
                            scaledSize: new google.maps.Size(24, 24)
                          }}
                        />
                      ))}
                    </GoogleMap>
                  )}
                </div>

                <div className="p-4 bg-white">
                  <div className="flex gap-4">
                    <Button 
                      className="flex-1 bg-primary hover:bg-primary/90"
                      onClick={() => handleSearchType('food')}
                      disabled={isLoading}
                    >
                      Find Food
                    </Button>
                    <Button 
                      className="flex-1"
                      variant="outline"
                      onClick={() => handleSearchType('stays')}
                      disabled={isLoading}
                    >
                      Find Stays
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
};

export default LocationSearch; 