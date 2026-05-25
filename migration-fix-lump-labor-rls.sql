-- ============================================================
-- migration-fix-lump-labor-rls.sql
-- แก้ RLS ของ lump_labor_categories จาก anon → authenticated
-- รัน SQL นี้ใน Supabase SQL Editor (รันซ้ำได้ไม่มี error)
-- ============================================================

-- ลบ policy เก่าที่ใช้ anon role (ทำให้ authenticated users เพิ่ม/ลบไม่ได้)
DROP POLICY IF EXISTS "anon_all"     ON lump_labor_categories;

-- สร้าง policy ใหม่สำหรับ authenticated users
DROP POLICY IF EXISTS "auth_select"  ON lump_labor_categories;
DROP POLICY IF EXISTS "auth_insert"  ON lump_labor_categories;
DROP POLICY IF EXISTS "auth_update"  ON lump_labor_categories;
DROP POLICY IF EXISTS "admin_delete" ON lump_labor_categories;

CREATE POLICY "auth_select"  ON lump_labor_categories FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth_insert"  ON lump_labor_categories FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "auth_update"  ON lump_labor_categories FOR UPDATE TO authenticated USING (true);
CREATE POLICY "admin_delete" ON lump_labor_categories FOR DELETE TO authenticated
  USING (public.get_user_role() = 'admin');
