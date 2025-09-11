import { apiClient } from '../api';
import type { 
  FollowupDetectionResult, 
  ProcessedFollowup, 
  FollowupStats, 
  InboundEmail 
} from '../types/followup';

class FollowupService {
  /**
   * Detect if an email is a follow-up to an auto-response
   */
  async detectFollowup(email: InboundEmail): Promise<FollowupDetectionResult> {
    try {
      const response = await apiClient.post('/api/followups/detect', email);
      return response.data;
    } catch (error) {
      console.error('Error detecting follow-up:', error);
      throw error;
    }
  }

  /**
   * Process a follow-up email and add it as a ticket comment
   */
  async processFollowup(email: InboundEmail): Promise<{
    success: boolean;
    ticketId?: string;
    commentId?: string;
    followupId?: string;
    error?: string;
  }> {
    try {
      const response = await apiClient.post('/api/followups/process', email);
      return response.data;
    } catch (error) {
      console.error('Error processing follow-up:', error);
      throw error;
    }
  }

  /**
   * Process multiple follow-up emails in batch
   */
  async processBatchFollowups(emails: InboundEmail[]): Promise<Array<{
    success: boolean;
    ticketId?: string;
    commentId?: string;
    followupId?: string;
    error?: string;
  }>> {
    try {
      const response = await apiClient.post('/api/followups/process-batch', { emails });
      return response.data;
    } catch (error) {
      console.error('Error processing batch follow-ups:', error);
      throw error;
    }
  }

  /**
   * Get all follow-ups for a specific ticket
   */
  async getTicketFollowups(ticketId: string): Promise<ProcessedFollowup[]> {
    try {
      const response = await apiClient.get(`/api/followups/ticket/${ticketId}`);
      return response.data;
    } catch (error) {
      console.error('Error fetching ticket follow-ups:', error);
      return [];
    }
  }

  /**
   * Get all follow-ups for a specific auto-response
   */
  async getAutoResponseFollowups(autoResponseId: string): Promise<ProcessedFollowup[]> {
    try {
      const response = await apiClient.get(`/api/followups/auto-response/${autoResponseId}`);
      return response.data;
    } catch (error) {
      console.error('Error fetching auto-response follow-ups:', error);
      return [];
    }
  }

  /**
   * Get follow-up statistics
   */
  async getFollowupStats(ticketId?: string): Promise<FollowupStats> {
    try {
      const endpoint = ticketId ? `/api/followups/stats?ticketId=${ticketId}` : '/api/followups/stats';
      const response = await apiClient.get(endpoint);
      return response.data;
    } catch (error) {
      console.error('Error fetching follow-up stats:', error);
      return {
        totalFollowups: 0,
        processedFollowups: 0,
        failedFollowups: 0,
        recentFollowups: 0
      };
    }
  }

  /**
   * Get recent follow-ups across all tickets
   */
  async getRecentFollowups(limit: number = 20, offset: number = 0): Promise<ProcessedFollowup[]> {
    try {
      const endpoint = `/api/followups/recent?limit=${limit}&offset=${offset}`;
      const response = await apiClient.get(endpoint);
      return response.data;
    } catch (error) {
      console.error('Error fetching recent follow-ups:', error);
      return [];
    }
  }

  /**
   * Update follow-up status
   */
  async updateFollowupStatus(followupId: string, status: 'PROCESSED' | 'FAILED' | 'PENDING' | 'IGNORED'): Promise<ProcessedFollowup> {
    try {
      const response = await apiClient.put(`/api/followups/${followupId}/status`, { status });
      return response.data;
    } catch (error) {
      console.error('Error updating follow-up status:', error);
      throw error;
    }
  }

  /**
   * Delete (soft delete) a follow-up
   */
  async deleteFollowup(followupId: string): Promise<ProcessedFollowup> {
    try {
      const response = await apiClient.delete(`/api/followups/${followupId}`);
      return response.data;
    } catch (error) {
      console.error('Error deleting follow-up:', error);
      throw error;
    }
  }
}

export const followupService = new FollowupService();
