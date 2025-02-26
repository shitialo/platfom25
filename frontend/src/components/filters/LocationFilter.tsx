import { useState } from 'react';
import { LocationInput } from '../form/LocationInput';
import { Button } from '../ui/button';
import { Card } from '../ui/card';
import { Slider } from '../ui/slider';

interface LocationFilterProps {
  onFilter: (params: {
    latitude: number;
    longitude: number;
    radius: number;
  }) => void;
}

export const LocationFilter = ({ onFilter }: LocationFilterProps) => {
  const [location, setLocation] = useState({
    address: '',
    zipcode: '',
    city: '',
    state: '',
    latitude: 0,
    longitude: 0
  });
  const [radius, setRadius] = useState(10); // 10km default radius

  const handleApplyFilter = () => {
    if (location.latitude && location.longitude) {
      onFilter({
        latitude: location.latitude,
        longitude: location.longitude,
        radius
      });
    }
  };

  return (
    <Card className="p-4 space-y-4">
      <h3 className="font-semibold">Location</h3>
      <LocationInput
        value={location}
        onChange={setLocation}
      />
      <div className="space-y-2">
        <label className="text-sm">Distance (km)</label>
        <Slider
          value={[radius]}
          onValueChange={([value]) => setRadius(value)}
          min={1}
          max={50}
          step={1}
        />
        <div className="flex justify-between text-sm text-muted-foreground">
          <span>1km</span>
          <span>{radius}km</span>
          <span>50km</span>
        </div>
      </div>
      <Button 
        className="w-full"
        onClick={handleApplyFilter}
        disabled={!location.latitude || !location.longitude}
      >
        Apply Filter
      </Button>
    </Card>
  );
}; 