import { apiClient } from '../api';
import type { EmailLog, EmailLogsResponse, EmailStatistics, EmailLogsFilters } from '../types/emailLogs';

export class EmailLogsService {
  async getEmailLogs(filters: EmailLogsFilters = {}): Promise<EmailLogsResponse> {
    const params = new URLSearchParams();
    
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        params.append(key, value.toString());
      }
    });

    const response = await apiClient.get(`/api/email-logs?${params.toString()}`);
    return response;
  }

  async getEmailStatistics(filters: {
    startDate?: string;
    endDate?: string;
    ticketId?: string;
    userId?: string;
  } = {}): Promise<EmailStatistics> {
    const params = new URLSearchParams();
    
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        params.append(key, value.toString());
      }
    });

    const response = await apiClient.get(`/api/email-logs/statistics?${params.toString()}`);
    return response;
  }

  async getEmailThread(ticketId: string): Promise<EmailLog[]> {
    const response = await apiClient.get(`/api/email-logs/ticket/${ticketId}`);
    return response;
  }

  async getEmailLog(id: string): Promise<EmailLog> {
    const response = await apiClient.get(`/api/email-logs/${id}`);
    return response;
  }

  async updateEmailStatus(
    id: string,
    status: string,
    additionalData?: {
      error?: string;
      deliveryStatus?: any;
      readAt?: string;
    }
  ): Promise<void> {
    await apiClient.patch(`/api/email-logs/${id}/status`, {
      status,
      ...additionalData,
    });
  }

  async retryEmail(id: string): Promise<{ newEmailLogId: string }> {
    const response = await apiClient.post(`/api/email-logs/${id}/retry`);
    return response;
  }

  async sendTestEmail(data: {
    to: string;
    subject?: string;
    text?: string;
    html?: string;
    ticketId?: string;
    userId?: string;
  }): Promise<{ emailLogId: string }> {
    const response = await apiClient.post('/api/email-logs/send-test', data);
    return response;
  }

  async deleteEmailLog(id: string): Promise<void> {
    await apiClient.delete(`/api/email-logs/${id}`);
  }
}

export const emailLogsService = new EmailLogsService();
