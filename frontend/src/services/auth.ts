import { LoginCredentials, RegisterData, AuthResponse } from '@/api/auth';

const API_URL = import.meta.env.VITE_API_URL;

export const authService = {
  async login(credentials: LoginCredentials): Promise<AuthResponse> {
    const response = await fetch(`${API_URL}/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(credentials),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Login failed');
    }

    const data = await response.json();
    if (data.user) {
      data.user.is_host = Boolean(data.user.is_host);
    }
    localStorage.setItem('token', data.token);
    return data;
  },

  async register(data: RegisterData): Promise<AuthResponse> {
    if (!data.name || !data.email || !data.password) {
      throw new Error('Name, email, and password are required');
    }

    const response = await fetch(`${API_URL}/auth/register`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });

    const responseData = await response.json();

    if (!response.ok) {
      throw new Error(responseData.message || 'Failed to register');
    }

    localStorage.setItem('token', responseData.token);
    return responseData;
  },

  async getCurrentUser() {
    const token = localStorage.getItem('token');
    if (!token) return null;

    const response = await fetch(`${API_URL}/auth/me`, {
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      localStorage.removeItem('token');
      return null;
    }

    const data = await response.json();
    return data.user;
  },

  async logout(): Promise<void> {
    const token = localStorage.getItem('token');
    if (!token) return;

    try {
      await fetch(`${API_URL}/auth/logout`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      localStorage.removeItem('token');
    }
  },
}; 