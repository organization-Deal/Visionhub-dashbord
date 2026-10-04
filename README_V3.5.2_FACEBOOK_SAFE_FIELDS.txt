VISIONHUB META V3.5.2 — FACEBOOK SAFE FIELDS

สาเหตุ Error #10:
แม้ใช้ /published_posts แล้ว request เดิมยังขอ
reactions.summary(true) และ comments.summary(true)
ซึ่ง Meta สามารถบังคับ pages_read_user_content / PPCA กับฟิลด์กลุ่มนี้ได้

V3.5.2 ทำ fallback 3 ระดับ:
1) enriched: post + attachments + shares + reactions + comments
2) basic: post + attachments + shares (ไม่ขอ reactions/comments)
3) minimal: id + message + created_time + permalink_url

ดังนั้นถ้า reactions/comments ถูกบล็อก ระบบยังดึงโพสต์ Facebook
เข้า VH • SOCIAL PERFORMANCE ได้ และไม่ทำให้ทั้ง sync ล้ม

ผลลัพธ์ใหม่:
facebook.post_fields_mode = enriched | basic | minimal
facebook.engagement_field_error = ข้อความ error เดิมถ้ามี fallback
facebook.insight_error = error ของ post insights ถ้ามี

Replace:
- apps/api/src/services/meta.ts
- apps/api/src/routes/dashboard.ts

ไม่มี migration

Deploy:
npm run deploy:api

ตรวจ:
GET /api/dashboard/config-status
ต้องเห็น:
"meta_version": "3.5.2-facebook-safe-fields"
"social_version": "3.5.2-facebook-safe-fields"

ทดสอบ:
POST /api/sync/facebook

ถ้า basic/minimal ผ่าน:
facebook.processed > 0
และ social_performance.created/updated > 0
แม้ reactions/comments จะเป็น 0 ชั่วคราว
