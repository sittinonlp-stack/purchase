-- ============================================================
-- migration-project-track-bills.sql
-- เพิ่มคอลัมน์ track_bills ในตาราง projects
-- ใช้เปิด/ปิดฟีเจอร์ "ตามบิล" (ตามใบกำกับภาษี/ใบเสร็จจากร้าน) เป็นรายโครงการ
-- รัน SQL นี้ใน Supabase SQL Editor (รันซ้ำได้ไม่มี error)
-- ============================================================

ALTER TABLE projects
  ADD COLUMN IF NOT EXISTS track_bills BOOLEAN DEFAULT false;
