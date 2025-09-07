import { apiClient, API_ENDPOINTS, type ApiResponse } from '@/lib/api';

export interface SystemSettingsDto {
  id: string;
  appName: string;
  appLogoUrl?: string | null;
  companyName: string;
  companyEmail: string;
  companyPhone?: string | null;
  companyAddress?: string | null;
  timezone: string;
  language: string;
  currency: string;
  businessHours?: { start: string; end: string; timezone?: string } | null;
  createdAt: string;
  updatedAt: string;
}

class SettingsApi {
  async get(): Promise<ApiResponse<SystemSettingsDto>> {
    return apiClient.get<SystemSettingsDto>(API_ENDPOINTS.SETTINGS.GET);
  }

  async update(payload: Partial<SystemSettingsDto>): Promise<ApiResponse<SystemSettingsDto>> {
    return apiClient.put<SystemSettingsDto>(API_ENDPOINTS.SETTINGS.UPDATE, payload);
  }

  async uploadLogo(file: File): Promise<ApiResponse<{ appLogoUrl: string; settings: SystemSettingsDto }>> {
    const form = new FormData();
    form.append('file', file);
    return apiClient.post(API_ENDPOINTS.SETTINGS.UPLOAD_LOGO, form) as any;
  }

  // v2 generic settings API
  async getNamespaces(namespaces: string[]): Promise<ApiResponse<Record<string, any>>> {
    const query = namespaces.length ? `?ns=${encodeURIComponent(namespaces.join(','))}` : '';
    return apiClient.get<Record<string, any>>(`/api/settings/v2${query}`);
  }

  async getNamespace(namespace: string): Promise<ApiResponse<Record<string, any>>> {
    return apiClient.get<Record<string, any>>(`/api/settings/v2/${namespace}`);
  }

  async updateNamespace(namespace: string, values: Record<string, any>): Promise<ApiResponse<Record<string, any>>> {
    return apiClient.put<Record<string, any>>(`/api/settings/v2/${namespace}`, values);
  }

  async uploadToNamespace(namespace: string, key: string, file: File): Promise<ApiResponse<{ key: string; value: string }>> {
    const form = new FormData();
    form.append('file', file);
    form.append('key', key);
    return apiClient.post(`/api/settings/v2/${namespace}/upload`, form) as any;
  }

  async sendSmtpTest(to: string): Promise<ApiResponse<{ messageId: string }>> {
    return apiClient.post(`/api/settings/v2/email/smtp/test`, { to }) as any;
  }

  async runEmailIngest(): Promise<ApiResponse<{ fetched: number; created: number; replies: number; skipped: number; errors: number }>> {
    return apiClient.post(`/api/email-ingest/run`, {}) as any;
  }
}

export const settingsApi = new SettingsApi();


