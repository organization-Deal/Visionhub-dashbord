# API Setup

## 1. OpenAI API

Secret:

```text
OPENAI_API_KEY
OPENAI_MODEL
```

ค่า model ในตัวอย่างเป็น `gpt-6-astra` ตาม quickstart ณ วันที่สร้างแพ็กนี้ หากบัญชีคุณใช้ model อื่นให้เปลี่ยน `OPENAI_MODEL` ได้โดยไม่ต้องแก้ Code

Endpoints:

```text
POST /api/ai/generate-brief
POST /api/ai/review
POST /api/ai/analyze-performance
```

AI Review รองรับ `frame_urls` สูงสุด 8 รูป เพื่อวิเคราะห์ visual พร้อม transcript

## 2. Meta / Instagram

Secrets/vars:

```text
META_ACCESS_TOKEN
META_IG_USER_ID
META_AD_ACCOUNT_ID
META_GRAPH_VERSION=v25.0
META_MEDIA_METRICS=views,reach,likes,comments,shares,saved
```

Sync:

```text
POST /api/sync/meta
```

ระบบจะ:

1. ดึง IG media
2. ดึง insight ที่เปิดใช้ได้ทีละ metric (metric ที่ account/API ไม่รองรับจะถูกข้ามเป็น 0)
3. ดึง Meta Ads Insights ถ้ามี `META_AD_ACCOUNT_ID`
4. พยายามผูก Content กับ Post/Ad ด้วย Content ID เช่น `VH-2610-038` ที่อยู่ใน caption หรือ ad name

### Naming convention ที่แนะนำสำหรับ Ads

ใส่ Content ID ใน Ad Name เช่น:

```text
VH-2610-038 | Human Allowed CM01 | Why Location
```

จะทำ Attribution ในระบบง่ายมาก

## 3. TikTok Display API v2

Secret:

```text
TIKTOK_ACCESS_TOKEN
```

ต้องมี scope ตาม Developer App ที่ TikTok กำหนด เช่น `video.list`

Sync:

```text
POST /api/sync/tiktok
```

ระบบดึงวิดีโอล่าสุดและ metrics:

- view_count
- like_count
- comment_count
- share_count

### Naming convention

ใส่ Content ID ใน title/caption เช่น:

```text
VH-2610-038 ทำไมทำเลนี้น่าสนใจ
```

เพื่อให้ระบบจับคู่กับ Lark record อัตโนมัติ

## 4. Admin Token

Mutation/Sync/AI endpoints ต้องส่ง:

```http
Authorization: Bearer YOUR_DASHBOARD_ADMIN_TOKEN
```

Dashboard มีปุ่ม `Admin Token` ด้านซ้าย ให้กรอกหนึ่งครั้งต่อ browser session

## 5. Dashboard API

Read-only:

```text
GET /api/dashboard/overview
GET /api/dashboard/config-status
GET /api/contents
GET /api/contents/:id
```

Protected:

```text
POST /api/sync/lark
POST /api/sync/meta
POST /api/sync/tiktok
POST /api/sync/all
POST /api/ai/generate-brief
POST /api/ai/review
POST /api/ai/analyze-performance
POST /api/contents
PATCH /api/contents/:id
```
