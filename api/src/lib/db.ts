import type { Bindings, ContentRow } from '../types';

export async function listContents(
  env: Bindings,
  filters: { product?: string; status?: string; owner?: string; q?: string; limit?: number } = {},
) {
  const clauses: string[] = ['1=1'];
  const values: any[] = [];

  if (filters.product) {
    clauses.push('product = ?');
    values.push(filters.product);
  }
  if (filters.status) {
    clauses.push('status = ?');
    values.push(filters.status);
  }
  if (filters.owner) {
    clauses.push('owner = ?');
    values.push(filters.owner);
  }
  if (filters.q) {
    clauses.push('(title LIKE ? OR project LIKE ? OR content_type LIKE ?)');
    const q = `%${filters.q}%`;
    values.push(q, q, q);
  }

  const limit = Math.min(filters.limit || 200, 500);
  values.push(limit);

  const result = await env.DB.prepare(
    `SELECT * FROM contents WHERE ${clauses.join(' AND ')} ORDER BY COALESCE(publish_date, '9999-12-31') ASC, updated_at DESC LIMIT ?`,
  )
    .bind(...values)
    .all<ContentRow>();

  return result.results || [];
}

export async function getContent(env: Bindings, id: string) {
  return env.DB.prepare('SELECT * FROM contents WHERE id = ?').bind(id).first<ContentRow>();
}

export async function upsertContent(env: Bindings, content: Partial<ContentRow> & Pick<ContentRow, 'id' | 'title'>) {
  const current = await getContent(env, content.id);
  const row: ContentRow = {
    id: content.id,
    title: content.title,
    product: content.product || current?.product || 'Corporate',
    project: content.project ?? current?.project ?? null,
    content_type: content.content_type ?? current?.content_type ?? null,
    purpose: content.purpose ?? current?.purpose ?? null,
    platform: content.platform ?? current?.platform ?? null,
    format: content.format ?? current?.format ?? null,
    production_level: content.production_level ?? current?.production_level ?? null,
    camera_required: content.camera_required ?? current?.camera_required ?? null,
    camera_used: content.camera_used ?? current?.camera_used ?? null,
    owner: content.owner ?? current?.owner ?? null,
    status: content.status || current?.status || 'IDEA',
    shoot_date: content.shoot_date ?? current?.shoot_date ?? null,
    publish_date: content.publish_date ?? current?.publish_date ?? null,
    script: content.script ?? current?.script ?? null,
    cta: content.cta ?? current?.cta ?? null,
    source_url: content.source_url ?? current?.source_url ?? null,
    thumbnail_url: content.thumbnail_url ?? current?.thumbnail_url ?? null,
    lark_record_id: content.lark_record_id ?? current?.lark_record_id ?? null,
  };

  await env.DB.prepare(`
    INSERT INTO contents (
      id,lark_record_id,title,product,project,content_type,purpose,platform,format,
      production_level,camera_required,camera_used,owner,status,shoot_date,publish_date,
      script,cta,source_url,thumbnail_url,updated_at
    ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,datetime('now'))
    ON CONFLICT(id) DO UPDATE SET
      lark_record_id=excluded.lark_record_id,
      title=excluded.title,
      product=excluded.product,
      project=excluded.project,
      content_type=excluded.content_type,
      purpose=excluded.purpose,
      platform=excluded.platform,
      format=excluded.format,
      production_level=excluded.production_level,
      camera_required=excluded.camera_required,
      camera_used=excluded.camera_used,
      owner=excluded.owner,
      status=excluded.status,
      shoot_date=excluded.shoot_date,
      publish_date=excluded.publish_date,
      script=excluded.script,
      cta=excluded.cta,
      source_url=excluded.source_url,
      thumbnail_url=excluded.thumbnail_url,
      updated_at=datetime('now')
  `)
    .bind(
      row.id,
      row.lark_record_id,
      row.title,
      row.product,
      row.project,
      row.content_type,
      row.purpose,
      row.platform,
      row.format,
      row.production_level,
      row.camera_required,
      row.camera_used,
      row.owner,
      row.status,
      row.shoot_date,
      row.publish_date,
      row.script,
      row.cta,
      row.source_url,
      row.thumbnail_url,
    )
    .run();

  return getContent(env, content.id);
}

export async function logSync(env: Bindings, service: string, status: string, message: string, items = 0) {
  await env.DB.prepare(
    `INSERT INTO sync_runs(service,status,message,items_processed,finished_at)
     VALUES(?,?,?,?,datetime('now'))`,
  )
    .bind(service, status, message, items)
    .run();
}
