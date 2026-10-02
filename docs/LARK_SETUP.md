# Lark Base Setup — Visionhub

## หลักการ

Lark Base เป็นหน้าที่ทีมใช้กรอกและอัปเดตงานทุกวัน ส่วน Visionhub Web เอาไว้ดูภาพรวม วิเคราะห์ และเชื่อม API

## Fields ที่แนะนำใน Content Base

| Field | Type | ตัวอย่าง |
|---|---|---|
| Content ID | Text | VH-2610-038 |
| ชื่อคอนเทนต์ | Text | ทำไมทำเลนี้น่าสนใจ |
| Product | Single Select | Human Allowed / Boxing Kicking / Corporate |
| Project | Text | CM01 |
| Content Type | Single Select | OPEN PROJECT / LOCATION / REVIEW / UPDATE |
| Purpose | Multi Select | UNDERSTAND / DESIRE / PROOF |
| Platform | Multi Select | IG / TikTok / FB |
| Format | Single Select | Reels / Static / Carousel / Long-form |
| Production Level | Single Select | HERO / STANDARD / FAST / GRAPHIC ONLY |
| Camera Required | Single Select | DSLR / iPhone / DSLR + iPhone / Graphic Only |
| Camera Used | Single Select | DSLR / iPhone / Other / Graphic Only |
| Owner | Person/Text | ชื่อผู้รับผิดชอบ |
| Status | Single Select | PLANNED / SCRIPT / READY TO SHOOT / EDITING / REVIEW / SCHEDULED / POSTED |
| Shoot Date | Date | 2026-10-10 |
| Publish Date | Date | 2026-10-12 |
| Script | Long Text | Script / Link |
| CTA | Text | ทักทีมเพื่อดูรายละเอียด |

## Field mapping

ถ้าชื่อ Field ใน Lark ของคุณไม่ตรงกับด้านบน ไม่ต้องแก้ Code ให้แก้ `LARK_FIELD_MAP` ใน Cloudflare Secret/Variable

ตัวอย่าง:

```json
{
  "title":"ชื่อคอนเทนต์",
  "product":"Product",
  "project":"Project",
  "content_type":"Content Type",
  "purpose":"Purpose",
  "platform":"Platform",
  "format":"Format",
  "production_level":"Production Level",
  "camera_required":"Camera Required",
  "camera_used":"Camera Used",
  "owner":"Owner",
  "status":"Status",
  "shoot_date":"Shoot Date",
  "publish_date":"Publish Date",
  "script":"Script",
  "cta":"CTA"
}
```

## Lark Developer App

สร้าง Internal App ใน Lark Developer Console แล้วให้สิทธิ์สำหรับ Base/Bitable record read ตามที่องค์กรอนุญาต จากนั้นใส่:

- `LARK_APP_ID`
- `LARK_APP_SECRET`
- `LARK_BASE_APP_TOKEN`
- `LARK_BASE_TABLE_ID`

MVP ตัวนี้ sync แบบ **Lark → Visionhub D1** ก่อน เพื่อป้องกันข้อมูลใน Lark ถูกแก้กลับโดยไม่ตั้งใจ

## Webhook

Webhook URL:

```text
https://YOUR_API_DOMAIN/api/lark/webhook
```

Route รองรับ URL verification challenge และเมื่อมี event จะสั่ง resync Base เบื้องหลัง

> Production จริงควรเปิด signature verification และ subscribe เฉพาะ event ของ Base ที่ต้องใช้
