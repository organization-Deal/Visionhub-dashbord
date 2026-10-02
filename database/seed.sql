INSERT OR REPLACE INTO contents
(id,title,product,project,content_type,purpose,platform,format,production_level,camera_required,camera_used,owner,status,shoot_date,publish_date,cta,thumbnail_url)
VALUES
('VH-2610-001','เปิดให้เป็นเจ้าของ Human Allowed Chiang Mai','Human Allowed','CM01','OPEN PROJECT','DESIRE','IG,TikTok','Reels','HERO','DSLR','DSLR','May','POSTED','2026-10-01','2026-10-02','ดูรายละเอียดโปรเจกต์ที่หน้า Profile',NULL),
('VH-2610-002','รายละเอียดโลเคชั่น Human Allowed CM01','Human Allowed','CM01','LOCATION','UNDERSTAND','IG,TikTok','Carousel','STANDARD','DSLR + iPhone','DSLR','First','POSTED','2026-10-02','2026-10-03','ดูแผนที่และรายละเอียดโครงการ',NULL),
('VH-2610-003','ทำไมทำเลนี้น่าสนใจ','Human Allowed','CM01','WHY LOCATION','UNDERSTAND + DESIRE','IG,TikTok','Reels','HERO','DSLR','iPhone','Beam','REVIEW','2026-10-03','2026-10-05','ทักทีมเพื่อดูข้อมูลโครงการ',NULL),
('VH-2610-004','เปิดโปรเจกต์ Boxing Chiang Mai','Boxing Kicking','CM04','OPEN PROJECT','DESIRE','IG,TikTok','Reels','HERO','DSLR','DSLR','First','EDITING','2026-10-04','2026-10-06','เริ่มเป็นเจ้าของผ่านทีม DEAL!',NULL),
('VH-2610-005','อัปเดตโปรเจกต์ Boxing CM04','Boxing Kicking','CM04','PROJECT UPDATE','PROOF','IG,TikTok','Reels','STANDARD','DSLR + iPhone','iPhone','Beam','READY TO SHOOT','2026-10-07','2026-10-08','ติดตามความคืบหน้าโปรเจกต์',NULL),
('VH-2610-006','อัปเดตรายได้ Boxing Udon #01','Boxing Kicking','UD01','REVENUE UPDATE','PROOF','IG,TikTok','Carousel','STANDARD','Graphic Only','Graphic Only','Mint','SCRIPT','2026-10-08','2026-10-09','ดูผลการดำเนินงานเพิ่มเติม',NULL),
('VH-2610-007','Human Allowed เหลือกี่สิทธิ์','Human Allowed','CM01','OWNERSHIP STATUS','DESIRE','IG,FB','Static','STANDARD','Graphic Only','Graphic Only','Mint','APPROVED','2026-10-09','2026-10-10','สอบถามสิทธิ์ที่เหลือ',NULL),
('VH-2610-008','รีวิวเจ้าของบ้านที่มี DEAL! บริหารให้','Human Allowed','CM01','OWNER REVIEW','PROOF','IG,TikTok','Reels','HERO','DSLR','', 'May','PLANNED','2026-10-11','2026-10-13','พูดคุยกับทีม DEAL!',NULL),
('VH-2610-009','DEAL! ทำอะไรให้เจ้าของบ้านบ้าง','Human Allowed','CM01','DEAL OPERATES','UNDERSTAND + PROOF','IG,TikTok','Carousel','STANDARD','Graphic Only','Graphic Only','Mint','PLANNED','2026-10-12','2026-10-14','ดูขั้นตอนการบริหารทั้งหมด',NULL),
('VH-2610-010','ติดตั้งตู้ครบ Milestone','Boxing Kicking','ALL','MILESTONE','PROOF','IG,TikTok','Reels','HERO','DSLR','', 'First','PLANNED','2026-10-14','2026-10-16','ติดตามโปรเจกต์ใหม่',NULL),
('VH-2610-011','Distribution Day วันที่ 10','Boxing Kicking','ALL','DISTRIBUTION','PROOF','IG,FB','Static','STANDARD','Graphic Only','Graphic Only','Mint','POSTED','2026-10-10','2026-10-10','ดูรายงานประจำเดือน',NULL),
('VH-2610-012','รีวิวเจ้าของตู้ Boxing','Boxing Kicking','UD01','OWNER REVIEW','PROOF','IG,TikTok','Reels','HERO','DSLR','DSLR','Beam','SCHEDULED','2026-10-15','2026-10-18','สอบถามรายละเอียดการเป็นเจ้าของ',NULL);

INSERT INTO ai_reviews
(content_id,review_type,overall_score,hook_score,clarity_score,proof_score,cta_score,brand_score,visual_score,summary,recommendations,raw_json)
VALUES
('VH-2610-001','CONTENT_QA',8.6,8.9,9.2,8.0,7.8,9.1,8.7,'เปิด Product ชัด เข้าใจเร็ว และภาพรวมดูเป็นโปรเจกต์จริง','เพิ่ม CTA ช่วง 3 วินาทีท้ายให้ชัดขึ้น', '{}'),
('VH-2610-002','CONTENT_QA',8.1,7.5,9.0,8.3,7.2,8.7,8.0,'Location ชัดและมีข้อมูลสนับสนุนดี','ลดข้อความบนเฟรมแรก และดัน Landmark สำคัญขึ้น', '{}'),
('VH-2610-003','CONTENT_QA',7.4,6.6,8.2,7.1,5.9,8.8,8.1,'ภาพดี แต่ Hook เข้าเรื่องช้า และยังไม่บอกบทบาท DEAL! ชัด','เข้าเรื่องใน 2 วินาทีแรก + ปิดด้วย CTA Open Project', '{}');

INSERT INTO platform_posts(content_id,platform,external_post_id,url,caption,published_at,metadata_json)
VALUES
('VH-2610-001','instagram','demo_ig_001','https://instagram.com/','Human Allowed Chiang Mai','2026-10-02T10:00:00+07:00','{}'),
('VH-2610-001','tiktok','demo_tt_001','https://tiktok.com/','Human Allowed Chiang Mai','2026-10-02T10:10:00+07:00','{}'),
('VH-2610-002','instagram','demo_ig_002','https://instagram.com/','Location Human Allowed','2026-10-03T10:00:00+07:00','{}'),
('VH-2610-011','instagram','demo_ig_011','https://instagram.com/','Distribution Day','2026-10-10T10:00:00+07:00','{}');

INSERT INTO performance_snapshots(content_id,platform,external_post_id,snapshot_at,views,reach,likes,comments,shares,saves,impressions,clicks,spend,leads,qualified_leads,appointments,closed,revenue,raw_json)
VALUES
('VH-2610-001','instagram','demo_ig_001','2026-10-03T10:00:00+07:00',48200,39100,3150,184,680,910,52100,932,1800,31,16,7,2,342400,'{}'),
('VH-2610-001','tiktok','demo_tt_001','2026-10-03T10:00:00+07:00',128400,0,9200,410,1700,0,0,0,0,12,5,2,0,0,'{}'),
('VH-2610-002','instagram','demo_ig_002','2026-10-04T10:00:00+07:00',31600,27800,2010,101,430,721,34800,610,950,18,9,3,1,171200,'{}'),
('VH-2610-011','instagram','demo_ig_011','2026-10-11T10:00:00+07:00',22600,19700,1350,88,520,604,24100,440,0,4,3,1,0,0,'{}');
