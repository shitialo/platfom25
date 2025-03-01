import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/use-toast";
import ImageUpload from "@/components/ImageUpload";
import { useAuth } from "@/contexts/AuthContext";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { Calendar as CalendarIcon, Loader2 } from "lucide-react";
import { AmenitiesSelect } from "@/components/AmenitiesSelect";
import { MapLocationPicker } from '@/components/form/MapLocationPicker';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const formSchema = z.object({
  title: z.string().min(1, "Title is required"),
  description: z.string().min(1, "Description is required"),
  location_name: z.string().min(1, "Location is required"),
  price_per_night: z.number().min(0, "Price must be positive"),
  max_guests: z.number().min(1, "Must have at least 1 guest"),
  bedrooms: z.number().min(1, "Must have at least 1 bedroom"),
  beds: z.number().min(1, "Must have at least 1 bed"),
  bathrooms: z.number().min(1, "Must have at least 1 bathroom"),
  images: z.array(z.string()),
  status: z.enum(["draft", "published"]),
  amenities: z.array(z.number()),
  availability: z.array(z.object({
    date: z.string(),
    is_available: z.boolean(),
    price_override: z.number().optional()
  })),
  address: z.string().min(1, "Address is required"),
  zipcode: z.string().min(1, "Zipcode is required"),
  city: z.string().min(1, "City is required"),
  state: z.string().min(1, "State is required"),
  latitude: z.number(),
  longitude: z.number(),
  property_type: z.string().min(1, "Property type is required"),
});

type FormData = z.infer<typeof formSchema>;

interface Amenity {
  id: string;
  name: string;
}

// Property types with more relevant categories for individual hosts
const propertyTypes = [
  { id: 'room', label: 'Private Room', description: 'A private room in a home' },
  { id: 'apartment', label: 'Apartment', description: 'An entire apartment' },
  { id: 'house', label: 'House', description: 'An entire house' },
  { id: 'cabin', label: 'Cabin', description: 'A cozy cabin retreat' },
  { id: 'cottage', label: 'Cottage', description: 'A charming cottage' },
  { id: 'guesthouse', label: 'Guesthouse', description: 'A separate guesthouse' },
];

const HostStay = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { getAuthHeader, refreshUser } = useAuth();
  const [loading, setLoading] = useState(false);
  const [images, setImages] = useState<string[]>([]);
  const [selectedDates, setSelectedDates] = useState<Date[]>([]);
  const [selectedAmenities, setSelectedAmenities] = useState<Amenity[]>([]);
  const [location, setLocation] = useState({
    address: '',
    zipcode: '',
    city: '',
    state: '',
    latitude: 0,
    longitude: 0,
    displayLocation: ''
  });

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: "",
      description: "",
      location_name: "",
      price_per_night: 0,
      max_guests: 1,
      bedrooms: 1,
      beds: 1,
      bathrooms: 1,
      images: [],
      status: "draft",
      amenities: [],
      availability: [],
      address: '',
      zipcode: '',
      city: '',
      state: '',
      latitude: 0,
      longitude: 0,
      property_type: 'house'
    }
  });

  const getFullImageUrl = (url: string) => {
    if (!url) return '/default-stay.jpg';
    if (url.startsWith('http')) return url;
    return `${import.meta.env.VITE_API_URL}/${url}`;
  };

  useEffect(() => {
    if (id) {
      const fetchStay = async () => {
        try {
          const headers = getAuthHeader();
          if (!headers) {
            throw new Error('Not authenticated');
          }

          const response = await fetch(`${import.meta.env.VITE_API_URL}/host/stays/${id}`, {
            headers: {
              ...headers
            }
          });

          if (!response.ok) throw new Error('Failed to fetch stay');

          const data = await response.json();
          
          // Process the images URLs
          const processedImages = data.images.map((img: any) => 
            typeof img === 'string' ? getFullImageUrl(img) : getFullImageUrl(img.url)
          );
          setImages(processedImages);
          
          form.reset({
            title: data.title,
            description: data.description,
            location_name: data.location_name,
            price_per_night: parseFloat(data.price_per_night),
            max_guests: parseInt(data.max_guests),
            bedrooms: parseInt(data.bedrooms),
            beds: parseInt(data.beds) || parseInt(data.bedrooms),
            bathrooms: parseInt(data.bathrooms) || 1,
            images: processedImages,
            status: data.status,
            amenities: data.amenities.map((a: any) => 
              typeof a === 'object' ? a.id.toString() : a.toString()
            ),
            availability: data.availability,
            address: data.address,
            zipcode: data.zipcode,
            city: data.city,
            state: data.state,
            latitude: parseFloat(data.latitude),
            longitude: parseFloat(data.longitude),
            property_type: data.property_type || 'house'
          });

          // Update location state
          setLocation({
            address: data.address,
            zipcode: data.zipcode,
            city: data.city,
            state: data.state,
            latitude: parseFloat(data.latitude),
            longitude: parseFloat(data.longitude),
            displayLocation: data.location_name
          });
        } catch (error) {
          console.error('Error:', error);
          toast({
            title: "Error",
            description: "Failed to fetch stay",
            variant: "destructive",
          });
        }
      };

      fetchStay();
    }
  }, [id, form, getAuthHeader]);

  useEffect(() => {
    const fetchAmenities = async () => {
      try {
        const response = await fetch(`${import.meta.env.VITE_API_URL}/host/amenities?type=stay`);
        if (!response.ok) throw new Error('Failed to fetch amenities');
        const data = await response.json();
        setSelectedAmenities([]);
      } catch (error) {
        console.error('Error:', error);
        setSelectedAmenities([]);
      }
    };

    fetchAmenities();
  }, []);

  useEffect(() => {
    if (location.address) {
      form.setValue('address', location.address);
      form.setValue('zipcode', location.zipcode);
      form.setValue('city', location.city);
      form.setValue('state', location.state);
      form.setValue('latitude', location.latitude);
      form.setValue('longitude', location.longitude);
      form.setValue('location_name', location.displayLocation);
    }
  }, [location, form]);

  const onSubmit = async (data: FormData) => {
    if (!location.address) {
      toast({
        title: "Error",
        description: "Please select a location",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      const headers = getAuthHeader();
      if (!headers) {
        throw new Error('Not authenticated');
      }

      const formData = new FormData();
      
      const dataToSend = {
        ...data,
        address: location.address,
        zipcode: location.zipcode,
        city: location.city,
        state: location.state,
        latitude: location.latitude,
        longitude: location.longitude,
        location_name: location.displayLocation || `${location.city}, ${location.state}`
      };

      // Add regular form fields
      Object.entries(dataToSend).forEach(([key, value]) => {
        if (key === 'amenities' && Array.isArray(value)) {
          formData.append(key, JSON.stringify(value));
        } else if (key === 'availability' && Array.isArray(value)) {
          formData.append(key, JSON.stringify(value));
        } else if (key !== 'images') { // Skip images in the regular form data
          formData.append(key, value?.toString() || '');
        }
      });

      // Handle images separately
      if (data.images && data.images.length > 0) {
        // For existing images that are URLs or uploaded paths, pass them as a JSON string
        const existingImages = data.images.filter(img => 
          img.startsWith('http') || img.startsWith('/uploads/')
        );
        if (existingImages.length > 0) {
          formData.append('existing_images', JSON.stringify(existingImages));
          console.log('Existing images:', existingImages);
        }
        
        // For new file uploads, append each file to the FormData
        const newImageFiles = data.images.filter(img => 
          !img.startsWith('http') && !img.startsWith('/uploads/')
        );
        console.log('New images to process:', newImageFiles.length);
        if (newImageFiles.length > 0) {
          newImageFiles.forEach((file: File | string, index) => {
            // Check if the file is already a File object
            if (typeof File !== 'undefined' && file instanceof File) {
              formData.append('images', file);
              console.log('Appending File object:', file.name);
            } 
            // Check if it's a base64 string
            else if (typeof file === 'string' && file.includes('base64')) {
              try {
                const base64Data = file.split(',')[1];
                const mimeType = file.split(',')[0].split(':')[1].split(';')[0];
                const byteCharacters = atob(base64Data);
                const byteArrays = [];
                
                for (let i = 0; i < byteCharacters.length; i++) {
                  byteArrays.push(byteCharacters.charCodeAt(i));
                }
                
                const byteArray = new Uint8Array(byteArrays);
                const blob = new Blob([byteArray], { type: mimeType });
                const fileObject = new File([blob], `image_${index}.jpg`, { type: mimeType });
                
                formData.append('images', fileObject);
                console.log('Appended converted base64 to File:', fileObject.name, fileObject.type, fileObject.size);
              } catch (e) {
                console.error('Error processing base64 image:', e);
                // Skip this file if there's an error processing it
                return;
              }
            } else {
              console.warn('Skipping invalid image data:', typeof file);
            }
          });
        }
      }

      console.log('Submitting form data:', Object.fromEntries(formData));

      const url = id 
        ? `${import.meta.env.VITE_API_URL}/host/stays/${id}`
        : `${import.meta.env.VITE_API_URL}/host/stays`;

      const response = await fetch(url, {
        method: id ? 'PUT' : 'POST',
        headers: {
          ...headers
        },
        body: formData
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to save stay');
      }

      const responseData = await response.json();
      console.log('Response data:', responseData);

      // Refresh user data to update host status
      await refreshUser();

      toast({
        title: "Success",
        description: `Stay ${id ? 'updated' : 'created'} successfully`,
      });

      navigate('/host/dashboard');
    } catch (error) {
      console.error('Error saving stay:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to save stay",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handlePublish = () => {
    form.setValue('status', 'published');
    form.handleSubmit(onSubmit)();
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <h1 className="text-3xl font-bold mb-8">
        {id ? 'Edit Stay' : 'Create Stay'}
      </h1>
      
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-6">
              <FormField
                control={form.control}
                name="title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Title</FormLabel>
                    <FormControl>
                      <Input placeholder="Cozy Beach House" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description</FormLabel>
                    <FormControl>
                      <Textarea 
                        placeholder="Describe your property..."
                        className="h-32"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="location_name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Location Display Name</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="Will be auto-filled from map selection" 
                        {...field} 
                        readOnly 
                        className="bg-gray-50"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="property_type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Property Type</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select a property type" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {propertyTypes.map((type) => (
                          <SelectItem key={type.id} value={type.id}>
                            {type.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="price_per_night"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Price per Night</FormLabel>
                      <FormControl>
                        <Input 
                          type="number" 
                          placeholder="99.99"
                          {...field}
                          onChange={(e) => field.onChange(Number(e.target.value))}
                          value={field.value}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="max_guests"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Max Guests</FormLabel>
                      <FormControl>
                        <Input 
                          type="number" 
                          min="1"
                          {...field}
                          onChange={(e) => field.onChange(Number(e.target.value))}
                          value={field.value}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="bedrooms"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Bedrooms</FormLabel>
                      <FormControl>
                        <Input 
                          type="number"
                          min="1"
                          {...field}
                          onChange={(e) => field.onChange(Number(e.target.value))}
                          value={field.value}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="beds"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Beds</FormLabel>
                      <FormControl>
                        <Input 
                          type="number"
                          min="1"
                          {...field}
                          onChange={(e) => field.onChange(Number(e.target.value))}
                          value={field.value}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="bathrooms"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Bathrooms</FormLabel>
                      <FormControl>
                        <Input 
                          type="number"
                          min="1"
                          step="0.5"
                          {...field}
                          onChange={(e) => field.onChange(Number(e.target.value))}
                          value={field.value}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            <div className="space-y-6">
              <div className="space-y-4">
                <Label>Amenities</Label>
                <AmenitiesSelect
                  selectedAmenities={selectedAmenities}
                  onAmenitiesChange={(amenities) => {
                    setSelectedAmenities(amenities);
                    form.setValue('amenities', amenities.map(a => Number(a.id)));
                  }}
                />
              </div>

              <FormField
                control={form.control}
                name="images"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Images</FormLabel>
                    <FormControl>
                      <ImageUpload
                        value={field.value}
                        onChange={field.onChange}
                        onRemove={(url) => {
                          field.onChange(field.value.filter((val) => val !== url));
                        }}
                        title={form.getValues("title") || "stay"}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="space-y-2">
                <FormLabel>Location</FormLabel>
                <MapLocationPicker
                  value={location}
                  onChange={(newLocation) => {
                    console.log('Location selected:', newLocation);
                    setLocation({
                      ...newLocation,
                      displayLocation: newLocation.displayLocation || `${newLocation.city}, ${newLocation.state}`
                    });
                    form.setValue('location_name', newLocation.displayLocation || `${newLocation.city}, ${newLocation.state}`);
                  }}
                  error={form.formState.errors.address?.message}
                />
                {!location.address && (
                  <p className="text-sm text-red-500">
                    Please select a location to publish
                  </p>
                )}
              </div>

              <div className="space-y-4">
                <Label>Availability</Label>
                <div className="flex space-x-4">
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline">
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        Select Dates
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <Calendar
                        mode="multiple"
                        selected={selectedDates}
                        onSelect={setSelectedDates}
                        className="rounded-md border"
                      />
                    </PopoverContent>
                  </Popover>
                </div>
                
                <div className="space-y-2">
                  {selectedDates.map((date) => (
                    <div key={date.toISOString()} className="flex items-center space-x-4">
                      <span>{format(date, 'PPP')}</span>
                      <Input
                        type="number"
                        placeholder="Price override"
                        className="w-32"
                        onChange={(e) => {
                          const availability = form.getValues('availability') || [];
                          const newAvailability = [
                            ...availability,
                            {
                              date: format(date, 'yyyy-MM-dd'),
                              is_available: true,
                              price_override: Number(e.target.value)
                            }
                          ];
                          form.setValue('availability', newAvailability);
                        }}
                      />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div className="flex justify-end space-x-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                form.setValue('status', 'draft');
                form.handleSubmit(onSubmit)();
              }}
              disabled={loading}
            >
              Save as Draft
            </Button>
            <Button
              type="button"
              onClick={handlePublish}
              disabled={loading || !location.address}
              className="bg-primary hover:bg-primary/90"
            >
              {loading ? (
                <div className="flex items-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  {id ? "Updating..." : "Publishing..."}
                </div>
              ) : (
                id ? "Update Stay" : "Publish Stay"
              )}
            </Button>
          </div>
        </form>
      </Form>

      {process.env.NODE_ENV === 'development' && (
        <div className="mt-8 p-4 bg-gray-100 rounded-lg">
          <p className="font-mono text-sm">
            Location: {JSON.stringify(location, null, 2)}
          </p>
        </div>
      )}
    </div>
  );
};

export default HostStay;