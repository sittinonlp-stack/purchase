-- ============================================================
-- migration-storage-bucket.sql
-- สร้าง Storage bucket "procurement-images" + policies
-- ปัญหาเดิม: bucket ไม่มี → รูปถูกเก็บเป็น base64 ในตาราง records/work_logs
--           ทำให้ข้อมูลบวม โหลดช้า และบางครั้ง timeout
-- วิธีใช้: วางทั้งหมดใน Supabase Dashboard → SQL Editor → Run (รันซ้ำได้)
-- ============================================================

-- 1) สร้าง bucket แบบ public (อ่านรูปได้โดยไม่ต้องล็อกอิน, อัปโหลดต้องล็อกอิน)
INSERT INTO storage.buckets (id, name, public)
VALUES ('procurement-images', 'procurement-images', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- 2) RLS policies บน storage.objects เฉพาะ bucket นี้
--    อ่าน: ทุกคน (public)   |   เขียน/แก้/ลบ: ผู้ที่ล็อกอินแล้ว
DROP POLICY IF EXISTS "procimg_public_read"   ON storage.objects;
DROP POLICY IF EXISTS "procimg_auth_insert"   ON storage.objects;
DROP POLICY IF EXISTS "procimg_auth_update"   ON storage.objects;
DROP POLICY IF EXISTS "procimg_auth_delete"   ON storage.objects;

CREATE POLICY "procimg_public_read" ON storage.objects
  FOR SELECT TO public
  USING (bucket_id = 'procurement-images');

CREATE POLICY "procimg_auth_insert" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'procurement-images');

CREATE POLICY "procimg_auth_update" ON storage.objects
  FOR UPDATE TO authenticated
  USING (bucket_id = 'procurement-images');

CREATE POLICY "procimg_auth_delete" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'procurement-images');

-- 3) ตรวจสอบ
SELECT id, name, public FROM storage.buckets WHERE id = 'procurement-images';
