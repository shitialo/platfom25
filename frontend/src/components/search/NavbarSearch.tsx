import { useState } from 'react';
import { Search } from 'lucide-react';
import { Button } from '../ui/button';
import LocationSearch from './LocationSearch';
import {
  Dialog,
  DialogContent,
  DialogTrigger,
} from "@/components/ui/dialog";

export const NavbarSearch = () => {
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button 
          variant="outline" 
          className="w-[300px] justify-start text-left font-normal"
        >
          <Search className="mr-2 h-4 w-4" />
          <span>Search locations...</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[600px]">
        <LocationSearch onLocationSelect={() => setOpen(false)} />
      </DialogContent>
    </Dialog>
  );
}; 