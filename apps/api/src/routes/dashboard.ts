import { Hono } from 'hono';
import type { Bindings } from '../types';

export const dashboardRoute = new Hono<{ Bindings: Bindings }>();

async function scalar(env: Bindings, sql: string, ...bindings: any[]) {
  const row = await env.DB.prepare(sql).bind(...bindings).first<Record<string, unknown>>();
  return row || {};
}

dashboardRoute.get('/overview', async (c) => {
  const [contentStats, overdue, camera, performance, ai, statusRows, productRows, topRows, upcomingRows] = await Promise.all([
    scalar(c.env, `SELECT COUNT(*) total, SUM(CASE WHEN status IN ('POSTED','ANALYZED','เผยแพร่แล้ว','วิเคราะห์แล้ว') THEN 1 ELSE 0 END) posted FROM contents`),
    scalar(c.env, `SELECT COUNT(*) overdue FROM contents WHERE planned_publish_date < date('now') AND status NOT IN ('POSTED','ANALYZED','CLOSED','เผยแพร่แล้ว','วิเคราะห์แล้ว','ยกเลิก')`),
    scalar(c.env, `
      SELECT
        SUM(CASE WHEN camera_required LIKE '%DSLR%' THEN 1 ELSE 0 END) dslr_required,
        SUM(CASE WHEN camera_required LIKE '%DSLR%' AND camera_used LIKE '%DSLR%' THEN 1 ELSE 0 END) dslr_used
      FROM contents
    `),
    scalar(c.env, `
      WITH latest AS (
        SELECT * FROM performance_snapshots
        WHERE id IN (SELECT MAX(id) FROM performance_snapshots GROUP BY platform, external_post_id)
      )
      SELECT
        SUM(views) views,
        SUM(reach) reach,
        SUM(shares) shares,
        SUM(saves) saves,
        SUM(spend) spend,
        SUM(leads) leads,
        SUM(qualified_leads) qualified_leads,
        SUM(appointments) appointments,
        SUM(closed) closed,
        SUM(revenue) revenue
      FROM latest
    `),
    scalar(c.env, `SELECT AVG(overall_score) avg_score, COUNT(*) reviews FROM ai_reviews`),
    c.env.DB.prepare(`SELECT status, COUNT(*) count FROM contents GROUP BY status ORDER BY count DESC`).all(),
    c.env.DB.prepare(`SELECT product, COUNT(*) count FROM contents GROUP BY product ORDER BY count DESC`).all(),
    c.env.DB.prepare(`
      WITH latest AS (
        SELECT * FROM performance_snapshots
        WHERE id IN (SELECT MAX(id) FROM performance_snapshots GROUP BY platform, external_post_id)
      ), perf AS (
        SELECT content_id, SUM(views) views, SUM(reach) reach, SUM(shares) shares, SUM(saves) saves,
               SUM(leads) leads, SUM(qualified_leads) qualified_leads, SUM(revenue) revenue
        FROM latest WHERE content_id IS NOT NULL GROUP BY content_id
      )
      SELECT c.id,c.title,c.product,c.content_type,c.purpose,
             COALESCE(p.views,0) views,COALESCE(p.reach,0) reach,COALESCE(p.shares,0) shares,
             COALESCE(p.saves,0) saves,COALESCE(p.leads,0) leads,
             COALESCE(p.qualified_leads,0) qualified_leads,COALESCE(p.revenue,0) revenue
      FROM contents c LEFT JOIN perf p ON p.content_id=c.id
      ORDER BY COALESCE(p.qualified_leads,0) DESC, COALESCE(p.views,0) DESC LIMIT 8
    `).all(),
    c.env.DB.prepare(`
      SELECT id,title,product,owner,status,planned_publish_date,publish_date,camera_required,camera_used
      FROM contents
      WHERE planned_publish_date >= date('now','-1 day')
      ORDER BY planned_publish_date ASC LIMIT 10
    `).all(),
  ]);

  const required = Number(camera.dslr_required || 0);
  const used = Number(camera.dslr_used || 0);
  return c.json({
    data: {
      content: { ...contentStats, overdue: Number(overdue.overdue || 0) },
      camera: { dslr_required: required, dslr_used: used, compliance: required ? Math.round((used / required) * 100) : 100 },
      performance,
      ai: ai,
      statuses: statusRows.results || [],
      products: productRows.results || [],
      top_contents: topRows.results || [],
      upcoming: upcomingRows.results || [],
    },
  });
});

dashboardRoute.get('/config-status', async (c) => {
  return c.json({
    data: {
      lark: Boolean(c.env.LARK_APP_ID && c.env.LARK_APP_SECRET && c.env.LARK_BASE_APP_TOKEN && (c.env.LARK_WORK_TABLE_ID || c.env.LARK_BASE_TABLE_ID)),
      lark_data_ai: Boolean(c.env.LARK_DATA_TABLE_ID),
      openai: Boolean(c.env.OPENAI_API_KEY),
      meta: Boolean(c.env.META_ACCESS_TOKEN && c.env.META_IG_USER_ID),
      meta_ads: Boolean(c.env.META_ACCESS_TOKEN && c.env.META_AD_ACCOUNT_ID),
      tiktok: Boolean(c.env.TIKTOK_ACCESS_TOKEN),
      admin_token: Boolean(c.env.DASHBOARD_ADMIN_TOKEN),
      mapping_version: '2.3-date-guard',
      meta_version: '3.3-token-exchange',
      meta_app_credentials: Boolean(c.env.META_APP_ID && c.env.META_APP_SECRET),
    },
  });
});
