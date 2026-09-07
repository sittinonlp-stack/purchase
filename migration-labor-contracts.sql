-- ============================================================
-- migration-labor-contracts.sql
-- ตาราง "สัญญาค่าแรง" — เก็บค่าแรงรวม + งวดงาน แล้วออกใบเบิกรายงวด (บิลแยกแต่ละรอบ)
-- โครงสร้าง installments (jsonb): [{ id, no, detail, amount, withdrawnDocId, withdrawnDocNo, withdrawnDate }]
-- รัน SQL นี้ใน Supabase SQL Editor (รันซ้ำได้ไม่มี error)
-- ============================================================

CREATE TABLE IF NOT EXISTS labor_contracts (
  id           TEXT PRIMARY KEY,
  project_id   TEXT REFERENCES projects(id)      ON DELETE CASCADE,
  team_id      TEXT REFERENCES worker_teams(id)  ON DELETE SET NULL,
  category_id  TEXT,
  title        TEXT    DEFAULT '',
  total        NUMERIC DEFAULT 0,
  installments JSONB   DEFAULT '[]'::jsonb,
  status       TEXT    DEFAULT 'open',
  meta         JSONB   DEFAULT '{}'::jsonb,
  created_at   TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE labor_contracts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "auth_select"  ON labor_contracts;
DROP POLICY IF EXISTS "auth_insert"  ON labor_contracts;
DROP POLICY IF EXISTS "auth_update"  ON labor_contracts;
DROP POLICY IF EXISTS "admin_delete" ON labor_contracts;

CREATE POLICY "auth_select"  ON labor_contracts FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth_insert"  ON labor_contracts FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "auth_update"  ON labor_contracts FOR UPDATE TO authenticated USING (true);
CREATE POLICY "admin_delete" ON labor_contracts FOR DELETE TO authenticated
  USING (public.get_user_role() = 'admin');
