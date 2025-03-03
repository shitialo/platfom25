import { User } from './auth';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

export interface ProfileData {
  name: string;
  email: string;
  phone: string;
  language: string;
  currency: string;
  timezone: string;
  bio?: string;
  image?: string;
}

export interface Booking {
  id: number;
  type: string;
  title: string;
  date: string;
  status: string;
  image: string;
}

export interface Favorite {
  id: number;
  type: string;
  title: string;
  price: string;
  image: string;
}

export interface SecuritySettings {
  emailNotifications: boolean;
  marketingCommunications: boolean;
  twoFactorEnabled: boolean;
  connectedAccounts: {
    google: boolean;
    facebook: boolean;
  };
}

// Get user profile data
export const getUserProfile = async (authHeader: { Authorization: string }): Promise<ProfileData> => {
  try {
    const response = await fetch(`${API_URL}/user/profile`, {
      headers: {
        ...authHeader,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error('Failed to fetch profile data');
    }

    return await response.json();
  } catch (error) {
    console.error('Error fetching profile data:', error);
    // Return default profile data if API fails
    return {
      name: '',
      email: '',
      phone: '',
      language: 'English',
      currency: 'USD',
      timezone: 'UTC-5',
    };
  }
};

// Update user profile data
export const updateUserProfile = async (
  profileData: Partial<ProfileData>,
  authHeader: { Authorization: string }
): Promise<ProfileData> => {
  const response = await fetch(`${API_URL}/user/profile`, {
    method: 'PUT',
    headers: {
      ...authHeader,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(profileData),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Failed to update profile');
  }

  return await response.json();
};

// Upload profile image
export const uploadProfileImage = async (
  file: File,
  authHeader: { Authorization: string }
): Promise<{ imageUrl: string }> => {
  const formData = new FormData();
  formData.append('image', file);

  const response = await fetch(`${API_URL}/user/profile/image`, {
    method: 'POST',
    headers: {
      ...authHeader,
    },
    body: formData,
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Failed to upload image');
  }

  return await response.json();
};

// Get user bookings
export const getUserBookings = async (authHeader: { Authorization: string }): Promise<Booking[]> => {
  try {
    const response = await fetch(`${API_URL}/user/bookings`, {
      headers: {
        ...authHeader,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error('Failed to fetch bookings');
    }

    return await response.json();
  } catch (error) {
    console.error('Error fetching bookings:', error);
    // Return mock data if API fails
    return [
      {
        id: 1,
        type: "Food Experience",
        title: "Jollof Rice",
        date: "2024-03-15",
        status: "upcoming",
        image: "/images/jollof.jpg",
      },
      {
        id: 2,
        type: "Stay",
        title: "Cozy Mountain Cabin",
        date: "2024-04-01",
        status: "upcoming",
        image: "/images/mountain.jpg",
      },
    ];
  }
};

// Get user favorites
export const getUserFavorites = async (authHeader: { Authorization: string }): Promise<Favorite[]> => {
  try {
    const response = await fetch(`${API_URL}/user/favorites`, {
      headers: {
        ...authHeader,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error('Failed to fetch favorites');
    }

    return await response.json();
  } catch (error) {
    console.error('Error fetching favorites:', error);
    // Return mock data if API fails
    return [
      {
        id: 1,
        type: "Food Experience",
        title: "Jollof Rice",
        price: "$45.50",
        image: "/images/jollof.jpg",
      },
      {
        id: 2,
        type: "Stay",
        title: "Mountain View",
        price: "$45.99/night",
        image: "/images/mountain.jpg",
      },
    ];
  }
};

// Get security settings
export const getSecuritySettings = async (authHeader: { Authorization: string }): Promise<SecuritySettings> => {
  try {
    const response = await fetch(`${API_URL}/user/security`, {
      headers: {
        ...authHeader,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error('Failed to fetch security settings');
    }

    return await response.json();
  } catch (error) {
    console.error('Error fetching security settings:', error);
    // Return default settings if API fails
    return {
      emailNotifications: false,
      marketingCommunications: false,
      twoFactorEnabled: false,
      connectedAccounts: {
        google: false,
        facebook: false,
      },
    };
  }
};

// Update security settings
export const updateSecuritySettings = async (
  settings: Partial<SecuritySettings>,
  authHeader: { Authorization: string }
): Promise<SecuritySettings> => {
  const response = await fetch(`${API_URL}/user/security`, {
    method: 'PUT',
    headers: {
      ...authHeader,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(settings),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Failed to update security settings');
  }

  return await response.json();
};

// Change password
export const changePassword = async (
  currentPassword: string,
  newPassword: string,
  authHeader: { Authorization: string }
): Promise<{ success: boolean; message: string }> => {
  const response = await fetch(`${API_URL}/user/password`, {
    method: 'PUT',
    headers: {
      ...authHeader,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ currentPassword, newPassword }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Failed to change password');
  }

  return await response.json();
};

// Remove favorite
export const removeFavorite = async (
  favoriteId: number,
  authHeader: { Authorization: string }
): Promise<{ success: boolean }> => {
  const response = await fetch(`${API_URL}/user/favorites/${favoriteId}`, {
    method: 'DELETE',
    headers: {
      ...authHeader,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Failed to remove favorite');
  }

  return { success: true };
};

// Connect social account
export const connectSocialAccount = async (
  provider: 'google' | 'facebook',
  authHeader: { Authorization: string }
): Promise<{ success: boolean; redirectUrl?: string }> => {
  const response = await fetch(`${API_URL}/user/connect/${provider}`, {
    method: 'GET',
    headers: {
      ...authHeader,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Failed to connect account');
  }

  return await response.json();
}; 