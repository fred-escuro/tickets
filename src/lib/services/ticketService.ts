// Simple ticket service without complex dependencies
// Use relative paths to trigger Vite proxy to backend
const API_BASE_URL = '';

// Basic types
import type { User } from './authService';

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
  comments?: any[];
  attachments?: any[];
}

export interface CreateTicketRequest {
  title: string;
  description: string;
  category: string;
  priority?: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  dueDate?: string;
  tags?: string[];
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
    const headers: Record<string, string> = {};
    
    // Add auth token if available
    const authToken = localStorage.getItem('auth-token');
    if (authToken) {
      headers['Authorization'] = `Bearer ${authToken}`;
    }
    
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      headers
    });
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || errorData.message || `HTTP error! status: ${response.status}`);
    }
    
    return response.json();
  },

  async post<T>(endpoint: string, data: any): Promise<T> {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        // Add auth token if available
        ...(localStorage.getItem('auth-token') && {
          'Authorization': `Bearer ${localStorage.getItem('auth-token')}`
        })
      },
      body: JSON.stringify(data)
    });
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || errorData.message || `HTTP error! status: ${response.status}`);
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

  // Create a new ticket
  static async createTicket(ticketData: CreateTicketRequest): Promise<{
    success: boolean;
    data: Ticket;
    message: string;
  }> {
    const endpoint = '/api/tickets';
    return apiClient.post(endpoint, ticketData);
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
