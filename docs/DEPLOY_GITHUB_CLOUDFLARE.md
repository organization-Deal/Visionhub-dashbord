# GitHub → Cloudflare Deployment

## GitHub Secrets ที่ใช้กับ Actions

Repo Settings → Secrets and variables → Actions

```text
CLOUDFLARE_API_TOKEN
CLOUDFLARE_ACCOUNT_ID
```

API keys ของ Lark/OpenAI/Meta/TikTok **ไม่ต้องใส่ใน GitHub Actions** ถ้าใช้ Cloudflare Worker Secrets อยู่แล้ว

## Branch

แนะนำ:

```text
main     = production
develop  = staging
```

## API

Workflow `deploy-api.yml` จะ deploy Worker เมื่อ push `main`

ก่อน deploy ครั้งแรกให้แก้ `database_id` ใน `apps/api/wrangler.toml`

## Web

Workflow `deploy-web.yml` จะ build Vite และ deploy Cloudflare Pages

ตั้ง Repository Variable:

```text
VITE_API_BASE_URL=https://YOUR-VISIONHUB-API-DOMAIN
```

ถ้าไม่ตั้งจะใช้ `http://localhost:8787` ซึ่งไม่เหมาะกับ production

## Recommended Domains

```text
vh.dealinvest.co       -> Cloudflare Pages
api-vh.dealinvest.co   -> Cloudflare Worker
```
