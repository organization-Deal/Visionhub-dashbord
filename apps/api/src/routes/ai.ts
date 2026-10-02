import { Hono } from 'hono';
import type { Bindings } from '../types';
import { requireAdmin } from '../lib/http';
import { getContent } from '../lib/db';
import { analyzePerformance, generateBrief, reviewContent } from '../services/openai';

export const aiRoute = new Hono<{ Bindings: Bindings }>();
aiRoute.use('*', requireAdmin);

aiRoute.post('/generate-brief', async (c) => {
  const body = await c.req.json<{ content_id: string; extra_context?: string }>();
  const content = await getContent(c.env, body.content_id);
  if (!content) return c.json({ error: 'Content not found' }, 404);
  const result = await generateBrief(c.env, content, body.extra_context || '');
  return c.json({ data: result });
});

aiRoute.post('/review', async (c) => {
  const body = await c.req.json<{ content_id: string; transcript?: string; notes?: string; frame_urls?: string[] }>();
  const content = await getContent(c.env, body.content_id);
  if (!content) return c.json({ error: 'Content not found' }, 404);
  const review = await reviewContent(c.env, content, body);

  await c.env.DB.prepare(`
    INSERT INTO ai_reviews(
      content_id,review_type,overall_score,hook_score,clarity_score,proof_score,cta_score,
      brand_score,visual_score,summary,recommendations,raw_json
    ) VALUES(?,?,?,?,?,?,?,?,?,?,?,?)
  `)
    .bind(
      content.id,
      'CONTENT_QA',
      review.overall_score,
      review.hook_score,
      review.clarity_score,
      review.proof_score,
      review.cta_score,
      review.brand_score,
      review.visual_score,
      review.summary,
      JSON.stringify(review.recommendations || []),
      JSON.stringify(review),
    )
    .run();

  return c.json({ data: review });
});

aiRoute.post('/analyze-performance', async (c) => {
  const body = await c.req.json<{ payload?: unknown }>();
  let payload = body.payload;
  if (!payload) {
    const data = await c.env.DB.prepare(`
      WITH latest AS (
        SELECT * FROM performance_snapshots
        WHERE id IN (SELECT MAX(id) FROM performance_snapshots GROUP BY platform, external_post_id)
      )
      SELECT c.id,c.title,c.product,c.content_type,c.purpose,l.platform,l.views,l.reach,l.shares,l.saves,
             l.leads,l.qualified_leads,l.revenue
      FROM latest l LEFT JOIN contents c ON c.id=l.content_id
      ORDER BY l.views DESC LIMIT 100
    `).all();
    payload = data.results || [];
  }
  const result = await analyzePerformance(c.env, payload);
  return c.json({ data: result });
});
