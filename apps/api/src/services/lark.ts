import type { Bindings, ContentRow } from '../types';
import { safeJson } from '../lib/http';
import { upsertContent } from '../lib/db';

const LARK_BASE = 'https://open.larksuite.com/open-apis';

type LarkRecord = {
  record_id: string;
  fields: Record<string, unknown>;
};

const defaultFieldMap: Record<string, string> = {
  title: 'ชื่อคอนเทนต์',
  product: 'Product',
  project: 'Project',
  content_type: 'Content Type',
  purpose: 'Purpose',
  platform: 'Platform',
  format: 'Format',
  production_level: 'Production Level',
  camera_required: 'Camera Required',
  camera_used: 'Camera Used',
  owner: 'Owner',
  status: 'Status',
  shoot_date: 'Shoot Date',
  publish_date: 'Publish Date',
  script: 'Script',
  cta: 'CTA',
};

function fieldText(value: unknown): string {
  if (value === null || value === undefined) return '';
  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') return String(value);
  if (Array.isArray(value)) {
    return value
      .map((item) => {
        if (typeof item === 'string' || typeof item === 'number') return String(item);
        if (item && typeof item === 'object') {
          const obj = item as Record<string, unknown>;
          return String(obj.text ?? obj.name ?? obj.value ?? obj.email ?? obj.id ?? '');
        }
        return '';
      })
      .filter(Boolean)
      .join(', ');
  }
  if (typeof value === 'object') {
    const obj = value as Record<string, unknown>;
    return String(obj.text ?? obj.name ?? obj.value ?? obj.link ?? obj.url ?? '');
  }
  return '';
}

function dateText(value: unknown): string | null {
  if (typeof value === 'number') {
    const d = new Date(value);
    return Number.isNaN(d.getTime()) ? null : d.toISOString().slice(0, 10);
  }
  const text = fieldText(value);
  if (!text) return null;
  const n = Number(text);
  if (Number.isFinite(n) && n > 1000000000) {
    const d = new Date(n);
    if (!Number.isNaN(d.getTime())) return d.toISOString().slice(0, 10);
  }
  return text.slice(0, 10);
}

export async function getLarkTenantToken(env: Bindings) {
  if (!env.LARK_APP_ID || !env.LARK_APP_SECRET) throw new Error('LARK_APP_ID / LARK_APP_SECRET not configured');
  const res = await fetch(`${LARK_BASE}/auth/v3/tenant_access_token/internal`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ app_id: env.LARK_APP_ID, app_secret: env.LARK_APP_SECRET }),
  });
  const data = (await res.json()) as { code?: number; msg?: string; tenant_access_token?: string };
  if (!res.ok || data.code !== 0 || !data.tenant_access_token) {
    throw new Error(`Lark auth failed: ${data.msg || res.statusText}`);
  }
  return data.tenant_access_token;
}

async function listLarkRecords(env: Bindings, token: string) {
  if (!env.LARK_BASE_APP_TOKEN || !env.LARK_BASE_TABLE_ID) {
    throw new Error('LARK_BASE_APP_TOKEN / LARK_BASE_TABLE_ID not configured');
  }

  const records: LarkRecord[] = [];
  let pageToken = '';
  for (let i = 0; i < 20; i++) {
    const url = new URL(
      `${LARK_BASE}/bitable/v1/apps/${env.LARK_BASE_APP_TOKEN}/tables/${env.LARK_BASE_TABLE_ID}/records`,
    );
    url.searchParams.set('page_size', '100');
    if (pageToken) url.searchParams.set('page_token', pageToken);

    const res = await fetch(url.toString(), {
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = (await res.json()) as {
      code?: number;
      msg?: string;
      data?: { items?: LarkRecord[]; has_more?: boolean; page_token?: string };
    };
    if (!res.ok || data.code !== 0) throw new Error(`Lark records failed: ${data.msg || res.statusText}`);

    records.push(...(data.data?.items || []));
    if (!data.data?.has_more || !data.data?.page_token) break;
    pageToken = data.data.page_token;
  }
  return records;
}

export async function syncLarkContents(env: Bindings) {
  const token = await getLarkTenantToken(env);
  const records = await listLarkRecords(env, token);
  const fieldMap = { ...defaultFieldMap, ...safeJson<Record<string, string>>(env.LARK_FIELD_MAP, {}) };
  const contentIdField = env.LARK_CONTENT_ID_FIELD || 'Content ID';

  let synced = 0;
  for (const record of records) {
    const f = record.fields || {};
    const title = fieldText(f[fieldMap.title]);
    if (!title) continue;

    const existingId = fieldText(f[contentIdField]);
    const id = existingId || `LARK-${record.record_id}`;
    const row: Partial<ContentRow> & Pick<ContentRow, 'id' | 'title'> = {
      id,
      lark_record_id: record.record_id,
      title,
      product: fieldText(f[fieldMap.product]) || 'Corporate',
      project: fieldText(f[fieldMap.project]) || null,
      content_type: fieldText(f[fieldMap.content_type]) || null,
      purpose: fieldText(f[fieldMap.purpose]) || null,
      platform: fieldText(f[fieldMap.platform]) || null,
      format: fieldText(f[fieldMap.format]) || null,
      production_level: fieldText(f[fieldMap.production_level]) || null,
      camera_required: fieldText(f[fieldMap.camera_required]) || null,
      camera_used: fieldText(f[fieldMap.camera_used]) || null,
      owner: fieldText(f[fieldMap.owner]) || null,
      status: fieldText(f[fieldMap.status]) || 'IDEA',
      shoot_date: dateText(f[fieldMap.shoot_date]),
      publish_date: dateText(f[fieldMap.publish_date]),
      script: fieldText(f[fieldMap.script]) || null,
      cta: fieldText(f[fieldMap.cta]) || null,
    };

    await upsertContent(env, row);
    synced++;
  }

  return { synced, total: records.length };
}
