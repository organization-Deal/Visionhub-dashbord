VISIONHUB META V3.5.1 — FACEBOOK PUBLISHED POSTS

สาเหตุ:
Facebook /{PAGE_ID}/posts สามารถชน permission pages_read_user_content
เพราะ endpoint นี้อาจครอบคลุมโพสต์จากผู้ใช้/visitor บน Page

แก้:
เปลี่ยน Facebook importer ให้ใช้
/{PAGE_ID}/published_posts

เป้าหมาย:
ดึงเฉพาะโพสต์ที่ Page เป็นผู้เผยแพร่เอง ซึ่งตรงกับ Social Performance ของ Visionhub

ไฟล์ Replace:
- apps/api/src/services/meta.ts
- apps/api/src/routes/dashboard.ts

ไม่มี migration

Deploy:
npm run deploy:api

หลัง Deploy ตรวจ:
GET /api/dashboard/config-status

ต้องเห็น:
"meta_version": "3.5.1-facebook-published-posts"
"social_version": "3.5.1-facebook-published-posts"

จากนั้นทดสอบ:
POST /api/sync/facebook

ถ้าผ่าน:
facebook.processed > 0

ถ้ายังโดน permission error:
ตรวจ /me/permissions ของ Long-Lived Token ที่ใช้งานจริง และยืนยัน Page Access Token/สิทธิ์ของ Page
