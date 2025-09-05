export interface Role {
  id: string;
  name: string;
  description?: string;
  isSystem: boolean;
  createdAt: string;
  updatedAt: string;
  permissions?: { permission: Permission }[];
}

export interface Permission {
  id: string;
  key: string;
  description?: string;
}

const withAuth = () => ({
  'Content-Type': 'application/json',
  'Authorization': `Bearer ${localStorage.getItem('auth-token')}`,
});

export const roleService = {
  async list(): Promise<Role[]> {
    const res = await fetch('/api/roles', { headers: withAuth() as any });
    if (!res.ok) throw new Error('Failed to load roles');
    const json = await res.json();
    return json.data;
  },

  async create(data: { name: string; description?: string; isSystem?: boolean; permissionIds?: string[] }): Promise<Role> {
    const res = await fetch('/api/roles', {
      method: 'POST',
      headers: withAuth() as any,
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error('Failed to create role');
    const json = await res.json();
    return json.data;
  },

  async update(id: string, data: { name?: string; description?: string; isSystem?: boolean }): Promise<Role> {
    const res = await fetch(`/api/roles/${id}`, {
      method: 'PUT',
      headers: withAuth() as any,
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error('Failed to update role');
    const json = await res.json();
    return json.data;
  },

  async remove(id: string): Promise<void> {
    const res = await fetch(`/api/roles/${id}`, { method: 'DELETE', headers: withAuth() as any });
    if (!res.ok) throw new Error('Failed to delete role');
  },

  async addPermission(roleId: string, permissionId: string): Promise<void> {
    const res = await fetch(`/api/roles/${roleId}/permissions/${permissionId}` , { method: 'POST', headers: withAuth() as any });
    if (!res.ok) throw new Error('Failed to assign permission');
  },

  async removePermission(roleId: string, permissionId: string): Promise<void> {
    const res = await fetch(`/api/roles/${roleId}/permissions/${permissionId}` , { method: 'DELETE', headers: withAuth() as any });
    if (!res.ok) throw new Error('Failed to remove permission');
  },

  async assignToUser(roleId: string, userId: string, primary?: boolean): Promise<void> {
    const url = `/api/roles/${roleId}/users/${userId}${primary ? '?primary=true' : ''}`;
    const res = await fetch(url, { method: 'POST', headers: withAuth() as any });
    if (!res.ok) throw new Error('Failed to assign role to user');
  },

  async removeFromUser(roleId: string, userId: string): Promise<void> {
    const res = await fetch(`/api/roles/${roleId}/users/${userId}`, { method: 'DELETE', headers: withAuth() as any });
    if (!res.ok) throw new Error('Failed to remove role from user');
  },
};
