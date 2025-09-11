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
  private cache = new Map<string, { data: any; timestamp: number }>();
  private readonly CACHE_DURATION = 30000; // 30 seconds

  private getCachedData(key: string): any | null {
    const cached = this.cache.get(key);
    if (cached && Date.now() - cached.timestamp < this.CACHE_DURATION) {
      return cached.data;
    }
    return null;
  }

  private setCachedData(key: string, data: any): void {
    this.cache.set(key, { data, timestamp: Date.now() });
  }

  // Preload branding data to prevent multiple simultaneous calls
  private brandingPromise: Promise<ApiResponse<Record<string, any>>> | null = null;
  
  async preloadBranding(): Promise<ApiResponse<Record<string, any>>> {
    if (this.brandingPromise) {
      return this.brandingPromise;
    }
    
    this.brandingPromise = this.getNamespaces(['branding']);
    return this.brandingPromise;
  }

  async get(): Promise<ApiResponse<SystemSettingsDto>> {
    return apiClient.get<SystemSettingsDto>(API_ENDPOINTS.SETTINGS.GET);
  }

  async update(payload: Partial<SystemSettingsDto>): Promise<ApiResponse<SystemSettingsDto>> {
    const result = await apiClient.put<SystemSettingsDto>(API_ENDPOINTS.SETTINGS.UPDATE, payload);
    
    // Clear cache when settings are updated
    if (result.success) {
      this.cache.clear();
      this.brandingPromise = null; // Reset branding promise
    }
    
    return result;
  }

  async uploadLogo(file: File): Promise<ApiResponse<{ appLogoUrl: string; settings: SystemSettingsDto }>> {
    const form = new FormData();
    form.append('file', file);
    const result = await apiClient.post(API_ENDPOINTS.SETTINGS.UPLOAD_LOGO, form) as any;
    
    // Clear cache when logo is uploaded
    if (result.success) {
      this.cache.clear();
      this.brandingPromise = null; // Reset branding promise
    }
    
    return result;
  }

  // v2 generic settings API
  async getNamespaces(namespaces: string[]): Promise<ApiResponse<Record<string, any>>> {
    // Check if we have all requested namespaces in cache
    const cachedNamespaces: Record<string, any> = {};
    const missingNamespaces: string[] = [];
    
    for (const namespace of namespaces) {
      const cached = this.getCachedData(`namespace:${namespace}`);
      if (cached) {
        cachedNamespaces[namespace] = cached;
      } else {
        missingNamespaces.push(namespace);
      }
    }
    
    // If we have all namespaces cached, return them
    if (missingNamespaces.length === 0) {
      return {
        success: true,
        data: cachedNamespaces
      };
    }
    
    // Fetch missing namespaces
    const query = missingNamespaces.length ? `?ns=${encodeURIComponent(missingNamespaces.join(','))}` : '';
    const result = await apiClient.get<Record<string, any>>(`/api/settings/v2${query}`);
    
    if (result.success && result.data) {
      // Cache each namespace individually
      for (const [namespace, data] of Object.entries(result.data)) {
        this.setCachedData(`namespace:${namespace}`, data);
      }
      
      // Return combined result
      return {
        success: true,
        data: { ...cachedNamespaces, ...result.data }
      };
    }
    
    return result;
  }

  async getNamespace(namespace: string): Promise<ApiResponse<Record<string, any>>> {
    return apiClient.get<Record<string, any>>(`/api/settings/v2/${namespace}`);
  }

  async updateNamespace(namespace: string, values: Record<string, any>): Promise<ApiResponse<Record<string, any>>> {
    const result = await apiClient.put<Record<string, any>>(`/api/settings/v2/${namespace}`, values);
    
    // Clear cache when settings are updated
    if (result.success) {
      this.cache.clear();
      this.brandingPromise = null; // Reset branding promise
    }
    
    return result;
  }

  async uploadToNamespace(namespace: string, key: string, file: File): Promise<ApiResponse<{ key: string; value: string }>> {
    const form = new FormData();
    form.append('file', file);
    form.append('key', key);
    const result = await apiClient.post(`/api/settings/v2/${namespace}/upload`, form) as any;
    
    // Clear cache when file is uploaded to namespace
    if (result.success) {
      this.cache.clear();
      this.brandingPromise = null; // Reset branding promise
    }
    
    return result;
  }

  async sendSmtpTest(to: string): Promise<ApiResponse<{ messageId: string }>> {
    return apiClient.post(`/api/settings/v2/email/smtp/test`, { to }) as any;
  }

  async runEmailIngest(): Promise<ApiResponse<{ fetched: number; created: number; replies: number; skipped: number; errors: number }>> {
    return apiClient.post(`/api/email-ingest/run`, {}) as any;
  }

  async testImapConnection(checkFolders?: string[]): Promise<ApiResponse<{ 
    folders: Array<{ name: string; path: string; delimiter: string; flags: string[]; specialUse?: string; subscribed: boolean }>;
    totalFolders: number;
    folderStatus: Record<string, { exists: boolean; messages?: number; unseen?: number; recent?: number; error?: string }>;
    connection: { host: string; port: number; secure: boolean; user: string };
  }>> {
    return apiClient.post(`/api/settings/v2/email/imap/test`, { checkFolders }) as any;
  }

  // Method to manually clear cache (useful for debugging)
  clearCache(): void {
    this.cache.clear();
    this.brandingPromise = null;
  }
}

export const settingsApi = new SettingsApi();


