-- ============================================================
-- migration-worker-team-doc-fields.sql
-- เพิ่มคอลัมน์ข้อมูลสำหรับออกเอกสารในตาราง worker_teams
-- รัน SQL นี้ใน Supabase SQL Editor (รันซ้ำได้ไม่มี error)
-- ============================================================

ALTER TABLE worker_teams
  ADD COLUMN IF NOT EXISTS needs_doc  BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS full_name  TEXT    DEFAULT '',
  ADD COLUMN IF NOT EXISTS id_card    TEXT    DEFAULT '',
  ADD COLUMN IF NOT EXISTS address    TEXT    DEFAULT '';
