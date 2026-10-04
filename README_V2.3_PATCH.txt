VISIONHUB LARK V2.3 — DATE GUARD

ปัญหาที่แก้:
หลัง manual migration แล้ว publish_date = NULL ถูกต้อง
แต่พอ /api/sync/lark รันอีกครั้ง publish_date ถูกเติมกลับมาเท่ากับ planned_publish_date

V2.3 ป้องกัน 3 ชั้น:

1) DB UPSERT GUARD
- generic/Lark upsert จะไม่รับค่า publish_date อีก
- existing publish_date จะไม่ถูกแตะใน ON CONFLICT UPDATE
- publish_date จะถูกแก้โดย platform sync (Meta) เท่านั้น

2) LEGACY AUTO CLEANUP
หลัง Lark sync ระบบจะล้าง publish_date ที่ไม่มีหลักฐาน platform_posts.published_at
ดังนั้นข้อมูลเก่าที่เป็น planned date จะถูกล้างเอง
แต่วันจริงที่มาจาก Meta และมี platform_posts จะถูกเก็บไว้

3) DASHBOARD DATE SEMANTICS
- overdue / upcoming ใช้ planned_publish_date
- publish_date ใช้เฉพาะวันที่เผยแพร่จริง

4) VERSION MARKER
/api/sync/lark จะคืน:
mapping_version = "2.3-date-guard"
legacy_publish_dates_cleared = จำนวนแถวเก่าที่ล้าง

/api/dashboard/config-status จะคืน:
mapping_version = "2.3-date-guard"

ไฟล์ที่ต้อง Replace:
- apps/api/src/lib/db.ts
- apps/api/src/services/lark.ts
- apps/api/src/routes/dashboard.ts

ไม่มี migration ใหม่
Deploy command ใช้:
npm run deploy:api

หลัง Deploy:
1) เปิด /api/dashboard/config-status
   ต้องเห็น mapping_version = "2.3-date-guard"

2) Sync Lark 1 รอบ
   ผลต้องเห็น mapping_version = "2.3-date-guard"
   และ errors = 0

3) เช็ก D1:
SELECT content_code, planned_publish_date, publish_date
FROM contents
WHERE content_code IN ('VH-2604-001','VH-2604-003','VH-2608-044');

ต้องได้ publish_date = NULL ทั้ง 3 แถว (จนกว่า Meta จะเติมวันจริง)
