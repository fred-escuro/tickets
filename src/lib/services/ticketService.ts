// Ticket service using the main API client
import { apiClient, API_ENDPOINTS } from '../api';
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
  categoryId?: string;
  categoryInfo?: {
    id: string;
    name: string;
    color: string;
    icon?: string;
  };
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
  category: string; // This will be the categoryId
  priority?: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  priorityId?: string; // New: backend accepts priorityId directly
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

// Using the main API client from api.ts

// Ticket service
export class TicketService {
  // Get all tickets with optional filtering
  static async getTickets(filters: TicketFilter = {}): Promise<any> {
    const queryParams = new URLSearchParams();
    
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        queryParams.append(key, value.toString());
      }
    });

    const endpoint = `${API_ENDPOINTS.TICKETS.LIST}?${queryParams.toString()}`;
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
      const ticketResponse = await apiClient.post(API_ENDPOINTS.TICKETS.CREATE, {
        title: ticketData.title,
        description: ticketData.description,
        category: ticketData.category,
        // Prefer priorityId when provided; keep legacy priority for backward compatibility
        ...(ticketData.priorityId ? { priorityId: ticketData.priorityId } : { priority: ticketData.priority || 'MEDIUM' }),
        dueDate: ticketData.dueDate,
        tags: ticketData.tags || []
      });

      if (!ticketResponse.success) {
        throw new Error(ticketResponse.error || 'Failed to create ticket');
      }

      const ticket = ticketResponse.data as Ticket;

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
  static async getTicketStats(): Promise<any> {
    return apiClient.get('/api/tickets/stats/overview'); // This endpoint might not be in API_ENDPOINTS yet
  }

  // Update an existing ticket (including priority changes)
  static async updateTicket(
    id: string,
    updates: Partial<{
      title: string;
      description: string;
      categoryId: string;
      priorityId: string;
      statusId: string;
      assignedTo: string;
      dueDate: string;
      resolution: string;
      satisfaction: number;
      tags: string[];
    }>
  ): Promise<{
    success: boolean;
    data: Ticket;
    message: string;
  }> {
    const response = await apiClient.put(API_ENDPOINTS.TICKETS.UPDATE(id), updates);
    if (!response.success) {
      throw new Error(response.error || 'Failed to update ticket');
    }
    return response as any;
  }
}
