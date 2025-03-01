import { useState, useEffect } from "react";
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
import { useToast } from "@/components/ui/use-toast";
import { useNavigate, useParams } from "react-router-dom";
import { FoodExperience } from "@/types/host";
import ImageUpload from "@/components/ImageUpload";
import DateTimePicker from "@/components/DateTimePicker";
import { useAuth } from "@/contexts/AuthContext";
import { MapLocationPicker } from '@/components/form/MapLocationPicker';
import { Loader2 } from "lucide-react";

const formSchema = z.object({
  title: z.string().min(1, "Title is required"),
  description: z.string().min(1, "Description is required"),
  location_name: z.string().min(1, "Location is required"),
  price_per_person: z.string().min(1, "Price is required"),
  cuisine_type: z.string().min(1, "Cuisine type is required"),
  menu_description: z.string().min(1, "Menu description is required"),
  images: z.array(z.string()),
  status: z.enum(["draft", "published"]),
  address: z.string().min(1, "Address is required"),
  zipcode: z.string().min(1, "Zipcode is required"),
  city: z.string().min(1, "City is required"),
  state: z.string().min(1, "State is required"),
  latitude: z.number(),
  longitude: z.number()
});

type FormData = z.infer<typeof formSchema>;

interface Location {
  address: string;
  zipcode: string;
  city: string;
  state: string;
  latitude: number;
  longitude: number;
  displayLocation?: string;
}

const HostFood = () => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const { id } = useParams();
  const isEditing = Boolean(id);
  const [loading, setLoading] = useState(false);
  const [images, setImages] = useState<string[]>([]);
  const { getAuthHeader, refreshUser } = useAuth();
  const [location, setLocation] = useState<Location>({
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
      price_per_person: "",
      cuisine_type: "",
      menu_description: "",
      images: [],
      status: "draft",
      address: '',
      zipcode: '',
      city: '',
      state: '',
      latitude: 0,
      longitude: 0
    }
  });

  const getFullImageUrl = (url: string) => {
    if (!url) return '/default-food.jpg';
    if (url.startsWith('http')) return url;
    return `${import.meta.env.VITE_API_URL}/${url}`;
  };

  useEffect(() => {
    if (id) {
      const fetchExperience = async () => {
        try {
          const headers = getAuthHeader();
          if (!headers) {
            throw new Error('Not authenticated');
          }

          const response = await fetch(`${import.meta.env.VITE_API_URL}/host/food-experiences/${id}`, {
            headers: {
              ...headers
            }
          });

          if (!response.ok) throw new Error('Failed to fetch experience');

          const data = await response.json();
          
          // Process the images URLs
          const processedImages = data.images.map((img: string) => getFullImageUrl(img));
          setImages(processedImages);
          
          form.reset({
            title: data.title,
            description: data.description,
            location_name: data.location_name,
            price_per_person: data.price_per_person.toString(),
            cuisine_type: data.cuisine_type,
            menu_description: data.menu_description,
            images: processedImages,
            status: data.status,
            address: data.address,
            zipcode: data.zipcode,
            city: data.city,
            state: data.state,
            latitude: data.latitude,
            longitude: data.longitude
          });

          // Update location state
          setLocation({
            address: data.address,
            zipcode: data.zipcode,
            city: data.city,
            state: data.state,
            latitude: data.latitude,
            longitude: data.longitude,
            displayLocation: data.location_name
          });
        } catch (error) {
          console.error('Error:', error);
          toast({
            title: "Error",
            description: "Failed to fetch experience",
            variant: "destructive",
          });
        }
      };

      fetchExperience();
    }
  }, [id, form, getAuthHeader]);

  useEffect(() => {
    if (location.address) {
      form.setValue('address', location.address);
      form.setValue('zipcode', location.zipcode);
      form.setValue('city', location.city);
      form.setValue('state', location.state);
      form.setValue('latitude', location.latitude);
      form.setValue('longitude', location.longitude);
    }
  }, [location, form]);

  useEffect(() => {
    console.log('Current location:', location);
  }, [location]);

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
        price_per_person: parseFloat(data.price_per_person),
        address: location.address,
        zipcode: location.zipcode,
        city: location.city,
        state: location.state,
        latitude: location.latitude,
        longitude: location.longitude,
        location_name: location.displayLocation || `${location.city}, ${location.state}`
      };

      // Debug logs
      console.log('Form Data:', data);
      console.log('Location Data:', location);
      console.log('Data to Send:', dataToSend);
      
      Object.entries(dataToSend).forEach(([key, value]) => {
        formData.append(key, value?.toString() || '');
        // Debug log for each field
        console.log(`Adding to FormData - ${key}:`, value);
      });

      const url = id 
        ? `${import.meta.env.VITE_API_URL}/host/food-experiences/${id}`
        : `${import.meta.env.VITE_API_URL}/host/food-experiences`;

      // Log the final FormData
      console.log('Final FormData entries:');
      for (let pair of formData.entries()) {
        console.log(pair[0], pair[1]);
      }

      const response = await fetch(url, {
        method: id ? 'PUT' : 'POST',
        headers: {
          ...headers
        },
        body: formData
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error('Server Error Response:', errorData);
        throw new Error(errorData.message || 'Failed to save experience');
      }

      const responseData = await response.json();
      console.log('Response:', responseData);

      // Refresh user data to update host status
      await refreshUser();

      toast({
        title: "Success",
        description: `Food experience ${id ? 'updated' : 'created'} successfully`,
      });

      navigate('/host/dashboard');
    } catch (error) {
      console.error('Error:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : 'Failed to save experience',
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
        {id ? 'Edit Food Experience' : 'Create Food Experience'}
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
                      <Input placeholder="Amazing Local Cooking Class" {...field} />
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
                        placeholder="Describe your food experience..."
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
                name="price_per_person"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Price per Person</FormLabel>
                    <FormControl>
                      <Input 
                        type="number" 
                        placeholder="49.99"
                        {...field}
                        onChange={(e) => field.onChange(e.target.value)}
                        value={field.value}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="space-y-6">
              <FormField
                control={form.control}
                name="cuisine_type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Cuisine Type</FormLabel>
                    <FormControl>
                      <Input placeholder="Italian, Japanese, etc." {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="menu_description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Menu Description</FormLabel>
                    <FormControl>
                      <Textarea 
                        placeholder="Describe the dishes and menu..."
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
                        title={form.getValues("title") || "food-experience"}
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
                    setLocation(newLocation);
                    form.setValue('location_name', newLocation.displayLocation);
                  }}
                  error={form.formState.errors.address?.message}
                />
                {!location.address && (
                  <p className="text-sm text-red-500">
                    Please select a location to publish
                  </p>
                )}
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
                id ? "Update Experience" : "Publish Experience"
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

export default HostFood;