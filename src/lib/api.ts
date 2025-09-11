import { config } from '../config/environment';
import { forceLogout } from './services/authService';

// API Configuration
export const API_BASE_URL = config.api.baseUrl;

// API Endpoints
export const API_ENDPOINTS = {
  // Auth
  AUTH: {
    LOGIN: '/api/auth/login',
    REGISTER: '/api/auth/register',
    LOGOUT: '/api/auth/logout',
    REFRESH: '/api/auth/refresh',
    VERIFY: '/api/auth/verify',
    FORGOT_PASSWORD: '/api/auth/forgot-password',
    RESET_PASSWORD: '/api/auth/reset-password',
    SOCIAL_LOGIN: '/api/auth/social-login',
    VERIFY_EMAIL_REQUEST: '/api/auth/verify-email/request',
    VERIFY_EMAIL_CONFIRM: '/api/auth/verify-email/confirm',
  },
  // Users
  USERS: {
    PROFILE: '/api/users/profile',
    UPDATE: '/api/users/profile',
    AVATAR: '/api/users/avatar',
    LIST: '/api/users',
    GET: (id: string) => `/api/users/${id}`,
    CREATE: '/api/users',
    UPDATE_BY_ID: (id: string) => `/api/users/${id}`,
    DELETE: (id: string) => `/api/users/${id}`,
    AGENTS: '/api/users/agents/list',
    VERIFY_EMAIL_REQUEST: (id: string) => `/api/users/${id}/verify-email/request`,
  },
  // Departments
  DEPARTMENTS: {
    LIST: '/api/departments',
    GET: (id: string) => `/api/departments/${id}`,
    CREATE: '/api/departments',
    UPDATE: (id: string) => `/api/departments/${id}`,
    DELETE: (id: string) => `/api/departments/${id}`,
    ASSIGN_USER: (deptId: string, userId: string) => `/api/departments/${deptId}/users/${userId}`,
  },
  // Tickets
  TICKETS: {
    LIST: '/api/tickets',
    CREATE: '/api/tickets',
    GET: (id: string) => `/api/tickets/${id}`,
    UPDATE: (id: string) => `/api/tickets/${id}`,
    DELETE: (id: string) => `/api/tickets/${id}`,
    ASSIGN: (id: string) => `/api/tickets/${id}/assign`,
    ASSIGNMENT_HISTORY: (id: string) => `/api/tickets/${id}/assignment-history`,
    STATUS: (id: string) => `/api/tickets/${id}/status`,
    STATUS_HISTORY: (id: string) => `/api/tickets/${id}/status-history`,
    STATS_OVERVIEW: '/api/tickets/stats/overview',
    STATS_ACTIVITY: '/api/tickets/stats/activity',
    STATS_METRICS: '/api/tickets/stats/metrics',
    TASKS: (id: string) => `/api/tickets/${id}/tasks`,
    TASKS_CREATE: (id: string) => `/api/tickets/${id}/tasks`,
    TASK_COMMENTS: (ticketId: string, taskId: string) => `/api/tickets/${ticketId}/tasks/${taskId}/comments`,
    TASK_STATUS: (ticketId: string, taskId: string) => `/api/tickets/${ticketId}/tasks/${taskId}/status`,
    TASK_ASSIGN: (ticketId: string, taskId: string) => `/api/tickets/${ticketId}/tasks/${taskId}/assign`,
    TASK_STATUS_HISTORY: (ticketId: string, taskId: string) => `/api/tickets/${ticketId}/tasks/${taskId}/status-history`,
    TASK_ASSIGNMENT_HISTORY: (ticketId: string, taskId: string) => `/api/tickets/${ticketId}/tasks/${taskId}/assignment-history`,
  },
  // Comments
  COMMENTS: {
    LIST: (ticketId: string) => `/api/tickets/${ticketId}/comments`,
    CREATE: (ticketId: string) => `/api/tickets/${ticketId}/comments`,
    UPDATE: (ticketId: string, commentId: string) => `/api/tickets/${ticketId}/comments/${commentId}`,
    DELETE: (ticketId: string, commentId: string) => `/api/tickets/${ticketId}/comments/${commentId}`,
  },
  // Attachments
  ATTACHMENTS: {
    UPLOAD: '/api/attachments/upload',
    DELETE: (id: string) => `/api/attachments/${id}`,
    DOWNLOAD: (id: string) => `/api/attachments/${id}/download`,
  },
  // Knowledge Base
  KNOWLEDGE: {
    ARTICLES: '/api/knowledge/articles',
    CREATE: '/api/knowledge/articles',
    GET: (id: string) => `/api/knowledge/articles/${id}`,
    UPDATE: (id: string) => `/api/knowledge/articles/${id}`,
    DELETE: (id: string) => `/api/knowledge/articles/${id}`,
  },
  // Search
  SEARCH: {
    GLOBAL: '/api/search',
    TICKETS: '/api/search/tickets',
    KNOWLEDGE: '/api/search/knowledge',
  },
  // Menu
  MENU: {
    LIST: '/api/menu',
    ITEMS: '/api/menu/items',
    ITEM: (id: string) => `/api/menu/items/${id}`,
    LINK_PERMISSION: (id: string, permissionId: string) => `/api/menu/items/${id}/permissions/${permissionId}`,
  },
  // Settings
  SETTINGS: {
    GET: '/api/settings',
    UPDATE: '/api/settings',
    UPLOAD_LOGO: '/api/settings/logo',
  },
  // Health
  HEALTH: '/health',
} as const;

// API Response types
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
}

export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

// HTTP Methods
export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

// Request options
export interface RequestOptions {
  method?: HttpMethod;
  headers?: Record<string, string>;
  body?: any;
  signal?: AbortSignal;
}

// Default headers
export const getDefaultHeaders = (): Record<string, string> => {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  // Add auth token if available
  const token = localStorage.getItem('auth-token');
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  return headers;
};

// API Client
export class ApiClient {
  private baseURL: string;

  constructor(baseURL: string = API_BASE_URL) {
    this.baseURL = baseURL;
  }

  private async request<T>(
    endpoint: string,
    options: RequestOptions = {}
  ): Promise<ApiResponse<T>> {
    const {
      method = 'GET',
      headers = {},
      body,
      signal
    } = options;

    const url = `${this.baseURL}${endpoint}`;
    const requestHeaders = { ...getDefaultHeaders(), ...headers };

    // Don't set Content-Type for FormData - let the browser set it with the boundary
    if (body instanceof FormData) {
      delete requestHeaders['Content-Type'];
    }

    try {
      const response = await fetch(url, {
        method,
        headers: requestHeaders,
        body: body instanceof FormData ? body : (body ? JSON.stringify(body) : undefined),
        signal,
        credentials: 'include',
      });

      if (!response.ok) {
        // Handle 401 Unauthorized responses globally
        if (response.status === 401) {
          console.log('API request returned 401 - token may be expired');
          forceLogout();
          throw new Error('Authentication expired. Please log in again.');
        }
        
        // Try to parse JSON error response, fallback to text if it fails
        let errorData = {};
        let errorMessage = `HTTP error! status: ${response.status}`;
        
        try {
          const contentType = response.headers.get('content-type');
          if (contentType && contentType.includes('application/json')) {
            errorData = await response.json();
            errorMessage = errorData.message || errorData.error || errorMessage;
          } else {
            // If not JSON, try to get text content
            const textContent = await response.text();
            console.warn('Non-JSON error response:', textContent.substring(0, 200));
            errorMessage = `Server error: ${response.status} ${response.statusText}`;
          }
        } catch (parseError) {
          console.warn('Failed to parse error response:', parseError);
          errorMessage = `Server error: ${response.status} ${response.statusText}`;
        }
        
        // Log more details for 500 errors
        if (response.status === 500) {
          console.error('Server Error Details:', {
            url,
            method,
            status: response.status,
            statusText: response.statusText,
            errorData,
            body: body instanceof FormData ? 'FormData' : body
          });
        }
        
        throw new Error(errorMessage);
      }

      try {
        const data = await response.json();
        return data;
      } catch (jsonError) {
        console.error('Failed to parse JSON response:', jsonError);
        return {
          success: false,
          error: 'Invalid response format from server',
          data: null
        };
      }
    } catch (error) {
      console.error('API request failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
        data: null
      };
    }
  }

  // GET request
  async get<T>(endpoint: string, signal?: AbortSignal): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, { method: 'GET', signal });
  }

  // POST request
  async post<T>(endpoint: string, data: any, signal?: AbortSignal): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, { method: 'POST', body: data, signal });
  }

  // PUT request
  async put<T>(endpoint: string, data: any, signal?: AbortSignal): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, { method: 'PUT', body: data, signal });
  }

  // PATCH request
  async patch<T>(endpoint: string, data: any, signal?: AbortSignal): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, { method: 'PATCH', body: data, signal });
  }

  // DELETE request
  async delete<T>(endpoint: string, signal?: AbortSignal): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, { method: 'DELETE', signal });
  }
}

// Default API client instance
export const apiClient = new ApiClient();

// Utility function to build full URL
export const buildApiUrl = (endpoint: string): string => {
  return `${API_BASE_URL}${endpoint}`;
};

// API Response types
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
}

export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}
