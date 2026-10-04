VISIONHUB PHASE 3D — SOCIAL PERFORMANCE V3.4

Lark table:
VH • SOCIAL PERFORMANCE
Table ID: tblyIIHQEmt34hbT
View ID: vew4TuRwHb

1) Cloudflare variable
Add:
LARK_SOCIAL_TABLE_ID = tblyIIHQEmt34hbT

2) Replace files in this ZIP
- apps/api/src/types.ts
- apps/api/src/services/lark.ts
- apps/api/src/services/meta.ts
- apps/api/src/routes/sync.ts
- apps/api/src/routes/dashboard.ts

3) Deploy
npm run deploy:api

No migration.

4) Verify
GET /api/dashboard/config-status

Must show:
"lark_social": true
"meta_version": "3.4-social-performance"
"social_version": "3.4-social-performance"

5) Normal sync
POST /api/sync/meta

This now writes EVERY fetched Instagram post to VH • SOCIAL PERFORMANCE,
including unmatched posts. It uses Platform + External Post ID to update
existing rows instead of creating duplicates.

6) One-time historical backfill
POST /api/sync/social-backfill?pages=5

Each page requests up to 100 Instagram posts. pages can be 1..10.
Start with pages=5 (up to ~500 posts). If the Instagram account has more,
you can use pages=10 once. This is intended as a one-time backfill.

7) After backfill
Lark Dashboard can use VH • SOCIAL PERFORMANCE to filter by:
- month
- Platform
- Content Product
- Project
- Media Type

Important:
- Matching to VH • WORK is optional.
- Unmatched posts still keep their metrics and appear in monthly dashboards.
- Instagram is active now.
- Facebook/TikTok/YouTube fields are already supported by the table, but those
  platform importers require their own API connection and are not faked by this patch.
