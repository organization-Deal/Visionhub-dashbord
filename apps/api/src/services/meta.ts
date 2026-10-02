import type { Bindings } from '../types';
import { extractContentId, numberValue } from '../lib/http';

function baseUrl(env: Bindings) {
  return `https://graph.facebook.com/${env.META_GRAPH_VERSION || 'v25.0'}`;
}

async function graphGet(env: Bindings, path: string, params: Record<string, string> = {}) {
  if (!env.META_ACCESS_TOKEN) throw new Error('META_ACCESS_TOKEN not configured');
  const url = new URL(`${baseUrl(env)}/${path.replace(/^\//, '')}`);
  Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));
  url.searchParams.set('access_token', env.META_ACCESS_TOKEN);
  const res = await fetch(url.toString());
  const data = (await res.json()) as any;
  if (!res.ok || data?.error) throw new Error(`Meta error: ${data?.error?.message || res.statusText}`);
  return data;
}

function parseInsightValue(item: any): number {
  if (typeof item?.total_value?.value === 'number') return item.total_value.value;
  const values = item?.values || [];
  if (values.length) return numberValue(values[values.length - 1]?.value);
  return 0;
}

async function getMediaInsights(env: Bindings, mediaId: string) {
  const metrics = (env.META_MEDIA_METRICS || 'views,reach,shares,saved')
    .split(',')
    .map((v) => v.trim())
    .filter(Boolean);
  const result: Record<string, number> = {};

  // Query one metric at a time so an unavailable metric does not break the entire sync.
  for (const metric of metrics) {
    try {
      const data = await graphGet(env, `${mediaId}/insights`, { metric });
      const item = data?.data?.[0];
      if (item) result[metric] = parseInsightValue(item);
    } catch {
      result[metric] = 0;
    }
  }
  return result;
}

async function findContentByText(env: Bindings, text: string) {
  const contentId = extractContentId(text);
  if (contentId) {
    const row = await env.DB.prepare('SELECT id FROM contents WHERE id = ?').bind(contentId).first<{ id: string }>();
    if (row?.id) return row.id;
  }
  return null;
}

export async function syncInstagram(env: Bindings) {
  if (!env.META_IG_USER_ID) throw new Error('META_IG_USER_ID not configured');
  const data = await graphGet(env, `${env.META_IG_USER_ID}/media`, {
    fields: 'id,caption,media_type,media_product_type,permalink,timestamp,like_count,comments_count',
    limit: '50',
  });

  let processed = 0;
  for (const media of data?.data || []) {
    const caption = String(media.caption || '');
    const contentId = await findContentByText(env, caption);
    const insights = await getMediaInsights(env, String(media.id));

    await env.DB.prepare(`
      INSERT INTO platform_posts(content_id,platform,external_post_id,url,caption,published_at,metadata_json,updated_at)
      VALUES(?,?,?,?,?,?,?,datetime('now'))
      ON CONFLICT(platform,external_post_id) DO UPDATE SET
        content_id=COALESCE(excluded.content_id,platform_posts.content_id),
        url=excluded.url, caption=excluded.caption, published_at=excluded.published_at,
        metadata_json=excluded.metadata_json, updated_at=datetime('now')
    `)
      .bind(contentId, 'instagram', String(media.id), media.permalink || null, caption, media.timestamp || null, JSON.stringify(media))
      .run();

    await env.DB.prepare(`
      INSERT INTO performance_snapshots(
        content_id,platform,external_post_id,views,reach,likes,comments,shares,saves,raw_json
      ) VALUES(?,?,?,?,?,?,?,?,?,?)
    `)
      .bind(
        contentId,
        'instagram',
        String(media.id),
        numberValue(insights.views),
        numberValue(insights.reach),
        numberValue(media.like_count),
        numberValue(media.comments_count),
        numberValue(insights.shares),
        numberValue(insights.saved),
        JSON.stringify({ media, insights }),
      )
      .run();
    processed++;
  }
  return { processed };
}

function sumLeadActions(actions: any[]): number {
  let total = 0;
  for (const action of actions || []) {
    const type = String(action?.action_type || '').toLowerCase();
    if (type === 'lead' || type.includes('lead')) total += numberValue(action?.value);
  }
  return total;
}

export async function syncMetaAds(env: Bindings) {
  if (!env.META_AD_ACCOUNT_ID) return { processed: 0, skipped: true, message: 'META_AD_ACCOUNT_ID not configured' };
  const account = env.META_AD_ACCOUNT_ID.startsWith('act_') ? env.META_AD_ACCOUNT_ID : `act_${env.META_AD_ACCOUNT_ID}`;
  const data = await graphGet(env, `${account}/insights`, {
    fields: 'campaign_id,campaign_name,adset_id,adset_name,ad_id,ad_name,spend,impressions,reach,clicks,ctr,cpc,actions',
    date_preset: 'last_30d',
    level: 'ad',
    limit: '500',
  });

  let processed = 0;
  for (const ad of data?.data || []) {
    const text = [ad.ad_name, ad.adset_name, ad.campaign_name].filter(Boolean).join(' ');
    const contentId = await findContentByText(env, text);
    await env.DB.prepare(`
      INSERT INTO performance_snapshots(
        content_id,platform,external_post_id,impressions,reach,clicks,spend,leads,raw_json
      ) VALUES(?,?,?,?,?,?,?,?,?)
    `)
      .bind(
        contentId,
        'meta_ads',
        String(ad.ad_id || ''),
        numberValue(ad.impressions),
        numberValue(ad.reach),
        numberValue(ad.clicks),
        numberValue(ad.spend),
        sumLeadActions(ad.actions || []),
        JSON.stringify(ad),
      )
      .run();
    processed++;
  }
  return { processed };
}

export async function syncMeta(env: Bindings) {
  const instagram = await syncInstagram(env);
  const ads = await syncMetaAds(env);
  return { instagram, ads };
}
