VISIONHUB — LARK MAPPING V2.2 DATE SEPARATION

เป้าหมาย
=======
แยกวันที่ 2 ความหมายออกจากกันอย่างถาวร:

1) VH • WORK / วันที่ต้องลง
   -> D1: planned_publish_date
   -> เป็น "วันตามแผน"

2) D1: publish_date
   -> เป็น "วันเผยแพร่จริง"
   -> Lark WORK ห้ามเขียน field นี้
   -> Meta / Platform sync เท่านั้นที่มีสิทธิ์เติมจาก timestamp จริง

สิ่งที่แก้
=========
- เพิ่ม contents.planned_publish_date
- ย้ายค่า publish_date เดิมทั้งหมดไป planned_publish_date
- ล้าง publish_date เดิมเพื่อเอาค่า planned ที่เคยปนออก
- Lark WORK sync เขียนวันที่ต้องลง -> planned_publish_date เท่านั้น
- Lark -> DATA & AI จะไม่แตะ "วันที่เผยแพร่" อีก
  (สำคัญ: ป้องกัน cron Lark ล้างวันที่จริงหลัง Meta sync)
- Instagram sync จะเติม D1 publish_date จาก media.timestamp จริง
  โดยแปลงเป็นวันตาม Asia/Bangkok
- /api/contents จะคืนทั้ง planned_publish_date และ publish_date
- Sorting ของ contents ใช้ planned_publish_date ก่อน publish_date
- แก้ upsert ให้ return canonical targetId

ไฟล์ที่ต้อง Replace
===================
apps/api/src/types.ts
apps/api/src/lib/db.ts
apps/api/src/services/lark.ts
apps/api/src/services/meta.ts

ไฟล์ใหม่
========
database/migrations/0003_planned_publish_date.sql

ขั้นตอน Deploy
==============
1. แตก ZIP ที่ root ของ repo แล้ว Replace ไฟล์ตาม path เดิม
2. Commit / Push
3. APPLY MIGRATION ก่อนหรือพร้อม deploy:
   npm run db:migrate:remote
4. Deploy API:
   npm run deploy:api

ถ้า Cloudflare ใช้ Deploy command อัตโนมัติและต้องการทำครั้งเดียวชั่วคราว:
   npm run db:migrate:remote && npm run deploy:api

หลัง migration สำเร็จแล้ว ให้คืน Deploy command เป็น:
   npm run deploy:api

ทดสอบหลัง Deploy
================
A) Sync Lark 1 รอบ
POST /api/sync/lark

คาดหวัง:
- synced = 469 (ตามข้อมูลปัจจุบัน)
- skipped = 15
- errors = 0
- created = 0
- updated = 469

B) เปิด:
GET /api/contents

ตัวอย่างที่ควรเห็น:
{
  "content_code": "VH-2604-001",
  "planned_publish_date": "2026-04-09",
  "publish_date": null
}

และ:
{
  "content_code": "VH-2604-003",
  "planned_publish_date": "2026-04-10",
  "publish_date": null
}

จนกว่า Meta sync จะจับคู่โพสต์จริงได้

C) หลัง Phase 3 Meta sync จับคู่ Instagram ได้:
planned_publish_date = วันตามแผนเดิม
publish_date = วันจาก Instagram media.timestamp จริง

หมายเหตุสำคัญ
=============
- Migration นี้ตั้งใจสำหรับสถานะปัจจุบันของโปรเจกต์ ก่อนเปิด Meta sync จริง
- V2.1 ได้ล้าง "วันที่เผยแพร่" เก่าฝั่ง VH • DATA & AI แล้ว
- V2.2 จะหยุด Lark sync ไม่ให้แตะ field "วันที่เผยแพร่" อีกต่อไป
- อย่ารัน migration 0003 ซ้ำด้วยการ execute file ตรง ๆ หลายรอบ;
  ใช้ wrangler d1 migrations apply ซึ่งจะ track migration ให้
