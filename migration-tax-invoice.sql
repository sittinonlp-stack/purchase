-- ============================================================
-- Migration: เพิ่มประเภท 'tax-invoice' (ใบเสร็จรับเงิน/ใบกำกับภาษี)
-- วิธีใช้: วางทั้งหมดใน Supabase → SQL Editor → Run
-- ปลอดภัย: รันซ้ำได้
-- ============================================================

-- ลบ CHECK constraint เดิมบน type
DO $$
DECLARE
  r RECORD;
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

-- สร้างใหม่รวม 'tax-invoice'
ALTER TABLE records
  ADD CONSTRAINT records_type_check
  CHECK (type IN (
    'material', 'machine', 'labor', 'lump-labor',
    'other', 'quick-receipt', 'receipt', 'tax-invoice'
  ));

-- ตรวจสอบ
SELECT pg_get_constraintdef(oid) AS constraint_definition
FROM   pg_constraint
WHERE  conrelid = 'records'::regclass AND conname = 'records_type_check';
