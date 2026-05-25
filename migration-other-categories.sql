-- ============================================================
-- migration-other-categories.sql
-- เพิ่มตาราง other_categories สำหรับหมวดหมู่ค่าใช้จ่ายอื่นๆ
-- และอัปเดต CHECK constraint ของ records ให้รองรับ type='other'
-- รัน SQL นี้ใน Supabase SQL Editor (รันซ้ำได้ไม่มี error)
-- ============================================================

-- 1. สร้างตาราง other_categories
CREATE TABLE IF NOT EXISTS other_categories (
  id          TEXT PRIMARY KEY,
  name        TEXT    NOT NULL DEFAULT '',
  color       TEXT             DEFAULT '#9ca3af',
  created_at  TIMESTAMPTZ      DEFAULT NOW()
);

-- 2. เปิด RLS + policies
ALTER TABLE other_categories ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_all"     ON other_categories;
DROP POLICY IF EXISTS "auth_select"  ON other_categories;
DROP POLICY IF EXISTS "auth_insert"  ON other_categories;
DROP POLICY IF EXISTS "auth_update"  ON other_categories;
DROP POLICY IF EXISTS "admin_delete" ON other_categories;

CREATE POLICY "auth_select"  ON other_categories FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth_insert"  ON other_categories FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "auth_update"  ON other_categories FOR UPDATE TO authenticated USING (true);
CREATE POLICY "admin_delete" ON other_categories FOR DELETE TO authenticated
  USING (public.get_user_role() = 'admin');

-- 3. อัปเดต CHECK constraint ของ records ให้รองรับ type='other'
--    (ลบ constraint เก่าก่อน แล้วสร้างใหม่)
ALTER TABLE records DROP CONSTRAINT IF EXISTS records_type_check;
ALTER TABLE records ADD CONSTRAINT records_type_check
  CHECK (type IN ('material', 'machine', 'labor', 'lump-labor', 'other'));
