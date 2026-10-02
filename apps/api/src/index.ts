import { Hono } from 'hono';
import { cors } from 'hono/cors';
import type { Bindings } from './types';
import { contentsRoute } from './routes/contents';
import { dashboardRoute } from './routes/dashboard';
import { aiRoute } from './routes/ai';
import { syncRoute } from './routes/sync';
import { larkWebhookRoute } from './routes/lark-webhook';
import { syncMeta } from './services/meta';
import { syncTikTok } from './services/tiktok';
import { syncLarkContents } from './services/lark';
import { logSync } from './lib/db';

const app = new Hono<{ Bindings: Bindings }>();

app.use('*', async (c, next) => {
  const origin = c.env.ALLOWED_ORIGIN || '*';
  const middleware = cors({
    origin: origin === '*' ? '*' : origin.split(',').map((v) => v.trim()),
    allowHeaders: ['Content-Type', 'Authorization'],
    allowMethods: ['GET', 'POST', 'PATCH', 'OPTIONS'],
    maxAge: 86400,
  });
  return middleware(c, next);
});

app.get('/', (c) => c.json({ service: 'Visionhub API', version: '0.1.0', status: 'ok' }));
app.get('/api/health', (c) => c.json({ ok: true, now: new Date().toISOString() }));
app.route('/api/contents', contentsRoute);
app.route('/api/dashboard', dashboardRoute);
app.route('/api/ai', aiRoute);
app.route('/api/sync', syncRoute);
app.route('/api/lark/webhook', larkWebhookRoute);

app.onError((err, c) => {
  console.error(err);
  return c.json({ error: err.message || 'Internal Server Error' }, 500);
});

async function safeScheduled(env: Bindings, service: string, fn: () => Promise<any>) {
  try {
    const result = await fn();
    const processed = Number(result?.processed || result?.synced || result?.instagram?.processed || 0);
    await logSync(env, service, 'SUCCESS', JSON.stringify(result), processed);
  } catch (e) {
    await logSync(env, service, 'ERROR', e instanceof Error ? e.message : String(e), 0);
  }
}

export default {
  fetch: app.fetch,
  async scheduled(controller: ScheduledController, env: Bindings, ctx: ExecutionContext) {
    // Hourly: social performance. Daily 02:00 UTC: also refresh Lark.
    ctx.waitUntil(safeScheduled(env, 'meta-cron', () => syncMeta(env)));
    ctx.waitUntil(safeScheduled(env, 'tiktok-cron', () => syncTikTok(env)));
    const hour = new Date(controller.scheduledTime).getUTCHours();
    if (hour === 2) ctx.waitUntil(safeScheduled(env, 'lark-cron', () => syncLarkContents(env)));
  },
};
