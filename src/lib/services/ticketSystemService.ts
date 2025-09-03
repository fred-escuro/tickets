// Enhanced ticket system service for managing categories, priorities, statuses, and workflows

export interface TicketCategory {
  id: string;
  name: string;
  description?: string;
  color: string;
  icon?: string;
  parentId?: string;
  isActive: boolean;
  sortOrder: number;
  customFields?: {
    fields: CustomField[];
  };
  autoAssignRules?: {
    rules: AutoAssignRule[];
  };
  slaRules?: {
    rules: SLARule[];
  };
  parent?: TicketCategory;
  children?: TicketCategory[];
  _count?: {
    tickets: number;
  };
}

export interface TicketPriority {
  id: string;
  name: string;
  description?: string;
  color: string;
  icon?: string;
  level: number;
  isActive: boolean;
  sortOrder: number;
  slaResponseHours: number;
  slaResolveHours: number;
  escalationRules?: {
    rules: EscalationRule[];
  };
}

export interface TicketStatus {
  id: string;
  name: string;
  description?: string;
  color: string;
  icon?: string;
  isActive: boolean;
  isClosed: boolean;
  isResolved: boolean;
  sortOrder: number;
  allowedTransitions?: {
    transitions: string[];
  };
  permissions?: {
    roles: string[];
  };
}

export interface TicketTemplate {
  id: string;
  name: string;
  description?: string;
  categoryId: string;
  title: string;
  description: string;
  customFields?: Record<string, any>;
  isActive: boolean;
  category?: TicketCategory;
}

export interface TicketWorkflow {
  id: string;
  name: string;
  description?: string;
  categoryId?: string;
  priorityId?: string;
  rules: WorkflowRules;
  isActive: boolean;
  category?: TicketCategory;
  priority?: TicketPriority;
}

export interface CustomField {
  id: string;
  label: string;
  type: 'text' | 'textarea' | 'select' | 'checkbox' | 'date' | 'number';
  required: boolean;
  options?: string[];
  placeholder?: string;
  validation?: {
    min?: number;
    max?: number;
    pattern?: string;
  };
}

export interface AutoAssignRule {
  condition: string;
  assignTo: string;
}

export interface SLARule {
  condition: string;
  responseHours: number;
  resolveHours: number;
}

export interface EscalationRule {
  condition: string;
  action: string;
}

export interface WorkflowRules {
  triggers: WorkflowTrigger[];
}

export interface WorkflowTrigger {
  event: string;
  conditions: WorkflowCondition[];
  actions: WorkflowAction[];
}

export interface WorkflowCondition {
  field: string;
  operator: 'equals' | 'not_equals' | 'contains' | 'greater_than' | 'less_than';
  value: any;
}

export interface WorkflowAction {
  type: string;
  value: any;
}

export interface SystemConfig {
  categories: number;
  priorities: number;
  statuses: number;
  templates: number;
  workflows: number;
}

class TicketSystemService {
  private baseUrl = '/api/ticket-system';

  // Categories
  async getCategories(): Promise<TicketCategory[]> {
    const token = localStorage.getItem('auth-token');
    console.log('Token for categories request:', token ? 'Present' : 'Missing');
    
    const response = await fetch(`${this.baseUrl}/categories`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    console.log('Categories response status:', response.status);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('Categories API error:', errorText);
      throw new Error('Failed to fetch categories');
    }
    
    const data = await response.json();
    console.log('Categories API response:', data);
    return data.data;
  }

  async createCategory(category: Omit<TicketCategory, 'id' | 'sortOrder' | 'isActive'>): Promise<TicketCategory> {
    const token = localStorage.getItem('auth-token');
    console.log('Creating category with data:', category);
    console.log('Token for create category:', token ? 'Present' : 'Missing');
    
    const response = await fetch(`${this.baseUrl}/categories`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(category)
    });
    
    console.log('Create category response status:', response.status);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('Create category API error:', errorText);
      throw new Error(`Failed to create category: ${response.status} ${errorText}`);
    }
    
    const data = await response.json();
    console.log('Create category API response:', data);
    return data.data;
  }

  async updateCategory(id: string, updates: Partial<TicketCategory>): Promise<TicketCategory> {
    const response = await fetch(`${this.baseUrl}/categories/${id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('auth-token')}`
      },
      body: JSON.stringify(updates)
    });
    
    if (!response.ok) {
      throw new Error('Failed to update category');
    }
    
    const data = await response.json();
    return data.data;
  }

  async deleteCategory(id: string): Promise<void> {
    const response = await fetch(`${this.baseUrl}/categories/${id}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('auth-token')}`
      }
    });
    
    if (!response.ok) {
      throw new Error('Failed to delete category');
    }
  }

  // Priorities
  async getPriorities(): Promise<TicketPriority[]> {
    const response = await fetch(`${this.baseUrl}/priorities`, {
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('auth-token')}`
      }
    });
    
    if (!response.ok) {
      throw new Error('Failed to fetch priorities');
    }
    
    const data = await response.json();
    return data.data;
  }

  async createPriority(priority: Omit<TicketPriority, 'id' | 'sortOrder' | 'isActive'>): Promise<TicketPriority> {
    const response = await fetch(`${this.baseUrl}/priorities`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('auth-token')}`
      },
      body: JSON.stringify(priority)
    });
    
    if (!response.ok) {
      throw new Error('Failed to create priority');
    }
    
    const data = await response.json();
    return data.data;
  }

  async updatePriority(id: string, updates: Partial<TicketPriority>): Promise<TicketPriority> {
    const response = await fetch(`${this.baseUrl}/priorities/${id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('auth-token')}`
      },
      body: JSON.stringify(updates)
    });
    
    if (!response.ok) {
      throw new Error('Failed to update priority');
    }
    
    const data = await response.json();
    return data.data;
  }

  // Statuses
  async getStatuses(): Promise<TicketStatus[]> {
    const response = await fetch(`${this.baseUrl}/statuses`, {
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('auth-token')}`
      }
    });
    
    if (!response.ok) {
      throw new Error('Failed to fetch statuses');
    }
    
    const data = await response.json();
    return data.data;
  }

  async createStatus(status: Omit<TicketStatus, 'id' | 'sortOrder' | 'isActive'>): Promise<TicketStatus> {
    const response = await fetch(`${this.baseUrl}/statuses`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('auth-token')}`
      },
      body: JSON.stringify(status)
    });
    
    if (!response.ok) {
      throw new Error('Failed to create status');
    }
    
    const data = await response.json();
    return data.data;
  }

  async updateStatus(id: string, updates: Partial<TicketStatus>): Promise<TicketStatus> {
    const response = await fetch(`${this.baseUrl}/statuses/${id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('auth-token')}`
      },
      body: JSON.stringify(updates)
    });
    
    if (!response.ok) {
      throw new Error('Failed to update status');
    }
    
    const data = await response.json();
    return data.data;
  }

  // Templates
  async getTemplates(categoryId?: string): Promise<TicketTemplate[]> {
    const url = categoryId 
      ? `${this.baseUrl}/templates?categoryId=${categoryId}`
      : `${this.baseUrl}/templates`;
      
    const response = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('auth-token')}`
      }
    });
    
    if (!response.ok) {
      throw new Error('Failed to fetch templates');
    }
    
    const data = await response.json();
    return data.data;
  }

  async createTemplate(template: Omit<TicketTemplate, 'id' | 'isActive'>): Promise<TicketTemplate> {
    const response = await fetch(`${this.baseUrl}/templates`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('auth-token')}`
      },
      body: JSON.stringify(template)
    });
    
    if (!response.ok) {
      throw new Error('Failed to create template');
    }
    
    const data = await response.json();
    return data.data;
  }

  // Workflows
  async getWorkflows(): Promise<TicketWorkflow[]> {
    const response = await fetch(`${this.baseUrl}/workflows`, {
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('auth-token')}`
      }
    });
    
    if (!response.ok) {
      throw new Error('Failed to fetch workflows');
    }
    
    const data = await response.json();
    return data.data;
  }

  async createWorkflow(workflow: Omit<TicketWorkflow, 'id' | 'isActive'>): Promise<TicketWorkflow> {
    const response = await fetch(`${this.baseUrl}/workflows`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('auth-token')}`
      },
      body: JSON.stringify(workflow)
    });
    
    if (!response.ok) {
      throw new Error('Failed to create workflow');
    }
    
    const data = await response.json();
    return data.data;
  }

  // System Configuration
  async getSystemConfig(): Promise<SystemConfig> {
    const response = await fetch(`${this.baseUrl}/config`, {
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('auth-token')}`
      }
    });
    
    if (!response.ok) {
      throw new Error('Failed to fetch system configuration');
    }
    
    const data = await response.json();
    return data.data;
  }

  // Utility methods
  getCategoryColorClass(color: string): string {
    const colorMap: Record<string, string> = {
      blue: 'bg-blue-100 text-blue-800 border-blue-200',
      green: 'bg-green-100 text-green-800 border-green-200',
      red: 'bg-red-100 text-red-800 border-red-200',
      yellow: 'bg-yellow-100 text-yellow-800 border-yellow-200',
      orange: 'bg-orange-100 text-orange-800 border-orange-200',
      purple: 'bg-purple-100 text-purple-800 border-purple-200',
      gray: 'bg-gray-100 text-gray-800 border-gray-200'
    };
    return colorMap[color] || colorMap.blue;
  }

  getPriorityColorClass(color: string): string {
    const colorMap: Record<string, string> = {
      green: 'bg-green-500 text-white border-green-600',
      yellow: 'bg-yellow-500 text-white border-yellow-600',
      orange: 'bg-orange-500 text-white border-orange-600',
      red: 'bg-red-500 text-white border-red-600'
    };
    return colorMap[color] || colorMap.yellow;
  }

  getStatusColorClass(color: string): string {
    const colorMap: Record<string, string> = {
      blue: 'bg-blue-200 text-blue-800 border-blue-300',
      yellow: 'bg-yellow-500 text-white border-yellow-600',
      orange: 'bg-orange-100 text-orange-700 border-orange-200',
      green: 'bg-green-200 text-green-800 border-green-300',
      gray: 'bg-gray-100 text-gray-700 border-gray-200',
      red: 'bg-red-100 text-red-800 border-red-200'
    };
    return colorMap[color] || colorMap.blue;
  }

  // SLA calculation helpers
  calculateSLA(responseHours: number, resolveHours: number): {
    responseTime: string;
    resolveTime: string;
    isUrgent: boolean;
  } {
    const isUrgent = responseHours <= 2;
    
    const formatTime = (hours: number): string => {
      if (hours < 24) {
        return `${hours}h`;
      } else if (hours < 168) {
        return `${Math.round(hours / 24)}d`;
      } else {
        return `${Math.round(hours / 168)}w`;
      }
    };

    return {
      responseTime: formatTime(responseHours),
      resolveTime: formatTime(resolveHours),
      isUrgent
    };
  }

  // Workflow condition builders
  buildWorkflowCondition(field: string, operator: string, value: any): WorkflowCondition {
    return { field, operator: operator as any, value };
  }

  buildWorkflowAction(type: string, value: any): WorkflowAction {
    return { type, value };
  }

  // Custom field validation
  validateCustomField(field: CustomField, value: any): { isValid: boolean; error?: string } {
    if (field.required && (!value || value.toString().trim() === '')) {
      return { isValid: false, error: `${field.label} is required` };
    }

    if (field.validation) {
      const { min, max, pattern } = field.validation;
      
      if (min !== undefined && value < min) {
        return { isValid: false, error: `${field.label} must be at least ${min}` };
      }
      
      if (max !== undefined && value > max) {
        return { isValid: false, error: `${field.label} must be at most ${max}` };
      }
      
      if (pattern && !new RegExp(pattern).test(value)) {
        return { isValid: false, error: `${field.label} format is invalid` };
      }
    }

    return { isValid: true };
  }
}

export const ticketSystemService = new TicketSystemService();
