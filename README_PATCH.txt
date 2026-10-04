VISIONHUB — LARK MAPPING V2.1 FIX

แก้จาก Health Check ล่าสุด 3 จุดหลัก:

1) TIMEZONE / DATE FIX
- วันที่ใน D1 จะอ่านตาม Asia/Bangkok ไม่ใช้ UTC slice ที่ทำให้วันที่ถอย 1 วัน
- VH • DATA & AI ช่อง "วันที่เผยแพร่" จะไม่เอา "วันที่ต้องลง" จาก WORK มาใส่อีก
- วันที่เผยแพร่จริงจะเว้นไว้ให้ Meta sync เติมจาก timestamp ของโพสต์จริง
- Sync รอบแรกหลัง patch จะล้างค่ารุ่นเก่าที่เคยเอาวันตามแผนไปใส่ใน "วันที่เผยแพร่"

2) ERROR LOGGING
- ถ้า WORK record ใด sync ไม่ผ่าน จะคืน error_records ในผล /api/sync/lark
- DATA & AI จะพยายามตั้ง:
  Sync Status = Error
  API Error = ข้อความจริง
  Last Lark Sync = เวลาที่ลองล่าสุด
- ถ้า DATA & AI batch write มี record เดียวที่เสีย ระบบจะแยก record นั้นออก ไม่ทำให้ทั้ง batch ล้ม

3) SKIP RULE
- ไม่มี "ชื่อคอนเทนต์" => Skip
- มีชื่อแต่ไม่มีรหัส => Generator สร้างรหัสให้
- ผล sync จะคืน skipped_records พร้อม record_id + เหตุผล

4) D1 UPSERT HARDENING
- รองรับกรณี legacy row ชน unique key ของ content_code / lark_record_id
- พยายามใช้ record เดิมเป็น canonical เพื่อไม่ทำให้ relation เดิมหาย

ไฟล์ที่ต้อง Replace:
- apps/api/src/services/lark.ts
- apps/api/src/lib/db.ts

ไม่ต้องรัน migration ใหม่สำหรับ patch นี้

หลังอัปไฟล์:
1. Deploy:
   npm run deploy:api

2. Sync Lark 1 รอบ:
   POST /api/sync/lark

3. ผลลัพธ์ควรมี:
   skipped_records
   error_records
   data_ai.lark_write_errors

4. ตรวจ:
   - errors ควรเป็น 0 หรือมีรายละเอียดว่า record ไหนพัง
   - 15 blank rows ยัง skip ได้ตามปกติ
   - DATA & AI "วันที่เผยแพร่" ควรว่างจน Meta เติมวันจริง
   - D1 planned publish_date จะไม่ถอย 1 วันจาก timezone อีก

สำคัญ:
DATA & AI "วันที่เผยแพร่" = วันเผยแพร่จริงจากแพลตฟอร์ม
VH • WORK "วันที่ต้องลง" = วันตามแผน
ห้ามใช้สองช่องนี้แทนกัน
