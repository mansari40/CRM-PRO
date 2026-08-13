import type {
  Activity,
  ActivityWithNames,
  Contact,
  ContactDetail,
  DashboardData,
  Deal,
  DealDetail,
  Organization,
  OrganizationDetail,
} from './types';

async function req<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error((body as { error?: string }).error ?? `Request failed (${res.status})`);
  }
  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

export const api = {
  listOrganizations: (search = '') =>
    req<Organization[]>(`/api/organizations?search=${encodeURIComponent(search)}`),
  getOrganization: (id: number) => req<OrganizationDetail>(`/api/organizations/${id}`),
  createOrganization: (body: Partial<Organization>) =>
    req<Organization>('/api/organizations', { method: 'POST', body: JSON.stringify(body) }),
  updateOrganization: (id: number, body: Partial<Organization>) =>
    req<Organization>(`/api/organizations/${id}`, { method: 'PUT', body: JSON.stringify(body) }),
  deleteOrganization: (id: number) =>
    req<void>(`/api/organizations/${id}`, { method: 'DELETE' }),

  listContacts: (search = '', status = '') =>
    req<Contact[]>(`/api/contacts?search=${encodeURIComponent(search)}&status=${encodeURIComponent(status)}`),
  getContact: (id: number) => req<ContactDetail>(`/api/contacts/${id}`),
  createContact: (body: Partial<Contact>) =>
    req<Contact>('/api/contacts', { method: 'POST', body: JSON.stringify(body) }),
  updateContact: (id: number, body: Partial<Contact>) =>
    req<Contact>(`/api/contacts/${id}`, { method: 'PUT', body: JSON.stringify(body) }),
  deleteContact: (id: number) => req<void>(`/api/contacts/${id}`, { method: 'DELETE' }),

  listDeals: (search = '', stage = '') =>
    req<Deal[]>(`/api/deals?search=${encodeURIComponent(search)}&stage=${encodeURIComponent(stage)}`),
  getDeal: (id: number) => req<DealDetail>(`/api/deals/${id}`),
  createDeal: (body: Partial<Deal>) =>
    req<Deal>('/api/deals', { method: 'POST', body: JSON.stringify(body) }),
  updateDeal: (id: number, body: Partial<Deal>) =>
    req<Deal>(`/api/deals/${id}`, { method: 'PUT', body: JSON.stringify(body) }),
  setDealStage: (id: number, stage: string) =>
    req<Deal>(`/api/deals/${id}/stage`, { method: 'PATCH', body: JSON.stringify({ stage }) }),
  deleteDeal: (id: number) => req<void>(`/api/deals/${id}`, { method: 'DELETE' }),

  listActivities: (contactId?: number, dealId?: number) => {
    const params = new URLSearchParams();
    if (contactId) params.set('contactId', String(contactId));
    if (dealId) params.set('dealId', String(dealId));
    return req<ActivityWithNames[]>(`/api/activities?${params}`);
  },
  createActivity: (body: Partial<Activity>) =>
    req<Activity>('/api/activities', { method: 'POST', body: JSON.stringify(body) }),
  setActivityDone: (id: number, done: boolean) =>
    req<Activity>(`/api/activities/${id}`, { method: 'PATCH', body: JSON.stringify({ done }) }),
  deleteActivity: (id: number) => req<void>(`/api/activities/${id}`, { method: 'DELETE' }),

  dashboard: () => req<DashboardData>('/api/dashboard'),
};
