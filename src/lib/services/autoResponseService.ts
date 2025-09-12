import { apiClient } from '../api';
import type { 
  AutoResponseTemplate, 
  AutoResponse, 
  EmailFollowup,
  CreateAutoResponseTemplateRequest,
  UpdateAutoResponseTemplateRequest,
  AutoResponseTemplateFilters,
  AutoResponseFilters,
  EmailFollowupFilters
} from '@/types/autoResponse';

export class AutoResponseService {
  // Template Management
  async getTemplates(filters: AutoResponseTemplateFilters = {}): Promise<{
    templates: AutoResponseTemplate[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    // Build query string from filters
    const queryParams = new URLSearchParams();
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        queryParams.append(key, String(value));
      }
    });
    
    const endpoint = `/api/auto-response/templates${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
    const response = await apiClient.get(endpoint);
    return response.data;
  }

  async getTemplate(id: string): Promise<AutoResponseTemplate> {
    const response = await apiClient.get(`/api/auto-response/templates/${id}`);
    return response.data;
  }

  async createTemplate(data: CreateAutoResponseTemplateRequest): Promise<AutoResponseTemplate> {
    console.log('Creating template:', data);
    const response = await apiClient.post('/api/auto-response/templates', data);
    console.log('Create template response:', response);
    
    if (!response.success) {
      throw new Error(response.error || 'Failed to create template');
    }
    
    return response.data;
  }

  async updateTemplate(id: string, data: UpdateAutoResponseTemplateRequest): Promise<AutoResponseTemplate> {
    console.log('Updating template:', { id, data });
    const response = await apiClient.put(`/api/auto-response/templates/${id}`, data);
    console.log('Update template response:', response);
    
    if (!response.success) {
      throw new Error(response.error || 'Failed to update template');
    }
    
    return response.data;
  }

  async deleteTemplate(id: string): Promise<void> {
    await apiClient.delete(`/api/auto-response/templates/${id}`);
  }

  async testTemplate(id: string, ticketId: string): Promise<{
    template: AutoResponseTemplate;
    variables: any;
    generated: any;
  }> {
    const response = await apiClient.post(`/api/auto-response/templates/${id}/test`, { ticketId });
    return response.data;
  }

  // Auto-Response Management
  async getResponses(filters: AutoResponseFilters = {}): Promise<{
    responses: AutoResponse[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    // Build query string from filters
    const queryParams = new URLSearchParams();
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        queryParams.append(key, String(value));
      }
    });
    
    const endpoint = `/api/auto-response/responses${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
    const response = await apiClient.get(endpoint);
    return response.data;
  }

  async getResponseByResponseId(responseId: string): Promise<AutoResponse> {
    const response = await apiClient.get(`/api/auto-response/responses/by-response-id/${responseId}`);
    return response.data;
  }

  // Follow-up Management
  async getFollowups(filters: EmailFollowupFilters = {}): Promise<{
    followups: EmailFollowup[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    // Build query string from filters
    const queryParams = new URLSearchParams();
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        queryParams.append(key, String(value));
      }
    });
    
    const endpoint = `/api/auto-response/followups${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
    const response = await apiClient.get(endpoint);
    return response.data;
  }
}

export const autoResponseService = new AutoResponseService();
