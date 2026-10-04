VISIONHUB SOCIAL V3.4.1 — LARK URL FIELD FIX

สาเหตุ Error:
Lark API ตอบ URLFieldConvFail เพราะฟิลด์ชนิด URL ใน Bitable
เช่น Permalink และ Thumbnail URL ไม่รับ raw string จาก OpenAPI

แก้แล้ว:
- Permalink ส่งเป็น { link, text }
- Thumbnail URL ส่งเป็น { link, text }
- URL ที่ว่างหรือไม่ใช่ http/https จะไม่ถูกส่งไปแตะ field
- ข้อมูล Metrics / Caption / Match Status ทำงานเหมือน V3.4 เดิม

Replace:
- apps/api/src/services/lark.ts
- apps/api/src/services/meta.ts
- apps/api/src/routes/dashboard.ts

ไม่มี migration

Deploy:
npm run deploy:api

หลัง Deploy ตรวจ:
GET /api/dashboard/config-status

ต้องเห็น:
"meta_version": "3.4-social-performance"
"social_version": "3.4.1-url-field-fix"
"lark_social": true

จากนั้นรัน:
POST /api/sync/meta

ถ้าผ่าน social_performance ควรมี created/updated และไม่ขึ้น URLFieldConvFail

หลังจากนั้นทำ historical backfill:
POST /api/sync/social-backfill?pages=5
