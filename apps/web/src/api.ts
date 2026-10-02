import type { ConfigStatus, Content, Overview } from './types';

const API_BASE = (import.meta.env.VITE_API_BASE_URL || 'http://localhost:8787').replace(/\/$/, '');

export function getAdminToken() {
  return sessionStorage.getItem('visionhub_admin_token') || '';
}

export function setAdminToken(token: string) {
  if (token) sessionStorage.setItem('visionhub_admin_token', token);
  else sessionStorage.removeItem('visionhub_admin_token');
}

async function request<T>(path: string, init: RequestInit = {}, admin = false): Promise<T> {
  const headers = new Headers(init.headers || {});
  headers.set('Content-Type', 'application/json');
  if (admin) {
    const token = getAdminToken();
    if (token) headers.set('Authorization', `Bearer ${token}`);
  }
  const res = await fetch(`${API_BASE}${path}`, { ...init, headers });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json?.error || `HTTP ${res.status}`);
  return json;
}

export async function getOverview() {
  return (await request<{ data: Overview }>('/api/dashboard/overview')).data;
}

export async function getConfigStatus() {
  return (await request<{ data: ConfigStatus }>('/api/dashboard/config-status')).data;
}

export async function getContents(params: Record<string, string> = {}) {
  const q = new URLSearchParams(params).toString();
  return (await request<{ data: Content[] }>(`/api/contents${q ? `?${q}` : ''}`)).data;
}

export async function getContentDetail(id: string) {
  return (await request<{ data: any }>(`/api/contents/${encodeURIComponent(id)}`)).data;
}

export async function syncService(service: 'lark' | 'meta' | 'tiktok' | 'all') {
  return request<any>(`/api/sync/${service}`, { method: 'POST', body: '{}' }, true);
}

export async function aiReview(contentId: string, transcript = '', notes = '') {
  return request<any>('/api/ai/review', {
    method: 'POST',
    body: JSON.stringify({ content_id: contentId, transcript, notes }),
  }, true);
}

export async function aiBrief(contentId: string) {
  return request<any>('/api/ai/generate-brief', {
    method: 'POST',
    body: JSON.stringify({ content_id: contentId }),
  }, true);
}
