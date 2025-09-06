import { apiClient, API_ENDPOINTS } from '../api';
import type { ApiResponse } from '../api';

export interface DepartmentDto {
  id: string;
  name: string;
  description?: string | null;
  manager?: { id: string; firstName: string; lastName: string; email: string } | null;
  parentId?: string | null;
  _count?: { users: number; children: number };
}

export interface CreateDepartmentInput {
  name: string;
  description?: string;
  managerId?: string | null;
  parentId?: string | null;
}

export interface UpdateDepartmentInput {
  name?: string;
  description?: string;
  managerId?: string | null;
  parentId?: string | null;
}

export const departmentService = {
  async list(): Promise<ApiResponse<DepartmentDto[]>> {
    return apiClient.get(API_ENDPOINTS.DEPARTMENTS.LIST);
  },

  async get(id: string): Promise<ApiResponse<DepartmentDto>> {
    return apiClient.get(API_ENDPOINTS.DEPARTMENTS.GET(id));
  },

  async create(data: CreateDepartmentInput): Promise<ApiResponse<DepartmentDto>> {
    return apiClient.post(API_ENDPOINTS.DEPARTMENTS.CREATE, data);
  },

  async update(id: string, data: UpdateDepartmentInput): Promise<ApiResponse<DepartmentDto>> {
    return apiClient.put(API_ENDPOINTS.DEPARTMENTS.UPDATE(id), data);
  },

  async remove(id: string): Promise<ApiResponse<void>> {
    return apiClient.delete(API_ENDPOINTS.DEPARTMENTS.DELETE(id));
  },
};


