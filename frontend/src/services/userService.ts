import { apiClient } from './apiClient';

export const userService = {
  // Profile
  getProfile: async () => {
    try {
      const response = await apiClient.get('/api/user/profile');
      return response.data;
    } catch (error) {
      console.error('Error fetching profile data:', error);
      throw new Error('Failed to fetch profile data');
    }
  },
  
  updateProfile: async (profileData: any) => {
    try {
      const response = await apiClient.put('/api/user/profile', profileData);
      return response.data;
    } catch (error) {
      console.error('Error updating profile data:', error);
      throw new Error('Error updating profile data');
    }
  },
  
  uploadProfileImage: async (formData: FormData) => {
    try {
      const response = await apiClient.post('/api/user/profile/image', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      return response.data;
    } catch (error) {
      console.error('Error uploading profile image:', error);
      throw new Error('Error uploading profile image');
    }
  },
  
  // Bookings
  getBookings: async () => {
    try {
      const response = await apiClient.get('/api/user/bookings');
      return response.data;
    } catch (error) {
      console.error('Error fetching bookings:', error);
      throw new Error('Failed to fetch bookings');
    }
  },
  
  addBooking: async (bookingData: any) => {
    try {
      const response = await apiClient.post('/api/user/bookings', bookingData);
      return response.data;
    } catch (error) {
      console.error('Error creating booking:', error);
      throw new Error('Failed to create booking');
    }
  },
  
  // Favorites
  getFavorites: async () => {
    try {
      const response = await apiClient.get('/api/user/favorites');
      return response.data;
    } catch (error) {
      console.error('Error fetching favorites:', error);
      throw new Error('Failed to fetch favorites');
    }
  },
  
  addFavorite: async (listingId: number) => {
    try {
      const response = await apiClient.post('/api/user/favorites', { listing_id: listingId });
      return response.data;
    } catch (error) {
      console.error('Error adding favorite:', error);
      throw new Error('Failed to add favorite');
    }
  },
  
  removeFavorite: async (favoriteId: number) => {
    try {
      const response = await apiClient.delete(`/api/user/favorites/${favoriteId}`);
      return response.data;
    } catch (error) {
      console.error('Error removing favorite:', error);
      throw new Error('Failed to remove favorite');
    }
  },
  
  // Security
  getSecuritySettings: async () => {
    try {
      const response = await apiClient.get('/api/user/security');
      return response.data;
    } catch (error) {
      console.error('Error fetching security settings:', error);
      throw new Error('Failed to fetch security settings');
    }
  },
  
  updateSecuritySettings: async (securityData: any) => {
    try {
      const response = await apiClient.put('/api/user/security', securityData);
      return response.data;
    } catch (error) {
      console.error('Error updating security settings:', error);
      throw new Error('Failed to update security settings');
    }
  },
  
  changePassword: async (passwordData: any) => {
    try {
      const response = await apiClient.put('/api/user/password', passwordData);
      return response.data;
    } catch (error) {
      console.error('Error changing password:', error);
      throw new Error('Failed to change password');
    }
  },
  
  connectSocialAccount: async (provider: string) => {
    try {
      const response = await apiClient.get(`/api/user/connect/${provider}`);
      return response.data;
    } catch (error) {
      console.error(`Error connecting ${provider} account:`, error);
      throw new Error(`Failed to connect ${provider} account`);
    }
  },
  
  // Listings
  getListings: async () => {
    try {
      const response = await apiClient.get('/api/user/listings');
      return response.data;
    } catch (error) {
      console.error('Error fetching listings:', error);
      throw new Error('Failed to fetch listings');
    }
  }
}; 