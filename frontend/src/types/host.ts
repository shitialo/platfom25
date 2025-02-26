export interface FoodExperience {
  id?: number;
  title: string;
  description: string;
  location_name: string;
  price_per_person: number;
  cuisine_type: string;
  menu_description: string;
  status: 'draft' | 'published' | 'archived';
  images: string[];
  availability: FoodAvailability[];
  created_at?: string;
  updated_at?: string;
}

export interface FoodAvailability {
  id?: number;
  date: string;
  start_time: string;
  end_time: string;
  available_slots: number;
}

export interface Stay {
  id?: number;
  title: string;
  description: string;
  location_name: string;
  price_per_night: number;
  max_guests: number;
  bedrooms: number;
  status: 'draft' | 'published' | 'archived';
  images: { url: string; order: number }[];
  amenities?: number[];
  created_at?: string;
  updated_at?: string;
}

export interface StayAvailability {
  id?: number;
  date: string;
  is_available: boolean;
  price_override?: number;
} 