-- ============================================================
-- migration-worker-team-doc-images.sql
-- เพิ่มคอลัมน์รูปภาพเอกสาร (สำเนาบัตร ปชช. / สัญญา) ในตาราง worker_teams
-- รัน SQL นี้ใน Supabase SQL Editor (รันซ้ำได้ไม่มี error)
-- ============================================================

ALTER TABLE worker_teams
  ADD COLUMN IF NOT EXISTS doc_images TEXT[] DEFAULT '{}';
