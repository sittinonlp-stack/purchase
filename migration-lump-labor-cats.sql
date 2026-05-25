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

-- 2. เปิด RLS + policies (authenticated users เท่านั้น; admin ลบได้)
ALTER TABLE lump_labor_categories ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_all"     ON lump_labor_categories;
DROP POLICY IF EXISTS "auth_select"  ON lump_labor_categories;
DROP POLICY IF EXISTS "auth_insert"  ON lump_labor_categories;
DROP POLICY IF EXISTS "auth_update"  ON lump_labor_categories;
DROP POLICY IF EXISTS "admin_delete" ON lump_labor_categories;
CREATE POLICY "auth_select"  ON lump_labor_categories FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth_insert"  ON lump_labor_categories FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "auth_update"  ON lump_labor_categories FOR UPDATE TO authenticated USING (true);
CREATE POLICY "admin_delete" ON lump_labor_categories FOR DELETE TO authenticated
  USING (public.get_user_role() = 'admin');

-- 3. แก้ CHECK constraint ของ records ให้รองรับ 'lump-labor'
ALTER TABLE records
  DROP CONSTRAINT IF EXISTS records_type_check;
ALTER TABLE records
  ADD CONSTRAINT records_type_check
  CHECK (type IN ('material', 'machine', 'labor', 'lump-labor'));
