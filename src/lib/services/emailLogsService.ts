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

    const response = await apiClient.get<EmailLogsResponse>(`/api/email-logs?${params.toString()}`);
    return response.data || { logs: [], total: 0, page: 1, limit: 25, totalPages: 0 };
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

    const response = await apiClient.get<EmailStatistics>(`/api/email-logs/statistics?${params.toString()}`);
    return response.data || { totalEmails: 0, inboundEmails: 0, outboundEmails: 0, sentEmails: 0, failedEmails: 0, deliveredEmails: 0, bouncedEmails: 0, successRate: 0 };
  }

  async getEmailThread(ticketId: string): Promise<EmailLog[]> {
    const response = await apiClient.get<EmailLog[]>(`/api/email-logs/ticket/${ticketId}`);
    return response.data || [];
  }

  async getEmailLog(id: string): Promise<EmailLog> {
    const response = await apiClient.get<EmailLog>(`/api/email-logs/${id}`);
    return response.data || {} as EmailLog;
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
    const response = await apiClient.post<{ newEmailLogId: string }>(`/api/email-logs/${id}/retry`, {});
    return response.data || { newEmailLogId: '' };
  }

  async sendTestEmail(data: {
    to: string;
    subject?: string;
    text?: string;
    html?: string;
    ticketId?: string;
    userId?: string;
  }): Promise<{ emailLogId: string }> {
    const response = await apiClient.post<{ emailLogId: string }>('/api/email-logs/send-test', data);
    return response.data || { emailLogId: '' };
  }

  async deleteEmailLog(id: string): Promise<void> {
    await apiClient.delete(`/api/email-logs/${id}`);
  }
}

export const emailLogsService = new EmailLogsService();
