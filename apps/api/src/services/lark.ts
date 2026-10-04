import type { Bindings, ContentRow } from '../types';
import { upsertContent } from '../lib/db';

const LARK_BASE = 'https://open.larksuite.com/open-apis';
const BATCH_SIZE = 100;

type LarkRecord = {
  record_id: string;
  fields: Record<string, unknown>;
};

type LarkField = {
  field_id?: string;
  field_name?: string;
  type?: number;
  ui_type?: string;
  property?: unknown;
};

const WORK_FIELDS = {
  content_code: 'รหัสคอนเทนต์',
  title: 'ชื่อคอนเทนต์',
  product: 'สินค้า',
  project: 'โปรเจกต์',
  content_type: 'ประเภทคอนเทนต์',
  purpose: 'เป้าหมายคอนเทนต์',
  platform: 'แพลตฟอร์ม',
  format: 'รูปแบบคอนเทนต์',
  production_level: 'ระดับงานผลิต',
  camera_required: 'กล้องที่ต้องใช้',
  camera_used: 'กล้องที่ใช้จริง',
  owner: 'ผู้รับผิดชอบหลัก',
  cameraman: 'คนถ่าย',
  editor: 'คนตัดต่อ',
  reviewer: 'คนตรวจงาน',
  status: 'สถานะงาน',
  shoot_date: 'วันที่ต้องถ่าย',
  planned_publish_date: 'วันที่ต้องลง',
  location: 'สถานที่ถ่าย',
  hook: 'Hook',
  key_message: 'สารหลักที่ต้องการสื่อ',
  script: 'สคริปต์',
  shot_list: 'Shot List',
  cta: 'CTA',
  notes: 'หมายเหตุทีม',
  source_url: 'ลิงก์โพสต์จริง',
} as const;

const DATA_FIELDS = {
  content_code: 'รหัสคอนเทนต์',
  lark_record_id: 'Lark Record ID',
  title: 'ชื่อคอนเทนต์',
  product: 'สินค้า',
  project: 'โปรเจกต์',
  content_type: 'ประเภทคอนเทนต์',
  purpose: 'เป้าหมายคอนเทนต์',
  platform: 'แพลตฟอร์ม',
  production_level: 'ระดับงานผลิต',
  camera_required: 'กล้องที่ต้องใช้',
  camera_used: 'กล้องที่ใช้จริง',
  publish_date: 'วันที่เผยแพร่',
  last_lark_sync: 'Last Lark Sync',
  sync_status: 'Sync Status',
  api_error: 'API Error',
  updated_at: 'Updated At',
} as const;

function workTableId(env: Bindings) {
  return env.LARK_WORK_TABLE_ID || env.LARK_BASE_TABLE_ID || '';
}

function dataTableId(env: Bindings) {
  return env.LARK_DATA_TABLE_ID || '';
}

function chunk<T>(items: T[], size = BATCH_SIZE): T[][] {
  const result: T[][] = [];
  for (let i = 0; i < items.length; i += size) result.push(items.slice(i, i + size));
  return result;
}

function fieldText(value: unknown): string {
  if (value === null || value === undefined) return '';
  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') return String(value);
  if (Array.isArray(value)) {
    return value
      .map((item) => {
        if (typeof item === 'string' || typeof item === 'number') return String(item);
        if (item && typeof item === 'object') {
          const obj = item as Record<string, unknown>;
          return String(obj.text ?? obj.name ?? obj.value ?? obj.email ?? obj.id ?? obj.open_id ?? '');
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

function bangkokDateFromMs(ms: number): string | null {
  const d = new Date(ms);
  if (Number.isNaN(d.getTime())) return null;
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Bangkok',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(d);
  const get = (type: string) => parts.find((part) => part.type === type)?.value || '';
  const y = get('year');
  const m = get('month');
  const day = get('day');
  return y && m && day ? `${y}-${m}-${day}` : null;
}

function dateText(value: unknown): string | null {
  if (typeof value === 'number') return bangkokDateFromMs(value);

  const text = fieldText(value).trim();
  if (!text) return null;

  // Lark DateTime fields are commonly returned as Unix milliseconds.
  const n = Number(text);
  if (Number.isFinite(n) && n > 1000000000) return bangkokDateFromMs(n);

  // A plain YYYY-MM-DD value is already a local calendar date. Do not parse
  // it through UTC because that can shift the date backwards in Thailand.
  const plainDate = text.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (plainDate) return `${plainDate[1]}-${plainDate[2]}-${plainDate[3]}`;

  const d = new Date(text);
  return Number.isNaN(d.getTime()) ? text.slice(0, 10) : bangkokDateFromMs(d.getTime());
}

function contentPrefix(fields: Record<string, unknown>) {
  const preferredDate = dateText(fields[WORK_FIELDS.planned_publish_date]) || dateText(fields[WORK_FIELDS.shoot_date]);
  const d = preferredDate ? new Date(`${preferredDate}T00:00:00Z`) : new Date();
  const yy = String(d.getUTCFullYear()).slice(-2);
  const mm = String(d.getUTCMonth() + 1).padStart(2, '0');
  return `${yy}${mm}`;
}

function normalizeContentCode(value: string) {
  const text = value.trim().toUpperCase().replace(/_/g, '-').replace(/\s+/g, '');
  const match = text.match(/^VH-(\d{4})-(\d{1,6})$/);
  if (!match) return '';
  return `VH-${match[1]}-${String(Number(match[2])).padStart(3, '0')}`;
}

async function larkJson<T>(token: string, url: string, init: RequestInit = {}): Promise<T> {
  const res = await fetch(url, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json; charset=utf-8',
      ...(init.headers || {}),
    },
  });
  const data = (await res.json()) as any;
  if (!res.ok || data?.code !== 0) {
    throw new Error(`Lark API failed: ${data?.msg || res.statusText}`);
  }
  return data as T;
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

async function listLarkRecords(env: Bindings, token: string, tableId: string) {
  if (!env.LARK_BASE_APP_TOKEN || !tableId) throw new Error('LARK_BASE_APP_TOKEN / table id not configured');

  const records: LarkRecord[] = [];
  let pageToken = '';
  for (let i = 0; i < 50; i++) {
    const url = new URL(`${LARK_BASE}/bitable/v1/apps/${env.LARK_BASE_APP_TOKEN}/tables/${tableId}/records`);
    url.searchParams.set('page_size', '100');
    if (pageToken) url.searchParams.set('page_token', pageToken);

    const data = await larkJson<{
      code: number;
      data?: { items?: LarkRecord[]; has_more?: boolean; page_token?: string };
    }>(token, url.toString());

    records.push(...(data.data?.items || []));
    if (!data.data?.has_more || !data.data?.page_token) break;
    pageToken = data.data.page_token;
  }
  return records;
}

export async function listLarkFields(env: Bindings, target: 'work' | 'data' = 'work') {
  const token = await getLarkTenantToken(env);
  const tableId = target === 'data' ? dataTableId(env) : workTableId(env);
  if (!env.LARK_BASE_APP_TOKEN || !tableId) throw new Error(`Lark ${target} table is not configured`);

  const fields: LarkField[] = [];
  let pageToken = '';
  for (let i = 0; i < 20; i++) {
    const url = new URL(`${LARK_BASE}/bitable/v1/apps/${env.LARK_BASE_APP_TOKEN}/tables/${tableId}/fields`);
    url.searchParams.set('page_size', '100');
    if (pageToken) url.searchParams.set('page_token', pageToken);
    const data = await larkJson<{
      code: number;
      data?: { items?: LarkField[]; has_more?: boolean; page_token?: string };
    }>(token, url.toString());
    fields.push(...(data.data?.items || []));
    if (!data.data?.has_more || !data.data?.page_token) break;
    pageToken = data.data.page_token;
  }
  return fields;
}

async function batchUpdateRecords(
  env: Bindings,
  token: string,
  tableId: string,
  records: Array<{ record_id: string; fields: Record<string, unknown> }>,
) {
  if (!records.length) return 0;
  let processed = 0;
  for (const group of chunk(records)) {
    await larkJson(token, `${LARK_BASE}/bitable/v1/apps/${env.LARK_BASE_APP_TOKEN}/tables/${tableId}/records/batch_update`, {
      method: 'POST',
      body: JSON.stringify({ records: group }),
    });
    processed += group.length;
  }
  return processed;
}

async function batchCreateRecords(
  env: Bindings,
  token: string,
  tableId: string,
  records: Array<{ fields: Record<string, unknown> }>,
) {
  if (!records.length) return 0;
  let processed = 0;
  for (const group of chunk(records)) {
    await larkJson(token, `${LARK_BASE}/bitable/v1/apps/${env.LARK_BASE_APP_TOKEN}/tables/${tableId}/records/batch_create`, {
      method: 'POST',
      body: JSON.stringify({ records: group }),
    });
    processed += group.length;
  }
  return processed;
}


type LarkWriteFailure = {
  record_id?: string;
  content_code?: string;
  message: string;
};

async function resilientUpdateDataRecords(
  env: Bindings,
  token: string,
  tableId: string,
  records: Array<{ record_id: string; fields: Record<string, unknown> }>,
) {
  let processed = 0;
  const failures: LarkWriteFailure[] = [];

  const write = async (group: Array<{ record_id: string; fields: Record<string, unknown> }>): Promise<void> => {
    if (!group.length) return;
    try {
      await larkJson(token, `${LARK_BASE}/bitable/v1/apps/${env.LARK_BASE_APP_TOKEN}/tables/${tableId}/records/batch_update`, {
        method: 'POST',
        body: JSON.stringify({ records: group }),
      });
      processed += group.length;
    } catch (error) {
      if (group.length > 1) {
        const mid = Math.ceil(group.length / 2);
        await write(group.slice(0, mid));
        await write(group.slice(mid));
        return;
      }

      const item = group[0];
      const message = error instanceof Error ? error.message : String(error);
      failures.push({
        record_id: item.record_id,
        content_code: fieldText(item.fields[DATA_FIELDS.content_code]),
        message,
      });

      // Best-effort: keep the failed record visible in DATA & AI.
      try {
        await larkJson(token, `${LARK_BASE}/bitable/v1/apps/${env.LARK_BASE_APP_TOKEN}/tables/${tableId}/records/batch_update`, {
          method: 'POST',
          body: JSON.stringify({
            records: [{
              record_id: item.record_id,
              fields: {
                [DATA_FIELDS.sync_status]: 'Error',
                [DATA_FIELDS.api_error]: message,
                [DATA_FIELDS.last_lark_sync]: Date.now(),
                [DATA_FIELDS.updated_at]: Date.now(),
              },
            }],
          }),
        });
      } catch {
        // Keep the failure in the API result even if the error marker cannot be written.
      }
    }
  };

  for (const group of chunk(records)) await write(group);
  return { processed, failures };
}

async function resilientCreateDataRecords(
  env: Bindings,
  token: string,
  tableId: string,
  records: Array<{ fields: Record<string, unknown> }>,
) {
  let processed = 0;
  const failures: LarkWriteFailure[] = [];

  const write = async (group: Array<{ fields: Record<string, unknown> }>): Promise<void> => {
    if (!group.length) return;
    try {
      await larkJson(token, `${LARK_BASE}/bitable/v1/apps/${env.LARK_BASE_APP_TOKEN}/tables/${tableId}/records/batch_create`, {
        method: 'POST',
        body: JSON.stringify({ records: group }),
      });
      processed += group.length;
    } catch (error) {
      if (group.length > 1) {
        const mid = Math.ceil(group.length / 2);
        await write(group.slice(0, mid));
        await write(group.slice(mid));
        return;
      }

      const item = group[0];
      const message = error instanceof Error ? error.message : String(error);
      const contentCode = fieldText(item.fields[DATA_FIELDS.content_code]);
      failures.push({ content_code: contentCode, message });

      // Best-effort fallback row containing only identity + error state.
      try {
        await larkJson(token, `${LARK_BASE}/bitable/v1/apps/${env.LARK_BASE_APP_TOKEN}/tables/${tableId}/records/batch_create`, {
          method: 'POST',
          body: JSON.stringify({
            records: [{
              fields: compactFields({
                [DATA_FIELDS.content_code]: contentCode,
                [DATA_FIELDS.lark_record_id]: fieldText(item.fields[DATA_FIELDS.lark_record_id]),
                [DATA_FIELDS.title]: fieldText(item.fields[DATA_FIELDS.title]) || '(Sync Error)',
                [DATA_FIELDS.sync_status]: 'Error',
                [DATA_FIELDS.api_error]: message,
                [DATA_FIELDS.last_lark_sync]: Date.now(),
                [DATA_FIELDS.updated_at]: Date.now(),
              }),
            }],
          }),
        });
        processed += 1;
      } catch {
        // Keep the failure in the API result.
      }
    }
  };

  for (const group of chunk(records)) await write(group);
  return { processed, failures };
}

function assignContentCodes(records: LarkRecord[]) {
  const maxByPrefix = new Map<string, number>();
  const codeByRecord = new Map<string, string>();
  const updates: Array<{ record_id: string; fields: Record<string, unknown> }> = [];

  for (const record of records) {
    const code = normalizeContentCode(fieldText(record.fields?.[WORK_FIELDS.content_code]));
    if (!code) continue;
    codeByRecord.set(record.record_id, code);
    const match = code.match(/^VH-(\d{4})-(\d+)$/);
    if (match) maxByPrefix.set(match[1], Math.max(maxByPrefix.get(match[1]) || 0, Number(match[2])));
  }

  const missing = records
    .filter((record) => fieldText(record.fields?.[WORK_FIELDS.title]).trim() && !codeByRecord.has(record.record_id))
    .sort((a, b) => {
      const da = dateText(a.fields?.[WORK_FIELDS.planned_publish_date]) || dateText(a.fields?.[WORK_FIELDS.shoot_date]) || '9999-12-31';
      const db = dateText(b.fields?.[WORK_FIELDS.planned_publish_date]) || dateText(b.fields?.[WORK_FIELDS.shoot_date]) || '9999-12-31';
      return da.localeCompare(db) || a.record_id.localeCompare(b.record_id);
    });

  for (const record of missing) {
    const prefix = contentPrefix(record.fields || {});
    const next = (maxByPrefix.get(prefix) || 0) + 1;
    maxByPrefix.set(prefix, next);
    const code = `VH-${prefix}-${String(next).padStart(3, '0')}`;
    codeByRecord.set(record.record_id, code);
    updates.push({ record_id: record.record_id, fields: { [WORK_FIELDS.content_code]: code } });
  }

  return { codeByRecord, updates };
}

function compactFields(fields: Record<string, unknown>) {
  // Keep null / empty-string values because Lark uses them to clear stale fields.
  // Only omit undefined, which means "do not touch this field".
  return Object.fromEntries(Object.entries(fields).filter(([, value]) => value !== undefined));
}

function mapWorkRecord(record: LarkRecord, contentCode: string): Partial<ContentRow> & Pick<ContentRow, 'id' | 'title'> {
  const f = record.fields || {};
  const title = fieldText(f[WORK_FIELDS.title]).trim();
  return {
    id: `LARK-${record.record_id}`,
    content_code: contentCode,
    lark_record_id: record.record_id,
    title,
    product: fieldText(f[WORK_FIELDS.product]) || 'ไม่ระบุ',
    project: fieldText(f[WORK_FIELDS.project]) || null,
    content_type: fieldText(f[WORK_FIELDS.content_type]) || null,
    purpose: fieldText(f[WORK_FIELDS.purpose]) || null,
    platform: fieldText(f[WORK_FIELDS.platform]) || null,
    format: fieldText(f[WORK_FIELDS.format]) || null,
    production_level: fieldText(f[WORK_FIELDS.production_level]) || null,
    camera_required: fieldText(f[WORK_FIELDS.camera_required]) || null,
    camera_used: fieldText(f[WORK_FIELDS.camera_used]) || null,
    owner: fieldText(f[WORK_FIELDS.owner]) || null,
    cameraman: fieldText(f[WORK_FIELDS.cameraman]) || null,
    editor: fieldText(f[WORK_FIELDS.editor]) || null,
    reviewer: fieldText(f[WORK_FIELDS.reviewer]) || null,
    status: fieldText(f[WORK_FIELDS.status]) || 'ไอเดีย',
    shoot_date: dateText(f[WORK_FIELDS.shoot_date]),
    planned_publish_date: dateText(f[WORK_FIELDS.planned_publish_date]),
    location: fieldText(f[WORK_FIELDS.location]) || null,
    hook: fieldText(f[WORK_FIELDS.hook]) || null,
    key_message: fieldText(f[WORK_FIELDS.key_message]) || null,
    script: fieldText(f[WORK_FIELDS.script]) || null,
    shot_list: fieldText(f[WORK_FIELDS.shot_list]) || null,
    cta: fieldText(f[WORK_FIELDS.cta]) || null,
    notes: fieldText(f[WORK_FIELDS.notes]) || null,
    source_url: fieldText(f[WORK_FIELDS.source_url]) || null,
  };
}

type WorkSyncError = {
  record_id: string;
  content_code: string;
  title: string;
  message: string;
};

async function syncDataTable(
  env: Bindings,
  token: string,
  rows: ContentRow[],
  workErrors: WorkSyncError[] = [],
) {
  const tableId = dataTableId(env);
  if (!tableId) {
    return {
      skipped: true,
      reason: 'LARK_DATA_TABLE_ID not configured',
      created: 0,
      updated: 0,
      error_records: workErrors,
    };
  }

  const existing = await listLarkRecords(env, token, tableId);
  const byCode = new Map<string, LarkRecord>();
  const byLarkRecord = new Map<string, LarkRecord>();
  for (const record of existing) {
    const code = normalizeContentCode(fieldText(record.fields?.[DATA_FIELDS.content_code]));
    const larkRecordId = fieldText(record.fields?.[DATA_FIELDS.lark_record_id]);
    if (code) byCode.set(code, record);
    if (larkRecordId) byLarkRecord.set(larkRecordId, record);
  }

  const now = new Date().toISOString();
  const nowMs = Date.now();
  const creates: Array<{ fields: Record<string, unknown> }> = [];
  const updates: Array<{ record_id: string; fields: Record<string, unknown> }> = [];

  for (const row of rows) {
    if (!row.content_code) continue;
    const fields = compactFields({
      [DATA_FIELDS.content_code]: row.content_code,
      [DATA_FIELDS.lark_record_id]: row.lark_record_id || '',
      [DATA_FIELDS.title]: row.title,
      [DATA_FIELDS.product]: row.product,
      [DATA_FIELDS.project]: row.project || '',
      [DATA_FIELDS.content_type]: row.content_type || '',
      [DATA_FIELDS.purpose]: row.purpose || '',
      [DATA_FIELDS.platform]: row.platform || '',
      [DATA_FIELDS.production_level]: row.production_level || '',
      [DATA_FIELDS.camera_required]: row.camera_required || '',
      [DATA_FIELDS.camera_used]: row.camera_used || '',

      // IMPORTANT: never write DATA & AI "วันที่เผยแพร่" from WORK.
      // It is reserved for the actual platform timestamp and will be maintained
      // by the Meta/platform sync. Omitting the field also prevents hourly Lark
      // syncs from clearing a real published date later.

      [DATA_FIELDS.last_lark_sync]: nowMs,
      [DATA_FIELDS.sync_status]: 'Sync สำเร็จ',
      [DATA_FIELDS.api_error]: '',
      [DATA_FIELDS.updated_at]: nowMs,
    });

    const current = byCode.get(row.content_code) || (row.lark_record_id ? byLarkRecord.get(row.lark_record_id) : undefined);
    if (current) updates.push({ record_id: current.record_id, fields });
    else creates.push({ fields });
  }

  // A failed WORK record must not keep an old "Sync สำเร็จ" status.
  for (const failure of workErrors) {
    const fields = compactFields({
      [DATA_FIELDS.content_code]: failure.content_code || '',
      [DATA_FIELDS.lark_record_id]: failure.record_id,
      [DATA_FIELDS.title]: failure.title || '(ไม่มีชื่อ)',
      [DATA_FIELDS.last_lark_sync]: nowMs,
      [DATA_FIELDS.sync_status]: 'Error',
      [DATA_FIELDS.api_error]: failure.message,
      [DATA_FIELDS.updated_at]: nowMs,
    });

    const current =
      (failure.content_code ? byCode.get(failure.content_code) : undefined) ||
      byLarkRecord.get(failure.record_id);

    if (current) updates.push({ record_id: current.record_id, fields });
    else creates.push({ fields });
  }

  const [updateResult, createResult] = await Promise.all([
    resilientUpdateDataRecords(env, token, tableId, updates),
    resilientCreateDataRecords(env, token, tableId, creates),
  ]);

  return {
    created: createResult.processed,
    updated: updateResult.processed,
    total_existing: existing.length,
    synced_at: now,
    error_records: workErrors,
    lark_write_errors: [...updateResult.failures, ...createResult.failures],
  };
}

export async function syncLarkContents(env: Bindings) {
  const token = await getLarkTenantToken(env);
  const tableId = workTableId(env);
  if (!tableId) throw new Error('LARK_WORK_TABLE_ID / LARK_BASE_TABLE_ID not configured');

  const records = await listLarkRecords(env, token, tableId);
  const { codeByRecord, updates: contentCodeUpdates } = assignContentCodes(records);

  if (contentCodeUpdates.length) {
    await batchUpdateRecords(env, token, tableId, contentCodeUpdates);
  }

  const syncedRows: ContentRow[] = [];
  const skippedRecords: Array<{ record_id: string; reason: string }> = [];
  const errorRecords: WorkSyncError[] = [];

  for (const record of records) {
    const title = fieldText(record.fields?.[WORK_FIELDS.title]).trim();
    if (!title) {
      skippedRecords.push({ record_id: record.record_id, reason: 'ชื่อคอนเทนต์ว่าง' });
      continue;
    }

    const code = codeByRecord.get(record.record_id);
    if (!code) {
      errorRecords.push({
        record_id: record.record_id,
        content_code: '',
        title,
        message: 'ไม่สามารถสร้างหรืออ่านรหัสคอนเทนต์ได้',
      });
      continue;
    }

    try {
      const mapped = mapWorkRecord(record, code);
      const saved = await upsertContent(env, mapped);
      if (saved) syncedRows.push(saved);
    } catch (error) {
      errorRecords.push({
        record_id: record.record_id,
        content_code: code,
        title,
        message: error instanceof Error ? error.message : String(error),
      });
    }
  }

  // Repair legacy rows where the old WORK planned date leaked into publish_date.
  // Keep publish_date only when we have an actual platform post timestamp.
  const cleanupResult = await env.DB.prepare(`
    UPDATE contents
    SET publish_date = NULL
    WHERE publish_date IS NOT NULL
      AND NOT EXISTS (
        SELECT 1
        FROM platform_posts p
        WHERE p.content_id = contents.id
          AND p.published_at IS NOT NULL
      )
  `).run();

  const legacyPublishDatesCleared = Number((cleanupResult as any)?.meta?.changes || 0);

  const dataAi = await syncDataTable(env, token, syncedRows, errorRecords);

  return {
    mapping_version: '2.3-date-guard',
    synced: syncedRows.length,
    total: records.length,
    skipped: skippedRecords.length,
    errors: errorRecords.length,
    generated_content_ids: contentCodeUpdates.length,
    legacy_publish_dates_cleared: legacyPublishDatesCleared,
    skipped_records: skippedRecords,
    error_records: errorRecords,
    data_ai: dataAi,
  };
}
