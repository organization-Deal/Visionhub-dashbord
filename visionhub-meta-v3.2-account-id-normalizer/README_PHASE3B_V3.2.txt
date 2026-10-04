VISIONHUB META V3.2 — AD ACCOUNT ID NORMALIZER

แก้ปัญหา:
META_AD_ACCOUNT_ID ถูกใส่เป็น act=753... แล้วโค้ด V3.1 เติม act_ ซ้ำ
จนกลายเป็น act_act=753...

V3.2 รองรับทั้ง:
- 753563460699005
- act_753563460699005
- act=753563460699005

ระบบจะ normalize เป็น:
act_753563460699005

ไฟล์ที่ต้อง Replace:
- apps/api/src/services/meta.ts
- apps/api/src/routes/dashboard.ts

ไม่มี migration

Deploy:
npm run deploy:api

ตรวจ:
GET /api/dashboard/config-status

ต้องเห็น:
"meta_version": "3.2-account-id-normalizer"

จากนั้นยิง:
POST /api/sync/meta
