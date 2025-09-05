export interface Permission {
  id: string;
  key: string;
  description?: string;
  createdAt: string;
  updatedAt: string;
}

const withAuth = () => ({
  'Content-Type': 'application/json',
  'Authorization': `Bearer ${localStorage.getItem('auth-token')}`,
});

export const permissionService = {
  async list(): Promise<Permission[]> {
    const res = await fetch('/api/permissions', { headers: withAuth() as any });
    if (!res.ok) throw new Error('Failed to load permissions');
    const json = await res.json();
    return json.data;
  },

  async create(data: { key: string; description?: string }): Promise<Permission> {
    const res = await fetch('/api/permissions', { method: 'POST', headers: withAuth() as any, body: JSON.stringify(data) });
    if (!res.ok) throw new Error('Failed to create permission');
    const json = await res.json();
    return json.data;
  },

  async update(id: string, data: { description?: string }): Promise<Permission> {
    const res = await fetch(`/api/permissions/${id}`, { method: 'PUT', headers: withAuth() as any, body: JSON.stringify(data) });
    if (!res.ok) throw new Error('Failed to update permission');
    const json = await res.json();
    return json.data;
  },

  async remove(id: string): Promise<void> {
    const res = await fetch(`/api/permissions/${id}`, { method: 'DELETE', headers: withAuth() as any });
    if (!res.ok) throw new Error('Failed to delete permission');
  },
};
