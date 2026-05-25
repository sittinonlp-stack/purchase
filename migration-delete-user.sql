-- ============================================================
-- migration-delete-user.sql
-- เพิ่ม RLS policy ให้ Admin ลบ profile ผู้ใช้อื่นได้
-- รันใน Supabase SQL Editor (รันซ้ำได้ไม่มี error)
-- ============================================================

DROP POLICY IF EXISTS "profiles_delete" ON profiles;

-- Admin เท่านั้นที่ลบได้ และลบตัวเองไม่ได้
CREATE POLICY "profiles_delete" ON profiles FOR DELETE TO authenticated
  USING (id <> auth.uid() AND public.get_user_role() = 'admin');
