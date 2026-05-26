-- ============================================================
-- Migration: เปิด Supabase Realtime สำหรับทุกตารางที่เกี่ยวข้อง
-- ทำให้ user เห็นข้อมูลที่ user คนอื่นบันทึกภายใน <1 วินาที
--
-- วิธีใช้: วางทั้งหมดใน Supabase → SQL Editor → Run
-- ============================================================

-- เพิ่มตารางเข้า publication ของ Realtime (ข้ามกรณีที่เพิ่มแล้ว)
DO $$
DECLARE
  tbl TEXT;
BEGIN
  FOREACH tbl IN ARRAY ARRAY[
    'records',
    'record_items',
    'work_logs',
    'projects',
    'material_categories',
    'machinery_categories',
    'labor_categories',
    'lump_labor_categories',
    'other_categories',
    'worker_teams'
  ] LOOP
    BEGIN
      EXECUTE format('ALTER PUBLICATION supabase_realtime ADD TABLE %I', tbl);
      RAISE NOTICE '✓ Added % to realtime publication', tbl;
    EXCEPTION
      WHEN duplicate_object THEN
        RAISE NOTICE '— % already in realtime publication (skipped)', tbl;
      WHEN undefined_table THEN
        RAISE NOTICE '⚠ % does not exist (skipped)', tbl;
    END;
  END LOOP;
END $$;

-- ตั้ง REPLICA IDENTITY = FULL สำหรับตารางเหล่านี้
-- (จำเป็นต่อ DELETE events ใน Realtime — จะได้รู้ว่าลบ row ไหน)
DO $$
DECLARE
  tbl TEXT;
BEGIN
  FOREACH tbl IN ARRAY ARRAY[
    'records',
    'record_items',
    'work_logs',
    'projects',
    'material_categories',
    'machinery_categories',
    'labor_categories',
    'lump_labor_categories',
    'other_categories',
    'worker_teams'
  ] LOOP
    BEGIN
      EXECUTE format('ALTER TABLE %I REPLICA IDENTITY FULL', tbl);
      RAISE NOTICE '✓ Set REPLICA IDENTITY FULL on %', tbl;
    EXCEPTION
      WHEN undefined_table THEN
        RAISE NOTICE '⚠ % does not exist (skipped)', tbl;
    END;
  END LOOP;
END $$;

-- ตรวจสอบผลลัพธ์:
-- SELECT schemaname, tablename
-- FROM   pg_publication_tables
-- WHERE  pubname = 'supabase_realtime'
-- ORDER  BY tablename;
