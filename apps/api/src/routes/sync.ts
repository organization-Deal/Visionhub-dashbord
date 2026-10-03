import { Hono } from 'hono';
import type { Bindings } from '../types';
import { requireAdmin } from '../lib/http';
import { logSync } from '../lib/db';
import { listLarkFields, syncLarkContents } from '../services/lark';
import { syncMeta } from '../services/meta';
import { syncTikTok } from '../services/tiktok';

export const syncRoute = new Hono<{ Bindings: Bindings }>();
syncRoute.use('*', requireAdmin);

async function run(name: string, env: Bindings, fn: () => Promise<any>) {
  try {
    const result = await fn();
    const processed = Number(result?.processed || result?.synced || result?.instagram?.processed || 0);
    await logSync(env, name, 'SUCCESS', JSON.stringify(result), processed);
    return { ok: true, result };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    await logSync(env, name, 'ERROR', message, 0);
    return { ok: false, error: message };
  }
}

syncRoute.post('/lark', async (c) => c.json(await run('lark', c.env, () => syncLarkContents(c.env))));
syncRoute.post('/meta', async (c) => c.json(await run('meta', c.env, () => syncMeta(c.env))));
syncRoute.post('/tiktok', async (c) => c.json(await run('tiktok', c.env, () => syncTikTok(c.env))));

syncRoute.post('/all', async (c) => {
  const results = {
    lark: await run('lark', c.env, () => syncLarkContents(c.env)),
    meta: await run('meta', c.env, () => syncMeta(c.env)),
    tiktok: await run('tiktok', c.env, () => syncTikTok(c.env)),
  };
  return c.json({ data: results });
});


syncRoute.get('/lark-fields', async (c) => {
  const target = c.req.query('table') === 'data' ? 'data' : 'work';
  const fields = await listLarkFields(c.env, target);
  return c.json({ data: { table: target, count: fields.length, fields } });
});

syncRoute.get('/runs', async (c) => {
  const rows = await c.env.DB.prepare('SELECT * FROM sync_runs ORDER BY id DESC LIMIT 30').all();
  return c.json({ data: rows.results || [] });
});
