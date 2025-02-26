import { useState, useRef } from 'react';
import { Input } from '../ui/input';
import { Button } from '../ui/button';
import { MapPin, Loader2 } from 'lucide-react';
import { useLoadScript } from '@react-google-maps/api';

interface Location {
  address: string;
  zipcode: string;
  city: string;
  state: string;
  latitude: number;
  longitude: number;
}

interface LocationInputProps {
  value: Location;
  onChange: (location: Location) => void;
  error?: string;
}

export const LocationInput = ({ value, onChange, error }: LocationInputProps) => {
  const [searchInput, setSearchInput] = useState(value.address);
  const [suggestions, setSuggestions] = useState<google.maps.places.AutocompletePrediction[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const autocompleteService = useRef<google.maps.places.AutocompleteService | null>(null);
  const placesService = useRef<google.maps.places.PlacesService | null>(null);

  const { isLoaded } = useLoadScript({
    googleMapsApiKey: 'AIzaSyDpB03uqoC8eWmdG8KRlBdiJaHWbXmtMgE',
    libraries: ['places']
  });

  const handleSearch = async (input: string) => {
    setSearchInput(input);
    if (!input || !autocompleteService.current) return;

    try {
      const predictions = await autocompleteService.current.getPlacePredictions({
        input,
        componentRestrictions: { country: 'us' },
        bounds: {
          north: 35.0,
          south: 30.5,
          east: -81.0,
          west: -88.5,
        }
      });

      setSuggestions(predictions.predictions);
    } catch (error) {
      console.error('Error fetching suggestions:', error);
    }
  };

  const handleSelect = async (prediction: google.maps.places.AutocompletePrediction) => {
    setIsLoading(true);
    try {
      const placeResult = await new Promise<google.maps.places.PlaceResult>((resolve, reject) => {
        placesService.current!.getDetails(
          {
            placeId: prediction.place_id,
            fields: ['geometry', 'address_components', 'formatted_address']
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
      const location = {
        address: placeResult.formatted_address || '',
        zipcode: addressComponents.find(c => c.types.includes('postal_code'))?.long_name || '',
        city: addressComponents.find(c => c.types.includes('locality'))?.long_name || '',
        state: addressComponents.find(c => c.types.includes('administrative_area_level_1'))?.short_name || '',
        latitude: placeResult.geometry?.location?.lat() || 0,
        longitude: placeResult.geometry?.location?.lng() || 0
      };

      console.log('Selected location:', location);
      onChange(location);
    } catch (error) {
      console.error('Error fetching place details:', error);
    } finally {
      setIsLoading(false);
    }
  };

  if (!isLoaded) return <div>Loading...</div>;

  return (
    <div className="space-y-2">
      <div className="relative">
        <Input
          value={searchInput}
          onChange={(e) => handleSearch(e.target.value)}
          placeholder="Enter address..."
          className={`pr-10 ${error ? 'border-red-500' : ''}`}
        />
        {isLoading && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2">
            <Loader2 className="w-4 h-4 animate-spin" />
          </div>
        )}
      </div>

      {error && (
        <p className="text-sm text-red-500">{error}</p>
      )}

      {suggestions.length > 0 && (
        <div className="absolute z-10 w-full bg-white rounded-md shadow-lg border mt-1">
          {suggestions.map((suggestion) => (
            <Button
              key={suggestion.place_id}
              variant="ghost"
              className="w-full justify-start text-left"
              onClick={() => handleSelect(suggestion)}
            >
              <MapPin className="w-4 h-4 mr-2" />
              {suggestion.description}
            </Button>
          ))}
        </div>
      )}
    </div>
  );
}; 