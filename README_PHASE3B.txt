VISIONHUB — PHASE 3B / META V3.1 SAFE MATCH

ผลก่อน patch:
- Instagram posts = 50
- matched = 0
- unmatched = 50
- Meta Ads snapshots = 0

สิ่งที่ patch นี้เพิ่ม:
1) Instagram matching แบบไม่เดา
   ลำดับ: existing Media ID -> permalink/source_url -> Content ID ใน caption -> title exact -> title similarity ที่ threshold สูง + วันตามแผน ±2 วัน
   ถ้าไม่มั่นใจจะปล่อย unmatched

2) เมื่อ match Instagram ได้
   - เติม contents.publish_date จาก timestamp จริงของ Instagram
   - backfill contents.source_url ด้วย permalink ถ้ายังว่าง
   - เก็บ performance snapshot
   - ส่ง Media ID / วันที่จริง / Views / Reach / Likes / Comments / Shares / Saves ไป VH • DATA & AI

3) Meta Ads diagnostics + history fallback
   - ตรวจ Ad Account info
   - ตรวจจำนวน Ads ที่มีในบัญชี
   - query last_90d ก่อน
   - ถ้า 0 rows จะ fallback เป็น date_preset=maximum
   - คืน ads_configured + ads_sample + date_preset_used เพื่อวินิจฉัยว่า account ผิดหรือไม่มี delivery
   - Ads matching ใช้ Content ID หรือ title exact เท่านั้น (ไม่เดา)

4) VH • DATA & AI
   อัปเดตเฉพาะ Content ที่ match สำเร็จ เพื่อลด Lark API calls

ไฟล์ที่ต้อง Replace:
- apps/api/src/services/meta.ts
- apps/api/src/services/lark.ts
- apps/api/src/routes/dashboard.ts

ไม่มี migration ใหม่
Deploy command:
npm run deploy:api

หลัง Deploy ตรวจ:
GET /api/dashboard/config-status
ต้องเห็น:
"mapping_version":"2.3-date-guard"
"meta_version":"3.1-safe-match"

จากนั้น POST /api/sync/meta
ผลจะมี:
- meta_version
- instagram.processed/matched/unmatched/match_methods/unmatched_examples
- ads.processed/matched/unmatched/date_preset_used/account/ads_configured/ads_sample
- data_ai.updated/lark_write_errors
