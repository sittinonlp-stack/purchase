-- ============================================================
-- Migration ALL-IN-ONE — รวมทุก migration ที่ค้างอยู่
-- รันที่เดียวจบใน Supabase → SQL Editor → Run
-- ปลอดภัย: ทุก statement ใช้ IF NOT EXISTS / DO blocks → รันซ้ำได้
-- ============================================================

-- ────────────────────────────────────────────────────────────
-- ส่วนที่ 1: เพิ่มประเภท 'quick-receipt' ใน CHECK constraint
-- ────────────────────────────────────────────────────────────
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
  CHECK (type IN ('material', 'machine', 'labor', 'lump-labor', 'other', 'quick-receipt'));

-- ────────────────────────────────────────────────────────────
-- ส่วนที่ 2: เพิ่มคอลัมน์เงินประกันสินค้า
-- ────────────────────────────────────────────────────────────
ALTER TABLE records
  ADD COLUMN IF NOT EXISTS deposit_amount        NUMERIC NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS deposit_status        TEXT    NOT NULL DEFAULT 'none',
  ADD COLUMN IF NOT EXISTS deposit_return_date   DATE,
  ADD COLUMN IF NOT EXISTS deposit_return_images JSONB   NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS deposit_return_note   TEXT    NOT NULL DEFAULT '';

-- เพิ่มคอลัมน์รูปภาพทีมช่าง
ALTER TABLE worker_teams
  ADD COLUMN IF NOT EXISTS images TEXT[] DEFAULT '{}';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'records'::regclass AND conname = 'records_deposit_status_check'
  ) THEN
    ALTER TABLE records
      ADD CONSTRAINT records_deposit_status_check
      CHECK (deposit_status IN ('none', 'pending', 'returned'));
    RAISE NOTICE '✓ Added deposit_status CHECK constraint';
  END IF;
END $$;

-- ────────────────────────────────────────────────────────────
-- ส่วนที่ 3: เปิด Realtime publication + REPLICA IDENTITY FULL
-- ────────────────────────────────────────────────────────────
DO $$
DECLARE
  tbl TEXT;
BEGIN
  FOREACH tbl IN ARRAY ARRAY[
    'records', 'record_items', 'work_logs',
    'projects',
    'material_categories', 'machinery_categories',
    'labor_categories', 'lump_labor_categories', 'other_categories',
    'worker_teams'
  ] LOOP
    BEGIN
      EXECUTE format('ALTER PUBLICATION supabase_realtime ADD TABLE %I', tbl);
      RAISE NOTICE '✓ Added % to realtime publication', tbl;
    EXCEPTION
      WHEN duplicate_object THEN
        RAISE NOTICE '— % already in realtime (skipped)', tbl;
      WHEN undefined_table THEN
        RAISE NOTICE '⚠ % does not exist (skipped)', tbl;
    END;

    BEGIN
      EXECUTE format('ALTER TABLE %I REPLICA IDENTITY FULL', tbl);
    EXCEPTION WHEN undefined_table THEN NULL;
    END;
  END LOOP;
END $$;

-- ────────────────────────────────────────────────────────────
-- ตรวจสอบผลลัพธ์
-- ────────────────────────────────────────────────────────────
SELECT 'deposit columns' AS check_name,
       COUNT(*) AS count,
       string_agg(column_name, ', ') AS columns
FROM   information_schema.columns
WHERE  table_name = 'records' AND column_name LIKE 'deposit%'
UNION ALL
SELECT 'realtime tables', COUNT(*),
       string_agg(tablename, ', ' ORDER BY tablename)
FROM   pg_publication_tables
WHERE  pubname = 'supabase_realtime'
  AND  tablename IN ('records', 'record_items', 'work_logs', 'projects',
                     'material_categories', 'machinery_categories',
                     'labor_categories', 'lump_labor_categories',
                     'other_categories', 'worker_teams');
