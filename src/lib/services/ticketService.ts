// Simple ticket service without complex dependencies
const API_BASE_URL = ''; // Use relative paths to trigger Vite proxy

// Basic types
export interface User {
  id: string;
  name: string;
  email: string;
  avatar?: string;
  department?: string;
}

export interface Ticket {
  id: string;
  title: string;
  description: string;
  status: string;
  priority: string;
  category: string;
  assignedTo?: string;
  submittedBy: string;
  submittedAt: string;
  createdAt: string;
  updatedAt: string;
  dueDate?: string;
  tags?: string[];
  submitter?: User;
  assignee?: User;
}

export interface TicketFilter {
  status?: string;
  priority?: string;
  category?: string;
  search?: string;
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

// Simple API client
const apiClient = {
  async get<T>(endpoint: string): Promise<T> {
    const response = await fetch(`${API_BASE_URL}${endpoint}`);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    return response.json();
  }
};

// Ticket service
export class TicketService {
  // Get all tickets with optional filtering
  static async getTickets(filters: TicketFilter = {}): Promise<{
    success: boolean;
    data: Ticket[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
    };
  }> {
    const queryParams = new URLSearchParams();
    
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        queryParams.append(key, value.toString());
      }
    });

    const endpoint = `/api/tickets?${queryParams.toString()}`;
    return apiClient.get(endpoint);
  }

  // Get ticket statistics
  static async getTicketStats(): Promise<{
    success: boolean;
    data: {
      total: number;
      open: number;
      inProgress: number;
      resolved: number;
      closed: number;
    };
  }> {
    return apiClient.get('/api/tickets/stats/overview');
  }
}
