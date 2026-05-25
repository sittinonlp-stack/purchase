-- ============================================================
-- migration-profile-avatar.sql
-- เพิ่มคอลัมน์ avatar_url ในตาราง profiles
-- รัน SQL นี้ใน Supabase SQL Editor (รันซ้ำได้ไม่มี error)
-- ============================================================

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS avatar_url TEXT DEFAULT '';
