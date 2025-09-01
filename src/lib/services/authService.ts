import { apiClient, API_ENDPOINTS } from '../api';

// Define ApiResponse locally to avoid import issues
interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
}

// Auth types
export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterData {
  email: string;
  password: string;
  name: string;
  role?: string;
  department?: string;
  avatar?: string;
  phone?: string;
  location?: string;
  isAgent?: boolean;
  skills?: string[];
}

export interface User {
  id: string;
  name: string;
  email: string;
  role: string;
  department?: string;
  avatar?: string;
  phone?: string;
  location?: string;
  isAgent: boolean;
  skills?: string[];
  createdAt: string;
  updatedAt: string;
}

export interface AuthResponse {
  user: User;
  token: string;
  refreshToken: string;
}

// Auth service
export class AuthService {
  // Login user
  static async login(credentials: LoginCredentials): Promise<ApiResponse<AuthResponse>> {
    return apiClient.post(API_ENDPOINTS.AUTH.LOGIN, credentials);
  }

  // Register user
  static async register(data: RegisterData): Promise<ApiResponse<AuthResponse>> {
    return apiClient.post(API_ENDPOINTS.AUTH.REGISTER, data);
  }

  // Logout user
  static async logout(): Promise<ApiResponse<void>> {
    try {
      const response = await apiClient.post(API_ENDPOINTS.AUTH.LOGOUT, {});
      
      // Always clear local storage regardless of backend response
      localStorage.removeItem('auth-token');
      localStorage.removeItem('refresh-token');
      localStorage.removeItem('user');
      
      return response;
    } catch (error) {
      console.error('Logout error:', error);
      
      // Even if backend logout fails, clear local storage
      localStorage.removeItem('auth-token');
      localStorage.removeItem('refresh-token');
      localStorage.removeItem('user');
      
      return {
        success: true, // Consider logout successful locally
        data: undefined,
        error: undefined
      };
    }
  }

  // Refresh token
  static async refreshToken(): Promise<ApiResponse<{ token: string }>> {
    const refreshToken = localStorage.getItem('refresh-token');
    if (!refreshToken) {
      return {
        success: false,
        error: 'No refresh token available',
      };
    }

    return apiClient.post(API_ENDPOINTS.AUTH.REFRESH, { refreshToken });
  }

  // Verify token
  static async verifyToken(): Promise<ApiResponse<User>> {
    return apiClient.get(API_ENDPOINTS.AUTH.VERIFY);
  }

  // Get current user from localStorage
  static getCurrentUser(): User | null {
    const userStr = localStorage.getItem('user');
    if (!userStr) return null;
    
    try {
      return JSON.parse(userStr);
    } catch {
      return null;
    }
  }

  // Set current user in localStorage
  static setCurrentUser(user: User): void {
    localStorage.setItem('user', JSON.stringify(user));
  }

  // Get auth token from localStorage
  static getAuthToken(): string | null {
    return localStorage.getItem('auth-token');
  }

  // Set auth token in localStorage
  static setAuthToken(token: string): void {
    localStorage.setItem('auth-token', token);
  }

  // Check if user is authenticated
  static isAuthenticated(): boolean {
    const token = this.getAuthToken();
    const user = this.getCurrentUser();
    return !!(token && user);
  }

  // Check if user has specific role
  static hasRole(role: string): boolean {
    const user = this.getCurrentUser();
    return user?.role === role;
  }

  // Check if user has any of the specified roles
  static hasAnyRole(roles: string[]): boolean {
    const user = this.getCurrentUser();
    return user ? roles.includes(user.role) : false;
  }

  // Clear all auth data
  static clearAuth(): void {
    localStorage.removeItem('auth-token');
    localStorage.removeItem('refresh-token');
    localStorage.removeItem('user');
  }
}

// Auto-refresh token when it expires
let refreshTimeout: NodeJS.Timeout | null = null;

export const setupTokenRefresh = () => {
  const token = AuthService.getAuthToken();
  if (!token) return;

  try {
    // Decode JWT token to get expiration time
    const payload = JSON.parse(atob(token.split('.')[1]));
    const expiresAt = payload.exp * 1000; // Convert to milliseconds
    const now = Date.now();
    const timeUntilExpiry = expiresAt - now;

    // If token expires in less than 5 minutes, refresh it
    if (timeUntilExpiry < 5 * 60 * 1000) {
      AuthService.refreshToken().then(response => {
        if (response.success && response.data) {
          AuthService.setAuthToken(response.data.token);
          setupTokenRefresh(); // Setup next refresh
        }
      });
    } else {
      // Set timeout to refresh token 5 minutes before expiry
      const refreshTime = timeUntilExpiry - (5 * 60 * 1000);
      refreshTimeout = setTimeout(() => {
        AuthService.refreshToken().then(response => {
          if (response.success && response.data) {
            AuthService.setAuthToken(response.data.token);
            setupTokenRefresh(); // Setup next refresh
          }
        });
      }, refreshTime);
    }
  } catch (error) {
    console.error('Error setting up token refresh:', error);
  }
};

// Clear refresh timeout
export const clearTokenRefresh = () => {
  if (refreshTimeout) {
    clearTimeout(refreshTimeout);
    refreshTimeout = null;
  }
};
