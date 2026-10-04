VISIONHUB META V3.3.1 — BUILD FIX

สาเหตุ Build พัง:
sync.ts ใช้
  c.req.json<...>().catch(() => ({}))
ทำให้ TypeScript infer เป็น union:
  { short_token?: string } | {}
จึงอ่าน body.short_token ไม่ได้

แก้เป็น fallback ที่มี type ชัดเจน:
  .catch((): { short_token?: string } => ({}))

ไฟล์ Replace:
- apps/api/src/routes/sync.ts
- apps/api/src/routes/dashboard.ts
- apps/api/src/services/meta.ts

ไม่มี migration

Deploy command:
npm run deploy:api

หลัง Deploy ตรวจ:
https://visionhub-api.organization-23c.workers.dev/api/dashboard/config-status

ต้องเห็น:
"meta_version": "3.3.1-token-exchange-build-fix"

จากนั้นค่อยใช้ /api/sync/meta/exchange-token ต่อ
