-- ============================================================
-- migration-income-contracts.sql
-- ตาราง "งวดงานรับเงินลูกค้า" — เก็บมูลค่าโครงการ + งวดรับเงิน แล้วออกบันทึกรายรับรายงวด
-- โครงสร้าง installments (jsonb): [{ id, no, detail, amount, receivedDocId, receivedDocNo, receivedDate }]
-- รัน SQL นี้ใน Supabase SQL Editor (รันซ้ำได้ไม่มี error)
-- ============================================================

CREATE TABLE IF NOT EXISTS income_contracts (
  id           TEXT PRIMARY KEY,
  project_id   TEXT REFERENCES projects(id) ON DELETE CASCADE,
  client       TEXT    DEFAULT '',
  title        TEXT    DEFAULT '',
  total        NUMERIC DEFAULT 0,
  installments JSONB   DEFAULT '[]'::jsonb,
  status       TEXT    DEFAULT 'open',
  meta         JSONB   DEFAULT '{}'::jsonb,
  created_at   TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE income_contracts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "auth_select"  ON income_contracts;
DROP POLICY IF EXISTS "auth_insert"  ON income_contracts;
DROP POLICY IF EXISTS "auth_update"  ON income_contracts;
DROP POLICY IF EXISTS "admin_delete" ON income_contracts;

CREATE POLICY "auth_select"  ON income_contracts FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth_insert"  ON income_contracts FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "auth_update"  ON income_contracts FOR UPDATE TO authenticated USING (true);
CREATE POLICY "admin_delete" ON income_contracts FOR DELETE TO authenticated
  USING (public.get_user_role() = 'admin');
