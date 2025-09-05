export type AccessEffect = 'ALLOW' | 'DENY';
export type PolicySubjectType = 'ROLE' | 'USER' | 'DEPARTMENT';

export interface AccessPolicy {
  id: string;
  name: string;
  description?: string;
  effect: AccessEffect;
  subjectType: PolicySubjectType;
  subjectId?: string | null;
  resource: string;
  action: string;
  conditions?: Record<string, any> | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

const withAuth = () => ({
  'Content-Type': 'application/json',
  'Authorization': `Bearer ${localStorage.getItem('auth-token')}`,
});

export const policyService = {
  async list(): Promise<AccessPolicy[]> {
    const res = await fetch('/api/policies', { headers: withAuth() as any });
    if (!res.ok) throw new Error('Failed to load policies');
    const json = await res.json();
    return json.data;
  },

  async get(id: string): Promise<AccessPolicy> {
    const res = await fetch(`/api/policies/${id}`, { headers: withAuth() as any });
    if (!res.ok) throw new Error('Failed to get policy');
    const json = await res.json();
    return json.data;
  },

  async create(data: Partial<AccessPolicy> & { name: string; subjectType: PolicySubjectType; resource: string; action: string }): Promise<AccessPolicy> {
    const res = await fetch('/api/policies', { method: 'POST', headers: withAuth() as any, body: JSON.stringify(data) });
    if (!res.ok) throw new Error('Failed to create policy');
    const json = await res.json();
    return json.data;
  },

  async update(id: string, data: Partial<AccessPolicy>): Promise<AccessPolicy> {
    const res = await fetch(`/api/policies/${id}`, { method: 'PUT', headers: withAuth() as any, body: JSON.stringify(data) });
    if (!res.ok) throw new Error('Failed to update policy');
    const json = await res.json();
    return json.data;
  },

  async remove(id: string): Promise<void> {
    const res = await fetch(`/api/policies/${id}`, { method: 'DELETE', headers: withAuth() as any });
    if (!res.ok) throw new Error('Failed to delete policy');
  },
};
