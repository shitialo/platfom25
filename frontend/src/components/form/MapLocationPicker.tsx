import { useState, useCallback, useRef, useEffect } from 'react';
import { GoogleMap, MarkerF, useLoadScript } from '@react-google-maps/api';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { MapPin, Search, Loader2 } from 'lucide-react';
import { useDebounce } from '@/hooks/useDebounce';

interface Location {
  address: string;
  zipcode: string;
  city: string;
  state: string;
  latitude: number;
  longitude: number;
  displayLocation?: string;
}

interface MapLocationPickerProps {
  value: Location;
  onChange: (location: Location) => void;
  error?: string;
}

const defaultCenter = { lat: 32.7767, lng: -84.9377 }; // Center of GA/AL

export const MapLocationPicker = ({ value, onChange, error }: MapLocationPickerProps) => {
  const [searchInput, setSearchInput] = useState('');
  const [suggestions, setSuggestions] = useState<google.maps.places.AutocompletePrediction[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [mapCenter, setMapCenter] = useState(defaultCenter);
  const geocoder = useRef<google.maps.Geocoder | null>(null);
  const autocompleteService = useRef<google.maps.places.AutocompleteService | null>(null);
  const placesService = useRef<google.maps.places.PlacesService | null>(null);

  const { isLoaded } = useLoadScript({
    googleMapsApiKey: 'AIzaSyDpB03uqoC8eWmdG8KRlBdiJaHWbXmtMgE',
    libraries: ['places']
  });

  const debouncedSearchInput = useDebounce(searchInput, 300);

  // Initialize services when map loads
  useEffect(() => {
    if (isLoaded) {
      const map = new google.maps.Map(document.createElement('div'));
      autocompleteService.current = new google.maps.places.AutocompleteService();
      placesService.current = new google.maps.places.PlacesService(map);
      geocoder.current = new google.maps.Geocoder();
    }
  }, [isLoaded]);

  const handleSearch = useCallback(async (input: string) => {
    if (!input || !autocompleteService.current) return;

    try {
      const result = await new Promise<google.maps.places.AutocompletePrediction[]>((resolve, reject) => {
        autocompleteService.current!.getPlacePredictions({
          input,
          componentRestrictions: { country: 'us' },
          types: ['address'], // Changed from 'postal_code' to 'address'
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

      setSuggestions(result);
    } catch (error) {
      console.error('Error fetching suggestions:', error);
      setSuggestions([]);
    }
  }, []);

  const getLocationFromLatLng = useCallback(async (lat: number, lng: number) => {
    if (!geocoder.current) {
      geocoder.current = new google.maps.Geocoder();
    }

    try {
      const result = await geocoder.current.geocode({
        location: { lat, lng }
      });

      if (result.results[0]) {
        const place = result.results[0];
        const addressComponents = place.address_components;

        const location = {
          address: place.formatted_address,
          zipcode: addressComponents.find(c => c.types.includes('postal_code'))?.long_name || '',
          city: addressComponents.find(c => c.types.includes('locality'))?.long_name || '',
          state: addressComponents.find(c => c.types.includes('administrative_area_level_1'))?.short_name || '',
          latitude: lat,
          longitude: lng,
          displayLocation: `${addressComponents.find(c => c.types.includes('locality'))?.long_name || ''}, ${addressComponents.find(c => c.types.includes('administrative_area_level_1'))?.short_name || ''}`
        };

        onChange(location);
        setMapCenter({ lat, lng });
        setSearchInput(place.formatted_address);
      }
    } catch (error) {
      console.error('Error reverse geocoding:', error);
    }
  }, [onChange]);

  const handleMapClick = useCallback(async (e: google.maps.MapMouseEvent) => {
    if (e.latLng) {
      const lat = e.latLng.lat();
      const lng = e.latLng.lng();
      await getLocationFromLatLng(lat, lng);
    }
  }, [getLocationFromLatLng]);

  const handleSuggestionSelect = async (prediction: google.maps.places.AutocompletePrediction) => {
    setIsLoading(true);
    setSuggestions([]); // Clear suggestions immediately
    try {
      if (!placesService.current) {
        const map = new google.maps.Map(document.createElement('div'));
        placesService.current = new google.maps.places.PlacesService(map);
      }

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

      if (placeResult.geometry?.location) {
        const lat = placeResult.geometry.location.lat();
        const lng = placeResult.geometry.location.lng();
        await getLocationFromLatLng(lat, lng);
      }
    } catch (error) {
      console.error('Error fetching place details:', error);
    } finally {
      setIsLoading(false);
    }
  };

  if (!isLoaded) return <div>Loading...</div>;

  return (
    <div className="space-y-4">
      <div className="relative">
        <Input
          value={searchInput}
          onChange={(e) => {
            setSearchInput(e.target.value);
            handleSearch(e.target.value);
          }}
          placeholder="Search for an address..."
          className={`pr-10 ${error ? 'border-red-500' : ''}`}
        />
        {isLoading ? (
          <Loader2 className="w-4 h-4 absolute right-3 top-3 animate-spin" />
        ) : (
          <Search className="w-4 h-4 absolute right-3 top-3 text-gray-400" />
        )}
      </div>

      {suggestions.length > 0 && (
        <div className="absolute z-20 w-full bg-white rounded-md shadow-lg border mt-1">
          {suggestions.map((suggestion) => (
            <Button
              key={suggestion.place_id}
              variant="ghost"
              className="w-full justify-start text-left"
              onClick={() => handleSuggestionSelect(suggestion)}
            >
              <MapPin className="w-4 h-4 mr-2" />
              {suggestion.description}
            </Button>
          ))}
        </div>
      )}

      <div className="h-[300px] rounded-lg overflow-hidden border">
        <GoogleMap
          zoom={12}
          center={mapCenter}
          mapContainerClassName="w-full h-full"
          onClick={handleMapClick}
          options={{
            streetViewControl: false,
            mapTypeControl: false,
          }}
        >
          {value.latitude && value.longitude && (
            <MarkerF
              position={{ lat: value.latitude, lng: value.longitude }}
              icon={{
                url: '/images/location-marker.svg',
                scaledSize: new google.maps.Size(40, 40)
              }}
            />
          )}
        </GoogleMap>
      </div>

      {error && (
        <p className="text-sm text-red-500">{error}</p>
      )}

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="text-sm font-medium">Address</label>
          <p className="text-sm text-gray-600">{value.address || 'Not selected'}</p>
        </div>
        <div>
          <label className="text-sm font-medium">Zipcode</label>
          <p className="text-sm text-gray-600">{value.zipcode || 'Not selected'}</p>
        </div>
        <div>
          <label className="text-sm font-medium">City</label>
          <p className="text-sm text-gray-600">{value.city || 'Not selected'}</p>
        </div>
        <div>
          <label className="text-sm font-medium">State</label>
          <p className="text-sm text-gray-600">{value.state || 'Not selected'}</p>
        </div>
      </div>
    </div>
  );
}; 