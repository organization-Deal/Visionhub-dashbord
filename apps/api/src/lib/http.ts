import type { Context, Next } from 'hono';
import type { Bindings } from '../types';

export async function requireAdmin(c: Context<{ Bindings: Bindings }>, next: Next) {
  const expected = c.env.DASHBOARD_ADMIN_TOKEN;
  if (!expected) {
    return c.json({ error: 'DASHBOARD_ADMIN_TOKEN is not configured on the server.' }, 503);
  }

  const auth = c.req.header('Authorization') || '';
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : '';
  if (token !== expected) {
    return c.json({ error: 'Unauthorized' }, 401);
  }

  await next();
}

export function safeJson<T>(value: string | undefined | null, fallback: T): T {
  if (!value) return fallback;
  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}

export function numberValue(value: unknown): number {
  if (typeof value === 'number') return Number.isFinite(value) ? value : 0;
  if (typeof value === 'string') {
    const n = Number(value.replace(/,/g, ''));
    return Number.isFinite(n) ? n : 0;
  }
  return 0;
}

export function extractContentId(text?: string | null): string | null {
  if (!text) return null;
  const match = text.match(/\bVH[-_ ]?\d{4,}\b/i);
  if (!match) return null;
  return match[0].replace(/[_ ]/g, '-').toUpperCase();
}

export function nowIso() {
  return new Date().toISOString();
}
