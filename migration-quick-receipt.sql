-- ============================================================
-- Migration: รองรับประเภทบันทึก 'quick-receipt' (บิลด่วนจากมือถือ)
-- วิธีใช้: วางทั้งหมดใน Supabase → SQL Editor → Run
-- ============================================================

-- ── ขั้นตอนที่ 1: ลบ CHECK constraint เดิมบนคอลัมน์ type ──────────
-- (ชื่อ constraint อาจต่างกันในแต่ละ project)
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN
    SELECT conname
    FROM   pg_constraint
    WHERE  conrelid = 'records'::regclass
      AND  contype  = 'c'
      AND  pg_get_constraintdef(oid) LIKE '%type%'
  LOOP
    EXECUTE format('ALTER TABLE records DROP CONSTRAINT %I', r.conname);
    RAISE NOTICE 'Dropped constraint: %', r.conname;
  END LOOP;
END $$;

-- ── ขั้นตอนที่ 2: เพิ่ม constraint ใหม่ที่รวม 'quick-receipt' ──────
ALTER TABLE records
  ADD CONSTRAINT records_type_check
  CHECK (type IN (
    'material',
    'machine',
    'labor',
    'lump-labor',
    'other',
    'quick-receipt'
  ));

-- ── ตรวจสอบ ──────────────────────────────────────────────────────
-- หลัง run แล้วควรเห็น constraint ใหม่:
-- SELECT conname, pg_get_constraintdef(oid)
-- FROM   pg_constraint
-- WHERE  conrelid = 'records'::regclass AND contype = 'c';
