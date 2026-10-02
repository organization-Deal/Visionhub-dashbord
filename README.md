# Visionhub Platform

ระบบกลางสำหรับทีม Visionhub: Content Production + AI Review + Social Performance + Dashboard

## Architecture

- **Lark Base** = หน้าทำงานประจำวันของทีม / Source of Truth ด้าน Content Workflow
- **Visionhub API (Cloudflare Workers + Hono)** = ตัวกลางเชื่อม Lark, OpenAI, Meta, TikTok
- **Cloudflare D1** = Analytics / Content cache / AI reviews / Performance snapshots
- **Visionhub Web (React + Vite)** = Dashboard สำหรับหัวหน้าทีมและวิเคราะห์ผล
- **GitHub** = Source code + CI/CD เท่านั้น (ห้ามใส่ API keys หรือ raw video)

## API integrations ในแพ็กนี้

1. Lark OpenAPI
2. OpenAI Responses API
3. Meta / Instagram Graph API + Ads Insights
4. TikTok Display API v2

> โค้ดทำงานแบบ "ยังไม่ใส่ API ก็เปิด Dashboard ได้" โดยใช้ข้อมูล Seed/Demo ก่อน แล้วค่อยเติม Secret ภายหลัง

## Quick Start

### 1. ติดตั้ง

```bash
npm install
```

### 2. ตั้งค่า API local

```bash
cp apps/api/.dev.vars.example apps/api/.dev.vars
cp apps/web/.env.example apps/web/.env.local
```

แก้ค่าใน `apps/api/.dev.vars` ด้วย API keys ของจริง

### 3. สร้าง D1 local

```bash
npm run db:migrate:local
npm run db:seed:local
```

### 4. เปิด Backend

```bash
npm run dev:api
```

Backend: `http://localhost:8787`

### 5. เปิด Dashboard อีก Terminal

```bash
npm run dev:web
```

Web: `http://localhost:5173`

## Production Deployment

### Cloudflare D1

1. สร้าง DB จริง
2. เปลี่ยน `database_id` ใน `apps/api/wrangler.toml`
3. รัน migration

```bash
npm run db:migrate:remote
npm run db:seed:remote
```

### API Secrets

ห้าม commit secrets เข้า GitHub ใช้ `wrangler secret put` หรือ Cloudflare Dashboard

```bash
cd apps/api
npx wrangler secret put OPENAI_API_KEY
npx wrangler secret put LARK_APP_ID
npx wrangler secret put LARK_APP_SECRET
npx wrangler secret put META_ACCESS_TOKEN
npx wrangler secret put TIKTOK_ACCESS_TOKEN
npx wrangler secret put DASHBOARD_ADMIN_TOKEN
```

### Web

ตั้ง `VITE_API_BASE_URL` เป็น URL ของ Worker เช่น

```text
https://api-visionhub.your-domain.com
```

แล้ว deploy Cloudflare Pages ด้วย GitHub Actions หรือ

```bash
npm run deploy:web
```

## Security

- API keys อยู่ใน Cloudflare Secrets เท่านั้น
- mutation endpoints เช่น `/api/sync/*` และ `/api/ai/*` ใช้ `DASHBOARD_ADMIN_TOKEN`
- Dashboard เก็บ Admin Token แค่ `sessionStorage` ใน browser เมื่อผู้ใช้ใส่เอง
- แนะนำวาง Cloudflare Access หน้าทั้ง Web + API ใน Production

## Production Workflow

```text
Lark Content Record
        ↓
Visionhub API
  ↙      ↓      ↘
OpenAI  Meta   TikTok
  ↘      ↓      ↙
      D1 Analytics
           ↓
   Visionhub Dashboard
```

ดูรายละเอียด field mapping ใน `docs/LARK_SETUP.md` และ API ใน `docs/API_SETUP.md`
