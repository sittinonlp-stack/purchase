-- ============================================================
-- Migration: เพิ่มคอลัมน์เงินประกันสินค้าในตาราง records
-- วิธีใช้: วางทั้งหมดใน Supabase → SQL Editor → Run
-- ============================================================

-- เพิ่มคอลัมน์ทีละตัว (ใช้ IF NOT EXISTS ป้องกัน error ถ้ารัน 2 ครั้ง)

ALTER TABLE records
  ADD COLUMN IF NOT EXISTS deposit_amount        NUMERIC       NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS deposit_status        TEXT          NOT NULL DEFAULT 'none',
  ADD COLUMN IF NOT EXISTS deposit_return_date   DATE,
  ADD COLUMN IF NOT EXISTS deposit_return_images JSONB         NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS deposit_return_note   TEXT          NOT NULL DEFAULT '';

-- CHECK constraint สำหรับ deposit_status
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'records'::regclass
      AND conname   = 'records_deposit_status_check'
  ) THEN
    ALTER TABLE records
      ADD CONSTRAINT records_deposit_status_check
      CHECK (deposit_status IN ('none', 'pending', 'returned'));
  END IF;
END $$;

-- ตรวจสอบผลลัพธ์:
-- SELECT column_name, data_type, column_default
-- FROM   information_schema.columns
-- WHERE  table_name = 'records'
-- AND    column_name LIKE 'deposit%'
-- ORDER  BY column_name;
