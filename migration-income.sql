-- ============================================================
-- migration-income.sql
-- เพิ่มประเภท 'income' (บันทึกรายรับ) ใน CHECK constraint ของตาราง records
-- วิธีใช้: วางทั้งหมดใน Supabase Dashboard → SQL Editor → Run (รันซ้ำได้)
-- ============================================================

-- 1) ลบ CHECK constraint เดิมบนคอลัมน์ type (ชื่ออาจต่างกันในแต่ละ DB)
DO $$
DECLARE r RECORD;
BEGIN
  FOR r IN
    SELECT conname FROM pg_constraint
    WHERE conrelid = 'records'::regclass AND contype = 'c'
      AND pg_get_constraintdef(oid) LIKE '%type%'
  LOOP
    EXECUTE format('ALTER TABLE records DROP CONSTRAINT %I', r.conname);
    RAISE NOTICE '✓ Dropped old type constraint: %', r.conname;
  END LOOP;
END $$;

-- 2) สร้าง CHECK constraint ใหม่ที่รวม 'income' พร้อมประเภทเดิมทั้งหมด
ALTER TABLE records
  ADD CONSTRAINT records_type_check
  CHECK (type IN (
    'material', 'machine', 'labor', 'lump-labor',
    'other', 'quick-receipt', 'receipt',
    'tax-invoice', 'invoice', 'income'
  ));

-- 3) ตรวจสอบ
SELECT pg_get_constraintdef(oid) AS type_constraint
FROM pg_constraint
WHERE conrelid = 'records'::regclass AND conname = 'records_type_check';
