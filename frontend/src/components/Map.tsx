import React, { useEffect, useRef, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { Input } from './ui/input';
import { Button } from './ui/button';
import { toast } from './ui/use-toast';

export interface Location {
  name: string;
  coordinates: [number, number];
  description: string;
}

interface MapProps {
  locations: Location[];
  highlightedLocation?: Location;
}

const Map = ({ locations, highlightedLocation }: MapProps) => {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const [mapboxToken, setMapboxToken] = useState('');
  const [isMapInitialized, setIsMapInitialized] = useState(false);

  const initializeMap = () => {
    if (!mapContainer.current || !mapboxToken) return;

    try {
      mapboxgl.accessToken = mapboxToken;
      
      const initialCenter = highlightedLocation?.coordinates || [-74.006, 40.7128];
      
      map.current = new mapboxgl.Map({
        container: mapContainer.current,
        style: 'mapbox://styles/mapbox/streets-v11',
        center: initialCenter,
        zoom: highlightedLocation ? 15 : 12
      });

      map.current.addControl(new mapboxgl.NavigationControl(), 'top-right');

      locations.forEach((location) => {
        const isHighlighted = highlightedLocation?.name === location.name;
        
        const popup = new mapboxgl.Popup({ offset: 25 })
          .setHTML(
            `<h3 class="font-bold">${location.name}</h3>
             <p>${location.description}</p>
             <a href="https://www.google.com/maps/dir/?api=1&destination=${location.coordinates[1]},${location.coordinates[0]}" 
                target="_blank" 
                class="text-blue-500 hover:text-blue-700">
                Get Directions
             </a>`
          );

        const marker = new mapboxgl.Marker({
          color: isHighlighted ? '#EA5757' : '#3FB1CE'
        })
          .setLngLat(location.coordinates)
          .setPopup(popup)
          .addTo(map.current);

        if (isHighlighted) {
          marker.togglePopup();
        }
      });

      setIsMapInitialized(true);
      toast({
        title: "Map initialized successfully",
        description: "You can now view vendor locations",
      });
    } catch (error) {
      console.error('Error initializing map:', error);
      toast({
        title: "Error initializing map",
        description: "Please check your Mapbox token",
        variant: "destructive",
      });
    }
  };

  useEffect(() => {
    return () => {
      if (map.current) {
        map.current.remove();
      }
    };
  }, []);

  if (!isMapInitialized) {
    return (
      <div className="space-y-4 p-4">
        <p className="text-sm text-muted-foreground">
          Please enter your Mapbox token to view the map. You can get one from{' '}
          <a 
            href="https://www.mapbox.com" 
            target="_blank" 
            rel="noopener noreferrer"
            className="text-blue-500 hover:text-blue-700"
          >
            Mapbox
          </a>
        </p>
        <Input
          type="text"
          placeholder="Enter your Mapbox token"
          value={mapboxToken}
          onChange={(e) => setMapboxToken(e.target.value)}
          className="w-full max-w-md"
        />
        <Button onClick={initializeMap}>Initialize Map</Button>
      </div>
    );
  }

  return (
    <div className="w-full h-[400px] rounded-lg overflow-hidden">
      <div ref={mapContainer} className="w-full h-full" />
    </div>
  );
};

export default Map;