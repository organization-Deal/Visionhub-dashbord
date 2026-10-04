VISIONHUB META V3.3 — TOKEN EXCHANGE

เป้าหมาย:
ไม่ต้องเอา META_APP_ID / META_APP_SECRET ออกจาก Cloudflare ไปใส่ PowerShell
ใช้ Worker แลก Short-Lived Token -> Long-Lived Token ให้แทน

ไฟล์ Replace:
- apps/api/src/services/meta.ts
- apps/api/src/routes/sync.ts
- apps/api/src/routes/dashboard.ts
- apps/api/src/types.ts

ไม่มี migration
Deploy command:
npm run deploy:api

STEP 1 — ตรวจหลัง Deploy
GET:
https://visionhub-api.organization-23c.workers.dev/api/dashboard/config-status

ต้องเห็น:
"meta_version": "3.3-token-exchange"
"meta_app_credentials": true

ถ้า meta_app_credentials = false:
Cloudflare ต้องมี Variables/Secrets ชื่อ
META_APP_ID
META_APP_SECRET

STEP 2 — ใน PowerShell
เก็บ Short Token ใหม่จาก Graph API Explorer ไว้ในตัวแปร:
$shortToken = "TOKEN_ใหม่"

แลกเป็น Long-Lived Token:
$exchange = Invoke-RestMethod -Method Post `
  -Uri "https://visionhub-api.organization-23c.workers.dev/api/sync/meta/exchange-token" `
  -Headers @{ Authorization = "Bearer $token" } `
  -ContentType "application/json" `
  -Body (@{ short_token = $shortToken } | ConvertTo-Json)

ดูเฉพาะสถานะ/วันหมดอายุ โดยไม่โชว์ Token:
$exchange.ok
$exchange.result.token_type
$exchange.result.expires_in
$exchange.result.expires_at

Copy Long-Lived Token ลง Clipboard:
$exchange.result.access_token | Set-Clipboard

STEP 3 — Cloudflare
visionhub-api -> Settings -> Variables and Secrets -> META_ACCESS_TOKEN
Edit -> Ctrl+V -> Save/Deploy

STEP 4 — ทดสอบ Meta Sync
Invoke-RestMethod -Method Post `
  -Uri "https://visionhub-api.organization-23c.workers.dev/api/sync/meta" `
  -Headers @{ Authorization = "Bearer $token" } `
  | ConvertTo-Json -Depth 10

ห้ามส่ง META_APP_SECRET, Short Token หรือ Long-Lived Token ในแชท
