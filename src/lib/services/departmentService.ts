import { apiClient } from '../api';

export interface Department {
  id: string;
  name: string;
  description?: string;
  autoAssignEnabled: boolean;
  assignmentStrategy: string;
  maxTicketsPerAgent: number;
  managerId?: string;
  parentId?: string;
  createdAt: string;
  updatedAt: string;
  manager?: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
  };
  users?: Array<{
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    isAgent: boolean;
    isAvailable: boolean;
  }>;
  _count?: {
    users: number;
  };
}

export interface DepartmentStats {
  totalTickets: number;
  openTickets: number;
  inProgressTickets: number;
  resolvedTickets: number;
  closedTickets: number;
  averageResolutionTime: number;
  ticketsByPriority: Record<string, number>;
  ticketsByCategory: Record<string, number>;
}

export class DepartmentService {
  // Get all departments
  static async getDepartments(): Promise<{
    success: boolean;
    data?: Department[];
    error?: string;
  }> {
    try {
      const response = await apiClient.get('/api/departments');
      return response as { success: boolean; data?: Department[]; error?: string; };
    } catch (error) {
      console.error('Get departments error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get departments'
      };
    }
  }

  // Get department by ID
  static async getDepartment(id: string): Promise<{
    success: boolean;
    data?: Department;
    error?: string;
  }> {
    try {
      const response = await apiClient.get(`/api/departments/${id}`);
      return response as { success: boolean; data?: Department; error?: string; };
    } catch (error) {
      console.error('Get department error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get department'
      };
    }
  }

  // Get department statistics
  static async getDepartmentStats(departmentId: string): Promise<{
    success: boolean;
    data?: DepartmentStats;
    error?: string;
  }> {
    try {
      const response = await apiClient.get(`/api/departments/${departmentId}/stats`);
      return response as { success: boolean; data?: DepartmentStats; error?: string; };
    } catch (error) {
      console.error('Get department stats error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get department statistics'
      };
    }
  }

  // Get tickets assigned to a department
  static async getDepartmentTickets(departmentId: string, filters: any = {}): Promise<{
    success: boolean;
    data?: any;
    error?: string;
  }> {
    try {
      const queryParams = new URLSearchParams();
      queryParams.append('assignedToDepartment', departmentId);
      
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          queryParams.append(key, value.toString());
        }
      });

      const response = await apiClient.get(`/api/tickets?${queryParams.toString()}`);
      return response;
    } catch (error) {
      console.error('Get department tickets error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get department tickets'
      };
    }
  }

  // Create department
  static async createDepartment(data: {
    name: string;
    description?: string;
    managerId?: string;
    parentId?: string;
  }): Promise<{
    success: boolean;
    data?: Department;
    error?: string;
  }> {
    try {
      const response = await apiClient.post('/api/departments', data);
      return response as { success: boolean; data?: Department; error?: string; };
    } catch (error) {
      console.error('Create department error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to create department'
      };
    }
  }

  // Update department
  static async updateDepartment(id: string, data: {
    name?: string;
    description?: string;
    managerId?: string;
    parentId?: string;
  }): Promise<{
    success: boolean;
    data?: Department;
    error?: string;
  }> {
    try {
      const response = await apiClient.put(`/api/departments/${id}`, data);
      return response as { success: boolean; data?: Department; error?: string; };
    } catch (error) {
      console.error('Update department error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to update department'
      };
    }
  }

  // Delete department
  static async deleteDepartment(id: string): Promise<{
    success: boolean;
    error?: string;
  }> {
    try {
      const response = await apiClient.delete(`/api/departments/${id}`);
      return response;
    } catch (error) {
      console.error('Delete department error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to delete department'
      };
    }
  }
}