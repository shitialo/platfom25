import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

interface AuthUser {
  email: string;
  name: string;
  picture?: string;
  sub?: string;
  is_host?: boolean;
  provider: 'google' | 'email';
}

interface AuthContextType {
  user: AuthUser | null;
  isAuthenticated: boolean;
  loading: boolean;
  setUser: (user: AuthUser | null) => void;
  logout: () => void;
  loginWithEmail: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string) => Promise<void>;
  getAuthHeader: () => { Authorization: string } | undefined;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);

  const getAuthHeader = () => {
    const token = localStorage.getItem('authToken') || localStorage.getItem('googleToken');
    return token ? { Authorization: `Bearer ${token}` } : undefined;
  };

  useEffect(() => {
    // Check for stored user info on mount
    const storedUser = localStorage.getItem('user');
    const token = localStorage.getItem('authToken') || localStorage.getItem('googleToken');
    
    if (storedUser && token) {
      try {
        const parsedUser = JSON.parse(storedUser);
        setUser(parsedUser);
        setIsAuthenticated(true);
      } catch (error) {
        console.error('Error parsing stored user:', error);
        localStorage.removeItem('user');
        localStorage.removeItem('authToken');
        localStorage.removeItem('googleToken');
      }
    }
    setLoading(false);
  }, []);

  const setUserAndPersist = (newUser: AuthUser | null) => {
    setUser(newUser);
    setIsAuthenticated(!!newUser);
    if (newUser) {
      localStorage.setItem('user', JSON.stringify(newUser));
    } else {
      localStorage.removeItem('user');
      localStorage.removeItem('authToken');
      localStorage.removeItem('googleToken');
    }
  };

  const loginWithEmail = async (email: string, password: string) => {
    try {
      const response = await fetch(`${API_URL}/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to login');
      }

      const data = await response.json();
      
      // Store the JWT token
      localStorage.setItem('authToken', data.token);

      // Create user object
      const user: AuthUser = {
        email: data.user.email,
        name: data.user.name,
        is_host: data.user.is_host,
        provider: 'email'
      };

      setUserAndPersist(user);
    } catch (error) {
      console.error('Login error:', error);
      throw error;
    }
  };

  const register = async (name: string, email: string, password: string) => {
    try {
      const response = await fetch(`${API_URL}/auth/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ name, email, password }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to register');
      }

      const data = await response.json();
      
      // Store the JWT token
      localStorage.setItem('authToken', data.token);

      // Create user object
      const user: AuthUser = {
        email: data.user.email,
        name: data.user.name,
        is_host: data.user.is_host,
        provider: 'email'
      };

      setUserAndPersist(user);
    } catch (error) {
      console.error('Registration error:', error);
      throw error;
    }
  };

  const logout = () => {
    localStorage.removeItem('authToken');
    localStorage.removeItem('googleToken');
    localStorage.removeItem('user');
    setUser(null);
    setIsAuthenticated(false);
  };

  const refreshUser = async () => {
    try {
      const headers = getAuthHeader();
      if (!headers) return;

      const response = await fetch(`${API_URL}/auth/me`, {
        headers
      });

      if (!response.ok) throw new Error('Failed to refresh user data');

      const userData = await response.json();
      setUserAndPersist({
        email: userData.email,
        name: userData.name,
        picture: userData.picture,
        is_host: userData.is_host,
        provider: userData.provider || 'email'
      });
    } catch (error) {
      console.error('Error refreshing user data:', error);
    }
  };

  return (
    <AuthContext.Provider value={{ 
      user, 
      isAuthenticated, 
      loading, 
      setUser: setUserAndPersist,
      loginWithEmail,
      register,
      getAuthHeader, 
      logout,
      refreshUser 
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
} 