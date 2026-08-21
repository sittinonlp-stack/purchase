-- ============================================================
-- migration-worker-team-members.sql
-- เพิ่มคอลัมน์ members ในตาราง worker_teams
-- เก็บรายชื่อลูกทีม/คนงานในแต่ละหัวหน้าชุด (มีประวัติเข้า-ออก)
-- โครงสร้าง: [{ id, name, phone, active, joinedDate, leftDate }]
-- รัน SQL นี้ใน Supabase SQL Editor (รันซ้ำได้ไม่มี error)
-- ============================================================

ALTER TABLE worker_teams
  ADD COLUMN IF NOT EXISTS members JSONB DEFAULT '[]'::jsonb;
