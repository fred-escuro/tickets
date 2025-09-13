import { apiClient } from '../api';

const API_ENDPOINTS = {
  CATEGORY_RULES: '/api/assignment-rules/category',
  CATEGORIES: '/api/assignment-rules/categories',
  DEPARTMENTS: '/api/assignment-rules/departments',
  AGENTS: '/api/assignment-rules/agents',
  TEST: '/api/assignment-rules/test'
};

export interface AssignmentRule {
  categoryId: string;
  assignmentType: 'department' | 'agent' | 'round_robin' | 'workload_balance';
  targetDepartmentId?: string;
  targetAgentId?: string;
  fallbackTo?: 'round_robin' | 'workload_balance' | 'none';
  priority?: number;
  conditions?: {
    priority?: string[];
    tags?: string[];
    customFields?: Record<string, any>;
  };
}

export interface Department {
  id: string;
  name: string;
  description?: string;
  autoAssignEnabled: boolean;
  assignmentStrategy: string;
  maxTicketsPerAgent: number;
  users: Array<{
    id: string;
    firstName: string;
    lastName: string;
    isAvailable: boolean;
    maxConcurrentTickets: number;
  }>;
}

export interface Agent {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  departmentId?: string;
  isAvailable: boolean;
  maxConcurrentTickets: number;
  assignmentPriority: number;
  lastAssignmentAt?: string;
  skills?: string[];
  departmentEntity?: {
    id: string;
    name: string;
  };
  currentTicketCount: number;
  isOverloaded: boolean;
}

export interface CategoryWithRules {
  categoryId: string;
  categoryName: string;
  description?: string;
  rules: AssignmentRule[];
}

export class AssignmentRulesService {
  // Get assignment rules for a specific category
  static async getCategoryRules(categoryId: string): Promise<{
    success: boolean;
    data?: CategoryWithRules;
    error?: string;
  }> {
    try {
      const response = await apiClient.get(`${API_ENDPOINTS.CATEGORY_RULES}/${categoryId}`);
      return response as { success: boolean; data?: CategoryWithRules; error?: string; };
    } catch (error) {
      console.error('Get category rules error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get category rules'
      };
    }
  }

  // Update assignment rules for a category
  static async updateCategoryRules(categoryId: string, rules: AssignmentRule[]): Promise<{
    success: boolean;
    data?: CategoryWithRules;
    error?: string;
  }> {
    try {
      const response = await apiClient.put(`${API_ENDPOINTS.CATEGORY_RULES}/${categoryId}`, {
        rules
      });
      return response as { success: boolean; data?: CategoryWithRules; error?: string; };
    } catch (error) {
      console.error('Update category rules error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to update category rules'
      };
    }
  }

  // Get all categories with their assignment rules
  static async getAllCategoriesWithRules(): Promise<{
    success: boolean;
    data?: CategoryWithRules[];
    error?: string;
  }> {
    try {
      const response = await apiClient.get(API_ENDPOINTS.CATEGORIES);
      return response as { success: boolean; data?: CategoryWithRules[]; error?: string; };
    } catch (error) {
      console.error('Get all categories with rules error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get categories with rules'
      };
    }
  }

  // Get available departments
  static async getDepartments(): Promise<{
    success: boolean;
    data?: Department[];
    error?: string;
  }> {
    try {
      const response = await apiClient.get(API_ENDPOINTS.DEPARTMENTS);
      return response as { success: boolean; data?: Department[]; error?: string; };
    } catch (error) {
      console.error('Get departments error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get departments'
      };
    }
  }

  // Get available agents
  static async getAgents(departmentId?: string): Promise<{
    success: boolean;
    data?: Agent[];
    error?: string;
  }> {
    try {
      const url = departmentId 
        ? `${API_ENDPOINTS.AGENTS}?departmentId=${departmentId}`
        : API_ENDPOINTS.AGENTS;
      const response = await apiClient.get(url);
      return response as { success: boolean; data?: Agent[]; error?: string; };
    } catch (error) {
      console.error('Get agents error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get agents'
      };
    }
  }

  // Test assignment rules
  static async testAssignmentRules(testData: {
    categoryId: string;
    priority?: string;
    tags?: string[];
    customFields?: Record<string, any>;
  }): Promise<{
    success: boolean;
    data?: any;
    error?: string;
  }> {
    try {
      const response = await apiClient.post(API_ENDPOINTS.TEST, testData);
      return response;
    } catch (error) {
      console.error('Test assignment rules error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to test assignment rules'
      };
    }
  }
}
