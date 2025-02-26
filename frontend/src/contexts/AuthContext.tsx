import { createContext, useContext, useState, useEffect } from 'react';
import { User } from '@/api/auth';
import { authService } from '@/services/auth';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string) => Promise<void>;
  logout: () => void;
  checkAuth: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const updateUser = (newUser: User | null) => {
    console.log('Updating user in AuthContext:', newUser);
    setUser(newUser);
  };

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    const token = localStorage.getItem('token');
    console.log('Checking auth with token:', token?.substring(0, 10) + '...');
    
    if (token) {
      try {
        const response = await fetch(`${import.meta.env.VITE_API_URL}/auth/me`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        if (response.ok) {
          const data = await response.json();
          console.log('Auth check response:', data);
          data.is_host = Boolean(data.is_host);
          console.log('User data after boolean conversion:', data);
          updateUser(data);
        } else {
          console.log('Auth check failed with status:', response.status);
          localStorage.removeItem('token');
          updateUser(null);
        }
      } catch (error) {
        console.error('Auth check failed:', error);
        localStorage.removeItem('token');
        updateUser(null);
      }
    } else {
      updateUser(null);
    }
    setLoading(false);
  };

  const login = async (email: string, password: string) => {
    try {
      const response = await authService.login({ email, password });
      console.log('Login response:', response);
      if (response.user) {
        response.user.is_host = Boolean(response.user.is_host);
        console.log('User data after login:', response.user);
      }
      updateUser(response.user);
      await checkAuth();
    } catch (error) {
      console.error('Login failed:', error);
    }
  };

  const register = async (name: string, email: string, password: string) => {
    if (!name || !email || !password) {
      throw new Error('All fields are required');
    }
    
    try {
      const { user } = await authService.register({ name, email, password });
      if (user) {
        user.is_host = Boolean(user.is_host);
        console.log('User data after registration:', user);
      }
      updateUser(user);
      await checkAuth();
    } catch (error) {
      console.error('Registration failed:', error);
    }
  };

  const logout = async () => {
    setLoading(true);
    try {
      await authService.logout();
    } catch (error) {
      console.error('Logout failed:', error);
    } finally {
      localStorage.removeItem('token');
      updateUser(null);
      setLoading(false);
    }
  };

  return (
    <AuthContext.Provider value={{ 
      user, 
      loading, 
      login, 
      register, 
      logout,
      checkAuth
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