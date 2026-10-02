import type { Bindings } from '../types';
import { extractContentId, numberValue } from '../lib/http';

const TIKTOK_BASE = 'https://open.tiktokapis.com';

async function queryPage(env: Bindings, cursor?: number) {
  if (!env.TIKTOK_ACCESS_TOKEN) throw new Error('TIKTOK_ACCESS_TOKEN not configured');
  const fields = [
    'id',
    'title',
    'video_description',
    'duration',
    'cover_image_url',
    'share_url',
    'embed_link',
    'create_time',
    'like_count',
    'comment_count',
    'share_count',
    'view_count',
  ].join(',');
  const url = `${TIKTOK_BASE}/v2/video/list/?fields=${encodeURIComponent(fields)}`;
  const body: Record<string, unknown> = { max_count: 20 };
  if (cursor) body.cursor = cursor;
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${env.TIKTOK_ACCESS_TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });
  const data = (await res.json()) as any;
  if (!res.ok || (data?.error?.code && data.error.code !== 'ok')) {
    throw new Error(`TikTok error: ${data?.error?.message || res.statusText}`);
  }
  return data;
}

async function contentIdFromVideo(env: Bindings, video: any) {
  const text = `${video.title || ''} ${video.video_description || ''}`;
  const id = extractContentId(text);
  if (!id) return null;
  const row = await env.DB.prepare('SELECT id FROM contents WHERE id = ?').bind(id).first<{ id: string }>();
  return row?.id || null;
}

export async function syncTikTok(env: Bindings) {
  let cursor: number | undefined;
  let processed = 0;

  for (let page = 0; page < 5; page++) {
    const response = await queryPage(env, cursor);
    const videos = response?.data?.videos || [];
    for (const video of videos) {
      const contentId = await contentIdFromVideo(env, video);
      const publishedAt = video.create_time ? new Date(Number(video.create_time) * 1000).toISOString() : null;
      await env.DB.prepare(`
        INSERT INTO platform_posts(content_id,platform,external_post_id,url,caption,published_at,metadata_json,updated_at)
        VALUES(?,?,?,?,?,?,?,datetime('now'))
        ON CONFLICT(platform,external_post_id) DO UPDATE SET
          content_id=COALESCE(excluded.content_id,platform_posts.content_id),
          url=excluded.url,caption=excluded.caption,published_at=excluded.published_at,
          metadata_json=excluded.metadata_json,updated_at=datetime('now')
      `)
        .bind(
          contentId,
          'tiktok',
          String(video.id),
          video.share_url || video.embed_link || null,
          video.video_description || video.title || null,
          publishedAt,
          JSON.stringify(video),
        )
        .run();

      await env.DB.prepare(`
        INSERT INTO performance_snapshots(
          content_id,platform,external_post_id,views,likes,comments,shares,raw_json
        ) VALUES(?,?,?,?,?,?,?,?)
      `)
        .bind(
          contentId,
          'tiktok',
          String(video.id),
          numberValue(video.view_count),
          numberValue(video.like_count),
          numberValue(video.comment_count),
          numberValue(video.share_count),
          JSON.stringify(video),
        )
        .run();
      processed++;
    }

    if (!response?.data?.has_more || !response?.data?.cursor) break;
    cursor = Number(response.data.cursor);
  }
  return { processed };
}
