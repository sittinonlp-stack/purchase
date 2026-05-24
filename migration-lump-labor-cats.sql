-- ============================================================
-- Migration: เพิ่มตาราง lump_labor_categories
-- และแก้ CHECK constraint ของ records ให้รองรับ 'lump-labor'
-- รัน SQL นี้ใน Supabase Dashboard → SQL Editor
-- ============================================================

-- 1. สร้างตาราง lump_labor_categories
CREATE TABLE IF NOT EXISTS lump_labor_categories (
  id          TEXT PRIMARY KEY,
  name        TEXT    NOT NULL DEFAULT '',
  color       TEXT             DEFAULT '#9ca3af',
  created_at  TIMESTAMPTZ      DEFAULT NOW()
);

-- 2. เปิด RLS + policy
ALTER TABLE lump_labor_categories ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_all" ON lump_labor_categories;
CREATE POLICY "anon_all" ON lump_labor_categories FOR ALL TO anon USING (true) WITH CHECK (true);

-- 3. แก้ CHECK constraint ของ records ให้รองรับ 'lump-labor'
ALTER TABLE records
  DROP CONSTRAINT IF EXISTS records_type_check;
ALTER TABLE records
  ADD CONSTRAINT records_type_check
  CHECK (type IN ('material', 'machine', 'labor', 'lump-labor'));
