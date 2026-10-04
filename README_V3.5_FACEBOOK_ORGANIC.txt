VISIONHUB META V3.5 — FACEBOOK ORGANIC FIRST

เป้าหมาย:
ดึง Facebook Page Organic Posts เข้า VH • SOCIAL PERFORMANCE
ก่อน TikTok

สิ่งที่ V3.5 ทำ:
- Instagram ทำงานเหมือนเดิม
- Facebook Page posts ถูกดึงเข้า SOCIAL PERFORMANCE
- Meta Ads ทำงานเหมือนเดิม
- ไม่ต้อง Match Content ID ก่อนก็เก็บ Facebook metrics ได้
- Platform + External Post ID ป้องกัน duplicate
- รองรับ Facebook historical backfill

การเลือก Facebook Page:
1. ถ้ามี META_FB_PAGE_ID -> ใช้ Page นั้น
2. ถ้าไม่มี -> หา Page ที่เชื่อมกับ META_IG_USER_ID อัตโนมัติ
3. ถ้ายังหาไม่ได้และ Token เห็นแค่ 1 Page -> ใช้ Page เดียวนั้น
4. ถ้ามีหลาย Page และเลือกไม่ได้ -> API จะคืน available_pages ให้เลือก
   จากนั้นเพิ่ม Cloudflare Variable:
   META_FB_PAGE_ID = ตัวเลข Page ID

หมายเหตุ Permissions:
- pages_show_list
- pages_read_engagement
ใช้สำหรับค้น Page และอ่านโพสต์
- read_insights อาจจำเป็นสำหรับ Reach / Impressions / Video Views
ถ้ายังไม่มี read_insights ระบบยังดึงโพสต์, reaction, comment, share ได้
และจะคืน facebook.insight_error แทนที่จะทำให้ทั้ง sync ล้ม

ไฟล์ Replace:
- apps/api/src/types.ts
- apps/api/src/services/lark.ts
- apps/api/src/services/meta.ts
- apps/api/src/routes/sync.ts
- apps/api/src/routes/dashboard.ts

ไม่มี migration

Deploy:
npm run deploy:api

ตรวจ Version:
GET /api/dashboard/config-status

ต้องเห็น:
"meta_version": "3.5-facebook-organic"
"social_version": "3.5-facebook-organic"
"facebook_importer": true

ทดสอบ Facebook อย่างเดียว:
POST /api/sync/facebook

ถ้า facebook.needs_page_selection = true:
ดู facebook.available_pages แล้วเอา Page ID ที่ถูกต้องไปตั้งเป็น META_FB_PAGE_ID
จากนั้น Save/Deploy และยิง /api/sync/facebook ใหม่

ถ้าผ่าน:
facebook.processed > 0
social_performance.created/updated > 0

ย้อนหลัง Facebook:
POST /api/sync/facebook-backfill?pages=5

จากนั้น Sync รวมปกติ:
POST /api/sync/meta
จะทำ Instagram + Facebook + Meta Ads พร้อมกัน

TikTok ยังไม่ถูกเปิดใน V3.5
