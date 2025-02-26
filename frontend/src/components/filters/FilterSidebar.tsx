import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Slider } from "@/components/ui/slider";
import { Checkbox } from "@/components/ui/checkbox";
import { X } from "lucide-react";
import { ReactNode } from "react";

interface FilterOption {
  id: string;
  label: string;
  count: number;
}

interface FilterSidebarProps {
  title: string;
  priceRange?: [number, number];
  onPriceChange?: (value: [number, number]) => void;
  categories: FilterOption[];
  selectedCategories: string[];
  onCategoryChange: (id: string) => void;
  amenities?: FilterOption[];
  selectedAmenities?: string[];
  onAmenityChange?: (id: string) => void;
  onReset: () => void;
  type: 'food' | 'stay';
  showPriceFilter?: boolean;
  sortComponent?: ReactNode;
}

const FilterSidebar = ({
  title,
  priceRange,
  onPriceChange,
  categories,
  selectedCategories,
  onCategoryChange,
  amenities,
  selectedAmenities,
  onAmenityChange,
  onReset,
  type,
  showPriceFilter = true,
  sortComponent,
}: FilterSidebarProps) => {
  return (
    <Card className="p-6 sticky top-24 max-h-[calc(100vh-120px)] overflow-y-auto shadow-md border-0">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-lg font-semibold">{title}</h2>
        <Button variant="ghost" size="sm" onClick={onReset} className="hover:bg-gray-100">
          <X className="w-4 h-4 mr-2" />
          Reset
        </Button>
      </div>

      <div className="space-y-6">
        {/* Sort Component - Displayed at the top if provided */}
        {sortComponent}

        {/* Price Range - Only show if showPriceFilter is true */}
        {showPriceFilter && priceRange && onPriceChange && (
          <div>
            <h3 className="text-sm font-medium mb-4">Price Range</h3>
            <Slider
              defaultValue={priceRange}
              max={type === 'food' ? 200 : 1000}
              step={type === 'food' ? 5 : 50}
              onValueChange={onPriceChange}
            />
            <div className="flex justify-between mt-2 text-sm text-muted-foreground">
              <span>${priceRange[0]}</span>
              <span>${priceRange[1]}</span>
            </div>
          </div>
        )}

        {/* Categories */}
        <div>
          <h3 className="text-sm font-medium mb-4">Categories</h3>
          <div className="space-y-3">
            {categories.map((category) => (
              <div key={category.id} className="flex items-center">
                <Checkbox
                  id={category.id}
                  checked={selectedCategories.includes(category.id)}
                  onCheckedChange={() => onCategoryChange(category.id)}
                />
                <label
                  htmlFor={category.id}
                  className="text-sm ml-2 flex-1 cursor-pointer"
                >
                  {category.label}
                </label>
                <span className="text-xs text-muted-foreground">
                  ({category.count})
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Amenities for stays */}
        {type === 'stay' && amenities && onAmenityChange && (
          <div>
            <h3 className="text-sm font-medium mb-4">Amenities</h3>
            <div className="space-y-3">
              {amenities.map((amenity) => (
                <div key={amenity.id} className="flex items-center">
                  <Checkbox
                    id={amenity.id}
                    checked={selectedAmenities?.includes(amenity.id)}
                    onCheckedChange={() => onAmenityChange(amenity.id)}
                  />
                  <label
                    htmlFor={amenity.id}
                    className="text-sm ml-2 flex-1 cursor-pointer"
                  >
                    {amenity.label}
                  </label>
                  <span className="text-xs text-muted-foreground">
                    ({amenity.count})
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </Card>
  );
};

export default FilterSidebar; 