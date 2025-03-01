export const mockFoodExperiences = [
  {
    id: '1',
    title: 'Kenyan Chapati',
    description: 'Warm, soft flatbread with crispy edges. Tear it apart and dip into stews or eat it plain. Tastes like home!',
    category: 'african',
    image: '/images/chapati.jpg',
    price: '$10',
    rating: 4.8,
    type: 'food' as const,
    host: {
      name: 'Maria G.',
      image: '/images/maria.jpg',
      rating: 4.9,
      reviews: 124,
    },
    details: {
      duration: '3 hours',
      groupSize: '2-6 people',
      includes: ['All ingredients', 'Wine pairing', 'Recipe booklet'],
      language: 'English',
      location: 'Little Italy, NYC',
    }
  },
  {
    id: '2',
    title: 'Traditional Sushi ',
    description: 'Fresh fish on soft rice. Light, clean, and perfect with soy sauce. Feels like a bite of the sea.',
    category: 'japanese',
    image: '/images/sushi.jpg',
    price: '$25',
    rating: 4.9,
    type: 'food' as const,
    host: {
      name: 'Kenji T.',
      image: '/images/kenji.jpg',
      rating: 4.9,
      reviews: 98,
    },
    details: {
      duration: '2.5 hours',
      groupSize: '2-4 people',
      includes: ['Fresh ingredients', 'Sake tasting', 'Sushi kit'],
      language: 'English, Japanese',
      location: 'East Village, NYC',
    }
  },
  {
    id: '3',
    title: 'Ghananian Jollof Rice',
    description: 'Spicy tomato rice with smoky flavor. Eat with fried plantains for sweet and spicy goodness. So good, you will lick the plate!',
    category: 'african',
    image: '/images/jollof.jpg',
    price: '$15',
    rating: 4.7,
    type: 'food' as const,
    host: {
      name: 'Diane R.',
      image: '/images/diane.jpg',
      rating: 4.8,
      reviews: 86,
    },
    details: {
      duration: '3 hours',
      groupSize: '4-8 people',
      includes: ['All ingredients', 'Spanish wine', 'Recipe collection'],
      language: 'English, Spanish',
      location: 'Chelsea, NYC',
    }
  },
  // Add more experiences...
];

export const mockStays = [
  {
    id: '1',
    title: 'Mountain View Cabin',
    description: 'Escape to this peaceful cabin with stunning mountain views and modern amenities.',
    image: '/images/mountain.jpg',
    price: '$150/night',
    rating: 4.9,
    type: 'stay' as const,
    host: {
      name: 'Roberta M.',
      image: '/images/robert.jpg',
      rating: 4.9,
      reviews: 156,
    },
    details: {
      bedrooms: 2,
      beds: 3,
      bathrooms: 2,
      maxGuests: 6,
      amenities: [
        'Full Kitchen',
        'Hot Tub',
        'WiFi',
        'Mountain View',
        'Free Parking',
        'Air Conditioning'
      ],
      location: 'Catskills, NY'
    }
  },
  {
    id: '2',
    title: 'Beachfront Villa',
    description: 'Luxurious villa with direct beach access and panoramic ocean views.',
    image: '/images/beach.jpg',
    price: '$280/night',
    rating: 4.8,
    type: 'stay' as const,
    host: {
      name: 'Sarah L.',
      image: '/images/sarah.jpg',
      rating: 4.9,
      reviews: 203,
    },
    details: {
      bedrooms: 3,
      beds: 4,
      bathrooms: 3,
      maxGuests: 8,
      amenities: [
        'Private Beach',
        'Pool',
        'Full Kitchen',
        'WiFi',
        'Ocean View',
        'Air Conditioning'
      ],
      location: 'Hamptons, NY'
    }
  },
  {
    id: '3',
    title: 'Modern Urban Loft',
    description: 'Stylish loft in the heart of the city with stunning skyline views.',
    image: '/images/loft.jpg',
    price: '$175/night',
    rating: 4.7,
    type: 'stay' as const,
    host: {
      name: 'Michael P.',
      image: '/images/mike.jpg',
      rating: 4.8,
      reviews: 167,
    },
    details: {
      bedrooms: 1,
      beds: 2,
      bathrooms: 1,
      maxGuests: 4,
      amenities: [
        'City View',
        'WiFi',
        'Gym Access',
        'Full Kitchen',
        'Workspace',
        'Air Conditioning'
      ],
      location: 'Manhattan, NYC'
    }
  }
];

export const categories = [
  {
    id: 'african',
    title: 'African Cuisine',
    image: '/images/african.jpg',
    count: 245,
  },
  {
    id: 'japanese',
    title: 'Japanese Cuisine',
    image: '/images/japanese.jpg',
    count: 189,


  },
  {
    id: 'european',
    title: 'European Cuisine',
    image: '/images/european.jpg',
    count: 167,
  },

  {
    id: 'asian',
    title: 'Asian Cuisine',
    image: '/images/asian.jpg',
    count: 156,
  },

  {
    id: 'italian',
    title: 'Italian Cuisine',
    image: '/images/italian.jpg',
    count: 178,
  },

  {
    id: 'french',
    title: 'French Cuisine',
    image: '/images/french.jpg',
    count: 134,
  },
  {
    id: 'south-american',
    title: 'South American Cuisine',
    image: '/images/south-american.jpg',
    count: 145,
  },

  
]; 