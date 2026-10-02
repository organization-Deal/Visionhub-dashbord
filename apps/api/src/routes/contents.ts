import { Hono } from 'hono';
import type { Bindings, ContentRow } from '../types';
import { getContent, listContents, upsertContent } from '../lib/db';
import { requireAdmin } from '../lib/http';

export const contentsRoute = new Hono<{ Bindings: Bindings }>();

contentsRoute.get('/', async (c) => {
  const contents = await listContents(c.env, {
    product: c.req.query('product') || undefined,
    status: c.req.query('status') || undefined,
    owner: c.req.query('owner') || undefined,
    q: c.req.query('q') || undefined,
    limit: Number(c.req.query('limit') || 200),
  });
  return c.json({ data: contents });
});

contentsRoute.get('/:id', async (c) => {
  const id = c.req.param('id');
  const content = await getContent(c.env, id);
  if (!content) return c.json({ error: 'Content not found' }, 404);

  const posts = await c.env.DB.prepare('SELECT * FROM platform_posts WHERE content_id = ? ORDER BY published_at DESC')
    .bind(id)
    .all();
  const reviews = await c.env.DB.prepare('SELECT * FROM ai_reviews WHERE content_id = ? ORDER BY created_at DESC')
    .bind(id)
    .all();
  const performance = await c.env.DB.prepare(`
    SELECT ps.* FROM performance_snapshots ps
    WHERE ps.content_id = ?
      AND ps.id IN (
        SELECT MAX(id) FROM performance_snapshots WHERE content_id = ? GROUP BY platform, external_post_id
      )
    ORDER BY ps.snapshot_at DESC
  `)
    .bind(id, id)
    .all();

  return c.json({ data: { content, posts: posts.results || [], reviews: reviews.results || [], performance: performance.results || [] } });
});

contentsRoute.post('/', requireAdmin, async (c) => {
  const body = await c.req.json<Partial<ContentRow>>();
  if (!body.id || !body.title) return c.json({ error: 'id and title are required' }, 400);
  const row = await upsertContent(c.env, body as Partial<ContentRow> & Pick<ContentRow, 'id' | 'title'>);
  return c.json({ data: row }, 201);
});

contentsRoute.patch('/:id', requireAdmin, async (c) => {
  const id = c.req.param('id');
  const current = await getContent(c.env, id);
  if (!current) return c.json({ error: 'Content not found' }, 404);
  const body = await c.req.json<Partial<ContentRow>>();
  const row = await upsertContent(c.env, { ...current, ...body, id, title: body.title || current.title });
  return c.json({ data: row });
});
