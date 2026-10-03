VISIONHUB — LARK MAPPING V2 (CORRECT PATHS)

เจอสาเหตุแล้ว:
ก่อนหน้านี้ไฟล์ V2 ถูกอัปโหลดเป็นโฟลเดอร์ย่อย:
  visionhub-lark-mapping-v2/
  visionhub-lark-mapping-v2-new/

Cloudflare build จากไฟล์จริงที่ root:
  apps/api/...
  database/migrations/...

ดังนั้นโค้ดที่ deploy อยู่จึงยังเป็นเวอร์ชันเก่า และ migration 0002 ก็ไม่ถูกพบ

วิธีใช้:
1) แตก ZIP นี้
2) อัปโหลด/Replace ไฟล์ตาม path ใน ZIP ให้ตรง root ของ GitHub repo
3) ห้ามสร้างโฟลเดอร์ visionhub-lark-mapping-v2-* เพิ่ม
4) แนะนำลบโฟลเดอร์เก่า 2 อันออกจาก repo เพื่อไม่ให้สับสน:
   - visionhub-lark-mapping-v2/
   - visionhub-lark-mapping-v2-new/
5) Deploy command รอบแรก:
   npm run db:migrate:remote && npm run deploy:api
6) ใน log ต้องเห็น:
   0002_lark_mapping_v2.sql ✅
7) แล้วเปิด:
   https://visionhub-api.organization-23c.workers.dev/api/dashboard/config-status?v=4
   ต้องมี:
   "lark_data_ai": true

ไฟล์ที่ต้อง Replace:
- apps/api/src/lib/db.ts
- apps/api/src/lib/http.ts
- apps/api/src/routes/dashboard.ts
- apps/api/src/routes/sync.ts
- apps/api/src/services/lark.ts
- apps/api/src/services/meta.ts
- apps/api/src/types.ts
- database/migrations/0002_lark_mapping_v2.sql
