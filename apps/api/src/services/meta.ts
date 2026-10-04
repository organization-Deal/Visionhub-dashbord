import type { Bindings } from '../types';
import { extractContentId, numberValue } from '../lib/http';
import { syncMetaMetricsToDataTable, type MetaDataUpdate } from './lark';

const META_VERSION = '3.3-token-exchange';

type ContentIndexRow = {
  id: string;
  content_code: string | null;
  title: string;
  source_url: string | null;
  planned_publish_date: string | null;
  publish_date: string | null;
};

type MatchResult = {
  id: string;
  content_code: string;
  method: 'existing_media_id' | 'permalink' | 'content_code' | 'title_exact' | 'title_similarity';
  confidence: number;
};

function baseUrl(env: Bindings) {
  return `https://graph.facebook.com/${env.META_GRAPH_VERSION || 'v25.0'}`;
}

function bangkokDateFromTimestamp(value: unknown): string | null {
  const text = String(value || '').trim();
  if (!text) return null;
  const d = new Date(text);
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

function normalizeUrl(value: unknown) {
  const raw = String(value || '').trim();
  if (!raw) return '';
  try {
    const url = new URL(raw);
    url.hash = '';
    url.search = '';
    return `${url.origin}${url.pathname.replace(/\/+$/, '')}`.toLowerCase();
  } catch {
    return raw.replace(/[?#].*$/, '').replace(/\/+$/, '').toLowerCase();
  }
}

function normalizeText(value: unknown) {
  return String(value || '')
    .normalize('NFKC')
    .toLowerCase()
    .replace(/https?:\/\/\S+/g, ' ')
    .replace(/[#@][^\s]+/g, ' ')
    .replace(/[\u200B-\u200D\uFEFF]/g, '')
    .replace(/[^\p{L}\p{N}]+/gu, '')
    .trim();
}

function ngrams(text: string, n = 3) {
  const result = new Set<string>();
  if (text.length < n) {
    if (text) result.add(text);
    return result;
  }
  for (let i = 0; i <= text.length - n; i++) result.add(text.slice(i, i + n));
  return result;
}

function diceSimilarity(a: string, b: string) {
  if (!a || !b) return 0;
  if (a === b) return 1;
  const aa = ngrams(a);
  const bb = ngrams(b);
  if (!aa.size || !bb.size) return 0;
  let overlap = 0;
  for (const token of aa) if (bb.has(token)) overlap++;
  return (2 * overlap) / (aa.size + bb.size);
}

function dayDistance(a: string | null, b: string | null) {
  if (!a || !b) return Number.POSITIVE_INFINITY;
  const aa = Date.parse(`${a}T00:00:00Z`);
  const bb = Date.parse(`${b}T00:00:00Z`);
  if (!Number.isFinite(aa) || !Number.isFinite(bb)) return Number.POSITIVE_INFINITY;
  return Math.abs(aa - bb) / 86400000;
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

async function graphGetPaged(
  env: Bindings,
  path: string,
  params: Record<string, string> = {},
  maxPages = 10,
) {
  const first = await graphGet(env, path, params);
  const items = [...(first?.data || [])];
  let next = first?.paging?.next ? String(first.paging.next) : '';
  let page = 1;

  while (next && page < maxPages) {
    const res = await fetch(next);
    const data = (await res.json()) as any;
    if (!res.ok || data?.error) throw new Error(`Meta error: ${data?.error?.message || res.statusText}`);
    items.push(...(data?.data || []));
    next = data?.paging?.next ? String(data.paging.next) : '';
    page++;
  }
  return { data: items, pages: page };
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

async function loadContentIndex(env: Bindings) {
  const result = await env.DB.prepare(`
    SELECT id, content_code, title, source_url, planned_publish_date, publish_date
    FROM contents
    WHERE content_code IS NOT NULL AND content_code <> ''
  `).all<ContentIndexRow>();

  const rows = result.results || [];
  const byCode = new Map<string, ContentIndexRow>();
  const byUrl = new Map<string, ContentIndexRow>();
  for (const row of rows) {
    if (row.content_code) byCode.set(row.content_code.toUpperCase(), row);
    const url = normalizeUrl(row.source_url);
    if (url) byUrl.set(url, row);
  }
  return { rows, byCode, byUrl };
}

async function loadExistingInstagramMatches(env: Bindings) {
  const result = await env.DB.prepare(`
    SELECT p.external_post_id, p.content_id, c.content_code
    FROM platform_posts p
    JOIN contents c ON c.id = p.content_id
    WHERE p.platform = 'instagram' AND p.content_id IS NOT NULL
  `).all<{ external_post_id: string; content_id: string; content_code: string }>();

  return new Map((result.results || []).map((row) => [String(row.external_post_id), row]));
}

function matchByTitle(rows: ContentIndexRow[], caption: string, actualDate: string | null): MatchResult | null {
  const captionNorm = normalizeText(caption);
  if (captionNorm.length < 8) return null;

  const candidates = rows.filter((row) => {
    const titleNorm = normalizeText(row.title);
    if (titleNorm.length < 8) return false;
    return dayDistance(row.planned_publish_date, actualDate) <= 2;
  });

  const exact = candidates.filter((row) => {
    const titleNorm = normalizeText(row.title);
    return titleNorm.length >= 10 && captionNorm.includes(titleNorm);
  });
  if (exact.length === 1 && exact[0].content_code) {
    return { id: exact[0].id, content_code: exact[0].content_code, method: 'title_exact', confidence: 0.98 };
  }

  const scored = candidates
    .map((row) => ({ row, score: diceSimilarity(normalizeText(row.title), captionNorm) }))
    .sort((a, b) => b.score - a.score);

  const first = scored[0];
  const second = scored[1];
  if (
    first?.row.content_code &&
    first.score >= 0.82 &&
    (!second || first.score - second.score >= 0.1)
  ) {
    return {
      id: first.row.id,
      content_code: first.row.content_code,
      method: 'title_similarity',
      confidence: Number(first.score.toFixed(3)),
    };
  }
  return null;
}

function matchInstagramMedia(
  media: any,
  index: Awaited<ReturnType<typeof loadContentIndex>>,
  existing: Map<string, { external_post_id: string; content_id: string; content_code: string }>,
): MatchResult | null {
  const mediaId = String(media.id || '');
  const prior = existing.get(mediaId);
  if (prior?.content_id && prior.content_code) {
    return { id: prior.content_id, content_code: prior.content_code, method: 'existing_media_id', confidence: 1 };
  }

  const permalink = normalizeUrl(media.permalink);
  const byUrl = permalink ? index.byUrl.get(permalink) : null;
  if (byUrl?.content_code) {
    return { id: byUrl.id, content_code: byUrl.content_code, method: 'permalink', confidence: 1 };
  }

  const caption = String(media.caption || '');
  const code = extractContentId(caption)?.toUpperCase();
  const byCode = code ? index.byCode.get(code) : null;
  if (byCode?.content_code) {
    return { id: byCode.id, content_code: byCode.content_code, method: 'content_code', confidence: 1 };
  }

  return matchByTitle(index.rows, caption, bangkokDateFromTimestamp(media.timestamp));
}

function sumLeadActions(actions: any[]): number {
  let total = 0;
  for (const action of actions || []) {
    const type = String(action?.action_type || '').toLowerCase();
    if (type === 'lead' || type.includes('lead')) total += numberValue(action?.value);
  }
  return total;
}

function matchAdText(text: string, index: Awaited<ReturnType<typeof loadContentIndex>>): MatchResult | null {
  const code = extractContentId(text)?.toUpperCase();
  const byCode = code ? index.byCode.get(code) : null;
  if (byCode?.content_code) {
    return { id: byCode.id, content_code: byCode.content_code, method: 'content_code', confidence: 1 };
  }

  const norm = normalizeText(text);
  if (norm.length < 8) return null;
  const exact = index.rows.filter((row) => {
    const titleNorm = normalizeText(row.title);
    return titleNorm.length >= 10 && norm.includes(titleNorm);
  });
  if (exact.length === 1 && exact[0].content_code) {
    return { id: exact[0].id, content_code: exact[0].content_code, method: 'title_exact', confidence: 0.95 };
  }
  return null;
}

function mergeMetaUpdates(updates: MetaDataUpdate[]) {
  const map = new Map<string, MetaDataUpdate>();
  for (const update of updates) {
    const current = map.get(update.content_code) || { content_code: update.content_code };
    const next: MetaDataUpdate = { ...current, ...update };

    const additive: Array<keyof MetaDataUpdate> = [
      'ad_spend', 'ad_impressions', 'ad_reach', 'ad_clicks', 'ads_leads',
    ];
    for (const key of additive) {
      const a = Number(current[key] || 0);
      const b = Number(update[key] || 0);
      if (a || b) (next as any)[key] = a + b;
    }

    const joinIds = (a?: string, b?: string) => Array.from(new Set([...(a || '').split(',').map((v) => v.trim()).filter(Boolean), ...(b || '').split(',').map((v) => v.trim()).filter(Boolean)])).join(', ');
    next.meta_campaign_id = joinIds(current.meta_campaign_id, update.meta_campaign_id) || undefined;
    next.meta_adset_id = joinIds(current.meta_adset_id, update.meta_adset_id) || undefined;
    next.meta_ad_id = joinIds(current.meta_ad_id, update.meta_ad_id) || undefined;

    map.set(update.content_code, next);
  }

  for (const item of map.values()) {
    const impressions = Number(item.ad_impressions || 0);
    const clicks = Number(item.ad_clicks || 0);
    const spend = Number(item.ad_spend || 0);
    const leads = Number(item.ads_leads || 0);
    if (impressions > 0) {
      item.ad_ctr = (clicks / impressions) * 100;
      item.ad_cpm = (spend / impressions) * 1000;
    }
    if (leads > 0) item.cost_per_lead = spend / leads;
  }

  return Array.from(map.values());
}

async function syncInstagramInternal(env: Bindings, index: Awaited<ReturnType<typeof loadContentIndex>>) {
  if (!env.META_IG_USER_ID) throw new Error('META_IG_USER_ID not configured');
  const response = await graphGetPaged(env, `${env.META_IG_USER_ID}/media`, {
    fields: 'id,caption,media_type,media_product_type,permalink,timestamp,like_count,comments_count',
    limit: '50',
  }, 1);
  const existing = await loadExistingInstagramMatches(env);

  let processed = 0;
  let matched = 0;
  const methods: Record<string, number> = {};
  const unmatchedExamples: Array<{ media_id: string; published_at: string | null; caption: string }> = [];
  const updates: MetaDataUpdate[] = [];

  for (const media of response.data || []) {
    const caption = String(media.caption || '');
    const match = matchInstagramMedia(media, index, existing);
    const contentId = match?.id || null;
    const insights = await getMediaInsights(env, String(media.id));

    await env.DB.prepare(`
      INSERT INTO platform_posts(content_id,platform,external_post_id,url,caption,published_at,metadata_json,updated_at)
      VALUES(?,?,?,?,?,?,?,datetime('now'))
      ON CONFLICT(platform,external_post_id) DO UPDATE SET
        content_id=COALESCE(excluded.content_id,platform_posts.content_id),
        url=excluded.url, caption=excluded.caption, published_at=excluded.published_at,
        metadata_json=excluded.metadata_json, updated_at=datetime('now')
    `)
      .bind(
        contentId,
        'instagram',
        String(media.id),
        media.permalink || null,
        caption,
        media.timestamp || null,
        JSON.stringify({ media, match }),
      )
      .run();

    if (contentId && match?.content_code) {
      matched++;
      methods[match.method] = (methods[match.method] || 0) + 1;
      const actualPublishDate = bangkokDateFromTimestamp(media.timestamp);
      if (actualPublishDate) {
        await env.DB.prepare(`
          UPDATE contents
          SET publish_date = ?,
              source_url = CASE WHEN source_url IS NULL OR source_url = '' THEN ? ELSE source_url END,
              updated_at = datetime('now')
          WHERE id = ?
        `)
          .bind(actualPublishDate, media.permalink || null, contentId)
          .run();
      }

      updates.push({
        content_code: match.content_code,
        instagram_media_id: String(media.id),
        publish_timestamp_ms: media.timestamp ? Date.parse(String(media.timestamp)) : undefined,
        views: numberValue(insights.views),
        reach: numberValue(insights.reach),
        likes: numberValue(media.like_count),
        comments: numberValue(media.comments_count),
        shares: numberValue(insights.shares),
        saves: numberValue(insights.saved),
      });
    } else if (unmatchedExamples.length < 10) {
      unmatchedExamples.push({
        media_id: String(media.id || ''),
        published_at: media.timestamp || null,
        caption: caption.slice(0, 140),
      });
    }

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
        JSON.stringify({ media, insights, match }),
      )
      .run();
    processed++;
  }

  return {
    summary: {
      processed,
      matched,
      unmatched: processed - matched,
      match_methods: methods,
      unmatched_examples: unmatchedExamples,
    },
    updates,
  };
}

async function syncMetaAdsInternal(env: Bindings, index: Awaited<ReturnType<typeof loadContentIndex>>) {
  if (!env.META_AD_ACCOUNT_ID) {
    return {
      summary: { processed: 0, skipped: true, message: 'META_AD_ACCOUNT_ID not configured' },
      updates: [] as MetaDataUpdate[],
    };
  }

  const rawAdAccountId = String(env.META_AD_ACCOUNT_ID || '').trim();
  const numericAdAccountId = rawAdAccountId
    .replace(/^act[_=]?/i, '')
    .replace(/^account[_=]?/i, '')
    .replace(/\s+/g, '');

  if (!/^\d+$/.test(numericAdAccountId)) {
    throw new Error('META_AD_ACCOUNT_ID has invalid format. Use digits only, act_123..., or act=123...');
  }

  const account = `act_${numericAdAccountId}`;
  let accountInfo: any = null;
  try {
    accountInfo = await graphGet(env, account, {
      fields: 'id,name,account_status,currency,timezone_name,amount_spent',
    });
  } catch (error) {
    accountInfo = { error: error instanceof Error ? error.message : String(error) };
  }

  let adsInventory: any = null;
  try {
    adsInventory = await graphGet(env, `${account}/ads`, {
      fields: 'id,name,status,effective_status',
      limit: '25',
      summary: 'true',
    });
  } catch (error) {
    adsInventory = { data: [], error: error instanceof Error ? error.message : String(error) };
  }

  const insightParams = {
    fields: 'campaign_id,campaign_name,adset_id,adset_name,ad_id,ad_name,spend,impressions,reach,clicks,ctr,cpc,actions',
    level: 'ad',
    limit: '500',
  };

  let datePresetUsed = 'last_90d';
  let response = await graphGetPaged(env, `${account}/insights`, { ...insightParams, date_preset: datePresetUsed }, 5);
  if (!response.data.length) {
    datePresetUsed = 'maximum';
    response = await graphGetPaged(env, `${account}/insights`, { ...insightParams, date_preset: datePresetUsed }, 5);
  }

  let processed = 0;
  let matched = 0;
  const methods: Record<string, number> = {};
  const updates: MetaDataUpdate[] = [];

  for (const ad of response.data || []) {
    const text = [ad.ad_name, ad.adset_name, ad.campaign_name].filter(Boolean).join(' ');
    const match = matchAdText(text, index);
    const contentId = match?.id || null;
    const spend = numberValue(ad.spend);
    const impressions = numberValue(ad.impressions);
    const reach = numberValue(ad.reach);
    const clicks = numberValue(ad.clicks);
    const leads = sumLeadActions(ad.actions || []);

    if (match?.content_code) {
      matched++;
      methods[match.method] = (methods[match.method] || 0) + 1;
      updates.push({
        content_code: match.content_code,
        meta_campaign_id: ad.campaign_id ? String(ad.campaign_id) : undefined,
        meta_adset_id: ad.adset_id ? String(ad.adset_id) : undefined,
        meta_ad_id: ad.ad_id ? String(ad.ad_id) : undefined,
        ad_spend: spend,
        ad_impressions: impressions,
        ad_reach: reach,
        ad_clicks: clicks,
        ads_leads: leads,
      });
    }

    await env.DB.prepare(`
      INSERT INTO performance_snapshots(
        content_id,platform,external_post_id,impressions,reach,clicks,spend,leads,raw_json
      ) VALUES(?,?,?,?,?,?,?,?,?)
    `)
      .bind(
        contentId,
        'meta_ads',
        String(ad.ad_id || ''),
        impressions,
        reach,
        clicks,
        spend,
        leads,
        JSON.stringify({ ad, match, date_preset: datePresetUsed }),
      )
      .run();
    processed++;
  }

  return {
    summary: {
      processed,
      matched,
      unmatched: processed - matched,
      match_methods: methods,
      date_preset_used: datePresetUsed,
      account: accountInfo && !accountInfo.error ? {
        id: accountInfo.id,
        name: accountInfo.name,
        account_status: accountInfo.account_status,
        currency: accountInfo.currency,
        timezone_name: accountInfo.timezone_name,
      } : accountInfo,
      ads_configured: Number(adsInventory?.summary?.total_count ?? adsInventory?.data?.length ?? 0),
      ads_sample: (adsInventory?.data || []).slice(0, 5).map((ad: any) => ({
        id: ad.id,
        name: ad.name,
        status: ad.status,
        effective_status: ad.effective_status,
      })),
      inventory_error: adsInventory?.error || null,
    },
    updates,
  };
}

export async function syncInstagram(env: Bindings) {
  const index = await loadContentIndex(env);
  const result = await syncInstagramInternal(env, index);
  return result.summary;
}

export async function syncMetaAds(env: Bindings) {
  const index = await loadContentIndex(env);
  const result = await syncMetaAdsInternal(env, index);
  return result.summary;
}


export async function exchangeMetaAccessToken(env: Bindings, shortToken: string) {
  const appId = String(env.META_APP_ID || '').trim();
  const appSecret = String(env.META_APP_SECRET || '').trim();
  const token = String(shortToken || '').trim();

  if (!appId) throw new Error('META_APP_ID is not configured in Cloudflare.');
  if (!appSecret) throw new Error('META_APP_SECRET is not configured in Cloudflare.');
  if (!token) throw new Error('short_token is required.');

  const url = new URL(`${baseUrl(env)}/oauth/access_token`);
  url.searchParams.set('grant_type', 'fb_exchange_token');
  url.searchParams.set('client_id', appId);
  url.searchParams.set('client_secret', appSecret);
  url.searchParams.set('fb_exchange_token', token);

  const res = await fetch(url.toString(), { method: 'GET' });
  const data = (await res.json()) as any;

  if (!res.ok || data?.error) {
    throw new Error(`Meta token exchange error: ${data?.error?.message || res.statusText}`);
  }

  const expiresIn = Number(data?.expires_in || 0);
  return {
    access_token: String(data?.access_token || ''),
    token_type: String(data?.token_type || 'bearer'),
    expires_in: expiresIn,
    expires_at: expiresIn > 0 ? new Date(Date.now() + expiresIn * 1000).toISOString() : null,
  };
}

export async function syncMeta(env: Bindings) {
  const index = await loadContentIndex(env);
  const instagram = await syncInstagramInternal(env, index);
  const ads = await syncMetaAdsInternal(env, index);
  const updates = mergeMetaUpdates([...instagram.updates, ...ads.updates]);
  const dataAi = updates.length
    ? await syncMetaMetricsToDataTable(env, updates)
    : { updated: 0, unmatched_content_codes: [], lark_write_errors: [], skipped: true, reason: 'No matched content yet' };

  return {
    meta_version: META_VERSION,
    instagram: instagram.summary,
    ads: ads.summary,
    data_ai: dataAi,
  };
}
