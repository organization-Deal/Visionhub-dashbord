VISIONHUB — LARK MAPPING V2 PATCH
=================================

รองรับ Lark schema ใหม่:
- VH • WORK: tblI3fWOg4gCtXGw
- VH • DATA & AI: tblozKXFP41HKm7D

สิ่งที่แพ็กนี้ทำ
1) Map ชื่อฟิลด์ภาษาไทยจาก VH • WORK เข้า D1
2) ใช้ LARK_WORK_TABLE_ID และ LARK_DATA_TABLE_ID
3) สร้างรหัสคอนเทนต์อัตโนมัติรูปแบบ VH-YYMM-001 หากแถวเก่ายังไม่มีรหัส
4) เขียนรหัสคอนเทนต์กลับเข้า VH • WORK แบบ batch
5) Sync ข้อมูล WORK -> D1 -> VH • DATA & AI
6) Upsert DATA & AI ด้วยรหัสคอนเทนต์ / Lark Record ID เพื่อกันข้อมูลซ้ำ
7) เพิ่ม Sync Status, Last Lark Sync, Updated At
8) เพิ่ม endpoint debug fields: GET /api/sync/lark-fields?table=work|data (ต้อง Bearer admin token)
9) แก้ Meta content-id matching ให้รองรับ VH-2610-001
10) Dashboard รองรับสถานะภาษาไทย เช่น เผยแพร่แล้ว / วิเคราะห์แล้ว / ยกเลิก

ก่อน Deploy
----------
Cloudflare visionhub-api ต้องมี:
LARK_BASE_APP_TOKEN=VykPbo0YqaLql8sqLo2jTAJOpqT
LARK_WORK_TABLE_ID=tblI3fWOg4gCtXGw
LARK_DATA_TABLE_ID=tblozKXFP41HKm7D

ยังเก็บ LARK_BASE_TABLE_ID เดิมไว้ได้ในช่วงเปลี่ยนระบบ

สำคัญ: มี migration ใหม่
----------------------
ไฟล์: database/migrations/0002_lark_mapping_v2.sql

Deploy รอบแรกของ patch นี้ ให้ใช้ชั่วคราว:
npm run db:migrate:remote && npm run deploy:api

เมื่อ migration ผ่านแล้ว เปลี่ยน Deploy command กลับเป็น:
npm run deploy:api

หลัง Deploy
-----------
1) เช็ก config:
GET https://visionhub-api.organization-23c.workers.dev/api/dashboard/config-status
ควรมี lark=true และ lark_data_ai=true

2) รัน Lark sync:
POST /api/sync/lark
Authorization: Bearer <DASHBOARD_ADMIN_TOKEN>

ผลที่คาดหวัง เช่น:
{
  "ok": true,
  "result": {
    "synced": 470,
    "total": 484,
    "generated_content_ids": 400,
    "data_ai": {"created": 400,"updated": 70}
  }
}

3) เปิด VH • WORK ตรวจว่าแถวเก่าที่ไม่มีรหัส เริ่มมี VH-YYMM-xxx
4) เปิด VH • DATA & AI ตรวจว่าระบบสร้าง/อัปเดตแถวอัตโนมัติ
5) เปิด /api/contents ตรวจว่า product/status/null เดิมถูกแทนด้วยข้อมูลจริงจาก Lark

หมายเหตุ
--------
- ทีมงานไม่ต้องกรอก VH • DATA & AI เอง
- ระบบใช้ internal id แบบ LARK-<record_id> ใน D1 และใช้ content_code เป็นรหัสธุรกิจ VH-YYMM-xxx
- Meta/AI จะผูกกับ content_code ใน phase ถัดไป
