import { apiClient, API_ENDPOINTS, ApiResponse, PaginatedResponse } from '../api';

// User types
export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  avatar?: string;
  department?: string;
  position?: string;
  phone?: string;
  isActive: boolean;
  lastLoginAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateUserData {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  role: string;
  department?: string;
  position?: string;
  phone?: string;
}

export interface UpdateUserData {
  firstName?: string;
  lastName?: string;
  role?: string;
  department?: string;
  position?: string;
  phone?: string;
  isActive?: boolean;
}

export interface UpdateProfileData {
  firstName?: string;
  lastName?: string;
  phone?: string;
}

export interface ChangePasswordData {
  currentPassword: string;
  newPassword: string;
}

export interface UserFilter {
  search?: string;
  role?: string;
  department?: string;
  isActive?: boolean;
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface UserStats {
  total: number;
  active: number;
  inactive: number;
  byRole: Record<string, number>;
  byDepartment: Record<string, number>;
}

// User service
export class UserService {
  // Get all users with optional filtering
  static async getUsers(filters: UserFilter = {}): Promise<PaginatedResponse<User>> {
    const queryParams = new URLSearchParams();
    
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        queryParams.append(key, value.toString());
      }
    });

    const endpoint = `${API_ENDPOINTS.USERS.LIST}?${queryParams.toString()}`;
    return apiClient.get(endpoint);
  }

  // Get user by ID
  static async getUser(id: string): Promise<ApiResponse<User>> {
    return apiClient.get(`${API_ENDPOINTS.USERS.GET(id)}`);
  }

  // Get current user profile
  static async getProfile(): Promise<ApiResponse<User>> {
    return apiClient.get(API_ENDPOINTS.USERS.PROFILE);
  }

  // Create new user
  static async createUser(data: CreateUserData): Promise<ApiResponse<User>> {
    return apiClient.post(API_ENDPOINTS.USERS.CREATE, data);
  }

  // Update user
  static async updateUser(id: string, data: UpdateUserData): Promise<ApiResponse<User>> {
    return apiClient.put(`${API_ENDPOINTS.USERS.UPDATE(id)}`, data);
  }

  // Update current user profile
  static async updateProfile(data: UpdateProfileData): Promise<ApiResponse<User>> {
    return apiClient.put(API_ENDPOINTS.USERS.UPDATE, data);
  }

  // Delete user
  static async deleteUser(id: string): Promise<ApiResponse<void>> {
    return apiClient.delete(`${API_ENDPOINTS.USERS.DELETE(id)}`);
  }

  // Change password
  static async changePassword(data: ChangePasswordData): Promise<ApiResponse<void>> {
    return apiClient.post('/api/users/change-password', data);
  }

  // Upload avatar
  static async uploadAvatar(file: File): Promise<ApiResponse<{ avatarUrl: string }>> {
    const formData = new FormData();
    formData.append('avatar', file);

    return apiClient.post(API_ENDPOINTS.USERS.AVATAR, formData, {
      headers: {
        // Don't set Content-Type for FormData, let browser set it
        'Content-Type': undefined,
      },
    });
  }

  // Get user statistics
  static async getUserStats(): Promise<ApiResponse<UserStats>> {
    return apiClient.get('/api/users/stats');
  }

  // Get users by department
  static async getUsersByDepartment(department: string): Promise<ApiResponse<User[]>> {
    return apiClient.get(`/api/users/department/${department}`);
  }

  // Get users by role
  static async getUsersByRole(role: string): Promise<ApiResponse<User[]>> {
    return apiClient.get(`/api/users/role/${role}`);
  }

  // Bulk update users
  static async bulkUpdateUsers(userIds: string[], updates: UpdateUserData): Promise<ApiResponse<{
    updated: number;
    failed: number;
    errors: string[];
  }>> {
    return apiClient.post('/api/users/bulk-update', { userIds, updates });
  }

  // Bulk delete users
  static async bulkDeleteUsers(userIds: string[]): Promise<ApiResponse<{
    deleted: number;
    failed: number;
    errors: string[];
  }>> {
    return apiClient.post('/api/users/bulk-delete', { userIds });
  }

  // Export users
  static async exportUsers(filters: UserFilter = {}, format: 'csv' | 'excel' = 'csv'): Promise<ApiResponse<{
    downloadUrl: string;
    filename: string;
  }>> {
    const queryParams = new URLSearchParams();
    
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        queryParams.append(key, value.toString());
      }
    });
    
    queryParams.append('format', format);
    
    return apiClient.get(`/api/users/export?${queryParams.toString()}`);
  }

  // Get user suggestions for autocomplete
  static async getUserSuggestions(query: string, limit: number = 10): Promise<ApiResponse<User[]>> {
    return apiClient.get(`/api/users/suggestions?q=${encodeURIComponent(query)}&limit=${limit}`);
  }
}

// Default user filters
export const DEFAULT_USER_FILTERS: UserFilter = {
  page: 1,
  limit: 20,
  sortBy: 'firstName',
  sortOrder: 'asc',
};

// User roles
export const USER_ROLES = [
  'admin',
  'manager',
  'agent',
  'user',
  'guest',
] as const;

export type UserRole = typeof USER_ROLES[number];

// User departments
export const USER_DEPARTMENTS = [
  'IT',
  'HR',
  'Finance',
  'Marketing',
  'Sales',
  'Operations',
  'Customer Support',
  'Engineering',
  'Design',
  'Other',
] as const;

export type UserDepartment = typeof USER_DEPARTMENTS[number];

// Role permissions
export const ROLE_PERMISSIONS: Record<UserRole, string[]> = {
  admin: ['*'], // All permissions
  manager: [
    'tickets:read',
    'tickets:write',
    'tickets:delete',
    'users:read',
    'users:write',
    'reports:read',
    'knowledge:read',
    'knowledge:write',
  ],
  agent: [
    'tickets:read',
    'tickets:write',
    'knowledge:read',
    'reports:read',
  ],
  user: [
    'tickets:read',
    'tickets:write',
    'knowledge:read',
  ],
  guest: [
    'tickets:read',
    'knowledge:read',
  ],
};

// Check if user has permission
export const hasPermission = (userRole: UserRole, permission: string): boolean => {
  const permissions = ROLE_PERMISSIONS[userRole];
  return permissions.includes('*') || permissions.includes(permission);
};
