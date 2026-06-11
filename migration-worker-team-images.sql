-- ============================================================
-- migration-worker-team-images.sql
-- เพิ่มคอลัมน์รูปภาพในตาราง worker_teams
-- รัน SQL นี้ใน Supabase SQL Editor (รันซ้ำได้ไม่มี error)
-- ============================================================

ALTER TABLE worker_teams
  ADD COLUMN IF NOT EXISTS images TEXT[] DEFAULT '{}';
