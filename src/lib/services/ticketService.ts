// Simple ticket service without complex dependencies
// Use relative paths to trigger Vite proxy to backend
const API_BASE_URL = '';

// Basic types
import type { User } from './authService';
import { AttachmentService, type FileAttachment } from './attachmentService';

export interface Ticket {
  id: string;
  ticketNumber: number;
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
  attachments?: FileAttachment[];
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

  // Create a new ticket with attachments
  static async createTicket(ticketData: CreateTicketRequest): Promise<{
    success: boolean;
    data: Ticket;
    message: string;
  }> {
    try {
      // First create the ticket
      const ticketResponse = await apiClient.post('/api/tickets', {
        title: ticketData.title,
        description: ticketData.description,
        category: ticketData.category,
        priority: ticketData.priority || 'MEDIUM',
        dueDate: ticketData.dueDate,
        tags: ticketData.tags || []
      });

      if (!ticketResponse.success) {
        throw new Error(ticketResponse.error || 'Failed to create ticket');
      }

      const ticket = ticketResponse.data;

      // If there are attachments, upload them
      if (ticketData.attachments && ticketData.attachments.length > 0) {
        try {
          const uploadedAttachments = await AttachmentService.uploadFilesForTicket(
            ticketData.attachments,
            ticket.id
          );
          
          // Update the ticket response to include attachments
          ticket.attachments = uploadedAttachments;
        } catch (attachmentError) {
          console.error('Failed to upload attachments:', attachmentError);
          // Don't fail the ticket creation if attachments fail
        }
      }

      return {
        success: true,
        data: ticket,
        message: 'Ticket created successfully'
      };
    } catch (error) {
      console.error('Create ticket error:', error);
      return {
        success: false,
        data: null as any,
        message: error instanceof Error ? error.message : 'Failed to create ticket'
      };
    }
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
