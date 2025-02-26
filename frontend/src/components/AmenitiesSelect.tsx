import { useEffect, useState } from "react";
import { Check, Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface Amenity {
  id: string;
  name: string;
}

interface AmenitiesSelectProps {
  selectedAmenities: Amenity[];
  onAmenitiesChange: (amenities: Amenity[]) => void;
}

export const AmenitiesSelect = ({ selectedAmenities = [], onAmenitiesChange }: AmenitiesSelectProps) => {
  const [open, setOpen] = useState(false);
  const [groupedAmenities, setGroupedAmenities] = useState<Record<string, Amenity[]>>({});
  const [newAmenityName, setNewAmenityName] = useState("");
  const [showAddNew, setShowAddNew] = useState(false);

  useEffect(() => {
    const fetchAmenities = async () => {
      try {
        const response = await fetch(`${import.meta.env.VITE_API_URL}/amenities?type=stay`);
        if (!response.ok) throw new Error('Failed to fetch amenities');
        const data = await response.json();
        const validData = Object.entries(data || {}).reduce((acc, [key, value]) => {
          acc[key] = Array.isArray(value) ? value : [];
          return acc;
        }, {} as Record<string, Amenity[]>);
        setGroupedAmenities(validData);
      } catch (error) {
        console.error('Error fetching amenities:', error);
        setGroupedAmenities({});
      }
    };

    fetchAmenities();
  }, []);

  const handleSelect = (amenity: Amenity) => {
    const currentSelected = Array.isArray(selectedAmenities) ? selectedAmenities : [];
    const isSelected = currentSelected.some(a => a.id === amenity.id);
    
    if (isSelected) {
      onAmenitiesChange(currentSelected.filter(a => a.id !== amenity.id));
    } else {
      onAmenitiesChange([...currentSelected, amenity]);
    }
  };

  const handleAddNew = () => {
    if (newAmenityName.trim()) {
      const newAmenity = {
        id: `new-${Date.now()}`,
        name: newAmenityName.trim()
      };
      const currentSelected = Array.isArray(selectedAmenities) ? selectedAmenities : [];
      onAmenitiesChange([...currentSelected, newAmenity]);
      setNewAmenityName("");
      setShowAddNew(false);
    }
  };

  return (
    <div className="space-y-4">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className="w-full justify-between"
          >
            {Array.isArray(selectedAmenities) && selectedAmenities.length > 0 
              ? `${selectedAmenities.length} amenities selected`
              : "Select amenities..."}
            <Plus className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[400px] p-0" align="start">
          <Command>
            <CommandInput placeholder="Search amenities..." />
            <CommandList>
              <CommandEmpty>
                <div className="p-4 text-sm text-muted-foreground">
                  No amenities found.
                  <Button
                    variant="ghost"
                    size="sm"
                    className="ml-2"
                    onClick={() => setShowAddNew(true)}
                  >
                    Add new
                  </Button>
                </div>
              </CommandEmpty>
              {Object.entries(groupedAmenities).map(([category, amenities]) => (
                <CommandGroup key={category} heading={category}>
                  {Array.isArray(amenities) && amenities.map((amenity) => {
                    const isSelected = Array.isArray(selectedAmenities) && 
                      selectedAmenities.some(a => a.id === amenity.id);
                    return (
                      <CommandItem
                        key={amenity.id}
                        value={amenity.name}
                        onSelect={() => handleSelect(amenity)}
                      >
                        <div className="flex items-center justify-between w-full">
                          <span>{amenity.name}</span>
                          {isSelected && <Check className="w-4 h-4" />}
                        </div>
                      </CommandItem>
                    );
                  })}
                </CommandGroup>
              ))}
            </CommandList>
          </Command>
          {showAddNew && (
            <div className="p-4 border-t">
              <div className="flex gap-2">
                <Input
                  value={newAmenityName}
                  onChange={(e) => setNewAmenityName(e.target.value)}
                  placeholder="Enter new amenity name"
                  className="flex-1"
                />
                <Button size="sm" onClick={handleAddNew}>Add</Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => {
                    setShowAddNew(false);
                    setNewAmenityName("");
                  }}
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            </div>
          )}
        </PopoverContent>
      </Popover>

      <div className="flex flex-wrap gap-2">
        {Array.isArray(selectedAmenities) && selectedAmenities.map((amenity) => (
          <Badge
            key={amenity.id}
            variant="secondary"
            className="flex items-center gap-1"
          >
            {amenity.name}
            <X
              className="w-3 h-3 cursor-pointer"
              onClick={() => handleSelect(amenity)}
            />
          </Badge>
        ))}
      </div>
    </div>
  );
}; 