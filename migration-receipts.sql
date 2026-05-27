-- ============================================================
-- Migration: เพิ่มประเภท 'receipt' (ใบเสร็จรับเงิน)
-- + คอลัมน์ meta (JSONB) สำหรับเก็บข้อมูลเฉพาะ type
-- วิธีใช้: วางทั้งหมดใน Supabase → SQL Editor → Run
-- ปลอดภัย: รันซ้ำได้
-- ============================================================

-- ── 1) อัพเดต CHECK constraint บน type ────────────────────
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

ALTER TABLE records
  ADD CONSTRAINT records_type_check
  CHECK (type IN (
    'material', 'machine', 'labor', 'lump-labor',
    'other', 'quick-receipt', 'receipt'
  ));

-- ── 2) เพิ่มคอลัมน์ meta สำหรับข้อมูลเฉพาะ type ────────────
-- ใช้เก็บข้อมูลใบเสร็จ (customer address, payment method, ฯลฯ)
-- และอาจใช้กับ type อื่นในอนาคต
ALTER TABLE records
  ADD COLUMN IF NOT EXISTS meta JSONB NOT NULL DEFAULT '{}'::jsonb;

-- ── 3) ตรวจสอบ ─────────────────────────────────────────
SELECT 'type values'  AS check_name,
       pg_get_constraintdef(oid) AS details
FROM   pg_constraint
WHERE  conrelid = 'records'::regclass AND conname = 'records_type_check'
UNION ALL
SELECT 'meta column',
       data_type || ' default: ' || COALESCE(column_default, 'null')
FROM   information_schema.columns
WHERE  table_name = 'records' AND column_name = 'meta';
