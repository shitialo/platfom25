// Add these types for TypeScript support
export interface User {
  id: number;
  email: string;
  name: string;
  created_at: string;
  is_host: boolean;
}

export interface AuthResponse {
  user: User;
  token: string;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterData extends LoginCredentials {
  name: string;
} 