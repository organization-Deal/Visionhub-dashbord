import { Hono } from 'hono';
import type { Bindings } from '../types';
import { syncLarkContents } from '../services/lark';

export const larkWebhookRoute = new Hono<{ Bindings: Bindings }>();

larkWebhookRoute.post('/', async (c) => {
  const body = await c.req.json<any>();
  // Lark URL verification challenge
  if (body?.challenge) return c.json({ challenge: body.challenge });

  // For MVP, any subscribed Base event triggers a debounced-ish background resync.
  // In production you can narrow this to specific event types and validate signatures.
  c.executionCtx.waitUntil(syncLarkContents(c.env).catch(() => undefined));
  return c.json({ code: 0 });
});
