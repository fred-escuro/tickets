import { apiClient, API_ENDPOINTS } from '../api';
import type { ApiResponse } from '../api';

export interface MenuItemDto {
  id: string;
  parentId?: string | null;
  label: string;
  path?: string | null;
  icon?: string | null;
  sortOrder: number;
  isActive: boolean;
  featureFlag?: string | null;
  children: MenuItemDto[];
}

export interface CreateMenuItemInput {
  parentId?: string | null;
  label: string;
  path?: string | null;
  icon?: string | null;
  sortOrder?: number;
  isActive?: boolean;
  featureFlag?: string | null;
}

export interface UpdateMenuItemInput {
  parentId?: string | null;
  label?: string;
  path?: string | null;
  icon?: string | null;
  sortOrder?: number;
  isActive?: boolean;
  featureFlag?: string | null;
}

export const menuService = {
  async getMenu(): Promise<ApiResponse<MenuItemDto[]>> {
    return apiClient.get<MenuItemDto[]>(API_ENDPOINTS.MENU.LIST);
  },

  // Admin: list all items flat with permissions
  async listItems(): Promise<ApiResponse<any[]>> {
    return apiClient.get(API_ENDPOINTS.MENU.ITEMS);
  },

  async createItem(data: CreateMenuItemInput): Promise<ApiResponse<any>> {
    return apiClient.post(API_ENDPOINTS.MENU.ITEMS, data);
  },

  async updateItem(id: string, data: UpdateMenuItemInput): Promise<ApiResponse<any>> {
    return apiClient.put(API_ENDPOINTS.MENU.ITEM(id), data);
  },

  async deleteItem(id: string): Promise<ApiResponse<void>> {
    return apiClient.delete(API_ENDPOINTS.MENU.ITEM(id));
  },

  async linkPermission(id: string, permissionId: string): Promise<ApiResponse<void>> {
    return apiClient.post(API_ENDPOINTS.MENU.LINK_PERMISSION(id, permissionId), {});
  },

  async unlinkPermission(id: string, permissionId: string): Promise<ApiResponse<void>> {
    return apiClient.delete(API_ENDPOINTS.MENU.LINK_PERMISSION(id, permissionId));
  },
};


