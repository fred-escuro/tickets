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
  firstName: string;
  lastName: string;
  middleName?: string;
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
  firstName: string;
  lastName: string;
  middleName?: string;
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
let expiryTimeout: NodeJS.Timeout | null = null;

// Check if token is expired
export const isTokenExpired = (token?: string): boolean => {
  const authToken = token || AuthService.getAuthToken();
  if (!authToken) return true;

  try {
    const payload = JSON.parse(atob(authToken.split('.')[1]));
    const expiresAt = payload.exp * 1000; // Convert to milliseconds
    const now = Date.now();
    return now >= expiresAt;
  } catch (error) {
    console.error('Error checking token expiry:', error);
    return true; // If we can't parse the token, consider it expired
  }
};

// Get token expiry time in milliseconds
export const getTokenExpiry = (token?: string): number | null => {
  const authToken = token || AuthService.getAuthToken();
  if (!authToken) return null;

  try {
    const payload = JSON.parse(atob(authToken.split('.')[1]));
    return payload.exp * 1000; // Convert to milliseconds
  } catch (error) {
    console.error('Error getting token expiry:', error);
    return null;
  }
};

// Force logout and redirect to login
export const forceLogout = () => {
  console.log('Token expired - forcing logout');
  
  // Clear all auth data
  AuthService.clearAuth();
  
  // Clear timeouts
  clearTokenRefresh();
  clearExpiryTimeout();
  
  // Dispatch custom event to notify components
  window.dispatchEvent(new CustomEvent('auth-expired'));
  
  // Also dispatch the existing auth-change event for compatibility
  window.dispatchEvent(new CustomEvent('auth-change'));
};

// Clear expiry timeout
export const clearExpiryTimeout = () => {
  if (expiryTimeout) {
    clearTimeout(expiryTimeout);
    expiryTimeout = null;
  }
};

export const setupTokenRefresh = () => {
  const token = AuthService.getAuthToken();
  if (!token) return;

  // Clear existing timeouts
  clearTokenRefresh();
  clearExpiryTimeout();

  try {
    // Decode JWT token to get expiration time
    const payload = JSON.parse(atob(token.split('.')[1]));
    const expiresAt = payload.exp * 1000; // Convert to milliseconds
    const now = Date.now();
    const timeUntilExpiry = expiresAt - now;

    // If token is already expired, force logout immediately
    if (timeUntilExpiry <= 0) {
      forceLogout();
      return;
    }

    // Set timeout for actual expiry (force logout)
    expiryTimeout = setTimeout(() => {
      forceLogout();
    }, timeUntilExpiry);

    // If token expires in less than 5 minutes, try to refresh it
    if (timeUntilExpiry < 5 * 60 * 1000) {
      AuthService.refreshToken().then(response => {
        if (response.success && response.data) {
          AuthService.setAuthToken(response.data.token);
          setupTokenRefresh(); // Setup next refresh
        } else {
          // Refresh failed, force logout
          forceLogout();
        }
      }).catch(() => {
        // Refresh failed, force logout
        forceLogout();
      });
    } else {
      // Set timeout to refresh token 5 minutes before expiry
      const refreshTime = timeUntilExpiry - (5 * 60 * 1000);
      refreshTimeout = setTimeout(() => {
        AuthService.refreshToken().then(response => {
          if (response.success && response.data) {
            AuthService.setAuthToken(response.data.token);
            setupTokenRefresh(); // Setup next refresh
          } else {
            // Refresh failed, force logout
            forceLogout();
          }
        }).catch(() => {
          // Refresh failed, force logout
          forceLogout();
        });
      }, refreshTime);
    }
  } catch (error) {
    console.error('Error setting up token refresh:', error);
    forceLogout();
  }
};

// Clear refresh timeout
export const clearTokenRefresh = () => {
  if (refreshTimeout) {
    clearTimeout(refreshTimeout);
    refreshTimeout = null;
  }
};
