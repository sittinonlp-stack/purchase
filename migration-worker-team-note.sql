-- ============================================================
-- migration-worker-team-note.sql
-- เพิ่มคอลัมน์ note ในตาราง worker_teams
-- รัน SQL นี้ใน Supabase SQL Editor (รันซ้ำได้ไม่มี error)
-- ============================================================

ALTER TABLE worker_teams
  ADD COLUMN IF NOT EXISTS note TEXT DEFAULT '';
