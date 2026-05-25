-- ============================================================
-- ระบบจัดซื้อฟอร์เฮ้าส์ — Supabase Schema
-- รันสคริปต์นี้ทั้งหมดใน Supabase Dashboard → SQL Editor
-- ============================================================

-- TABLES -------------------------------------------------------

CREATE TABLE IF NOT EXISTS projects (
  id          TEXT PRIMARY KEY,
  code        TEXT    NOT NULL DEFAULT '',
  name        TEXT    NOT NULL DEFAULT '',
  client      TEXT             DEFAULT '',
  color       TEXT             DEFAULT '#d97706',
  status      TEXT             DEFAULT 'active',
  created_at  TIMESTAMPTZ      DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS material_categories (
  id          TEXT PRIMARY KEY,
  name        TEXT    NOT NULL DEFAULT '',
  color       TEXT             DEFAULT '#9ca3af',
  created_at  TIMESTAMPTZ      DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS machinery_categories (
  id          TEXT PRIMARY KEY,
  name        TEXT    NOT NULL DEFAULT '',
  color       TEXT             DEFAULT '#9ca3af',
  created_at  TIMESTAMPTZ      DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS labor_categories (
  id          TEXT PRIMARY KEY,
  name        TEXT    NOT NULL DEFAULT '',
  color       TEXT             DEFAULT '#9ca3af',
  created_at  TIMESTAMPTZ      DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS lump_labor_categories (
  id          TEXT PRIMARY KEY,
  name        TEXT    NOT NULL DEFAULT '',
  color       TEXT             DEFAULT '#9ca3af',
  created_at  TIMESTAMPTZ      DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS other_categories (
  id          TEXT PRIMARY KEY,
  name        TEXT    NOT NULL DEFAULT '',
  color       TEXT             DEFAULT '#9ca3af',
  created_at  TIMESTAMPTZ      DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS worker_teams (
  id          TEXT PRIMARY KEY,
  name        TEXT    NOT NULL DEFAULT '',
  leader      TEXT             DEFAULT '',
  phone       TEXT             DEFAULT '',
  size        INTEGER          DEFAULT 1,
  specialty   TEXT             DEFAULT '',
  note        TEXT             DEFAULT '',
  created_at  TIMESTAMPTZ      DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS records (
  id                  TEXT PRIMARY KEY,
  type                TEXT    NOT NULL CHECK (type IN ('material','machine','labor','lump-labor','other')),
  doc_no              TEXT    NOT NULL DEFAULT '',
  date                DATE    NOT NULL,
  project_id          TEXT    REFERENCES projects(id)      ON DELETE SET NULL,
  vendor              TEXT             DEFAULT '',
  worker_team_id      TEXT    REFERENCES worker_teams(id)  ON DELETE SET NULL,
  period              TEXT             DEFAULT '',
  vat_mode            TEXT             DEFAULT 'exclusive',
  vat_rate            NUMERIC          DEFAULT 7,
  wht_enabled         BOOLEAN          DEFAULT FALSE,
  wht_rate            NUMERIC          DEFAULT 0,
  advance_deduction   NUMERIC          DEFAULT 0,
  retention_deduction NUMERIC          DEFAULT 0,
  docs                TEXT[]           DEFAULT '{}',
  note                TEXT             DEFAULT '',
  images              TEXT[]           DEFAULT '{}',
  created_at          TIMESTAMPTZ      DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS record_items (
  id          TEXT    PRIMARY KEY,
  record_id   TEXT    NOT NULL REFERENCES records(id) ON DELETE CASCADE,
  name        TEXT    NOT NULL DEFAULT '',
  category_id TEXT             DEFAULT '',
  qty         NUMERIC          DEFAULT 0,
  unit        TEXT             DEFAULT '',
  price       NUMERIC          DEFAULT 0,
  sort_order  INTEGER          DEFAULT 0
);

CREATE TABLE IF NOT EXISTS work_logs (
  id          TEXT    PRIMARY KEY,
  record_id   TEXT    NOT NULL REFERENCES records(id) ON DELETE CASCADE,
  date        DATE    NOT NULL,
  note        TEXT             DEFAULT '',
  images      TEXT[]           DEFAULT '{}',
  created_at  TIMESTAMPTZ      DEFAULT NOW()
);

-- ROW LEVEL SECURITY -------------------------------------------
-- (ระบบใช้ภายในองค์กร — อนุญาตทุก operation สำหรับ anon key)

ALTER TABLE projects             ENABLE ROW LEVEL SECURITY;
ALTER TABLE material_categories  ENABLE ROW LEVEL SECURITY;
ALTER TABLE machinery_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE labor_categories       ENABLE ROW LEVEL SECURITY;
ALTER TABLE lump_labor_categories  ENABLE ROW LEVEL SECURITY;
ALTER TABLE other_categories       ENABLE ROW LEVEL SECURITY;
ALTER TABLE worker_teams         ENABLE ROW LEVEL SECURITY;
ALTER TABLE records              ENABLE ROW LEVEL SECURITY;
ALTER TABLE record_items         ENABLE ROW LEVEL SECURITY;
ALTER TABLE work_logs            ENABLE ROW LEVEL SECURITY;

CREATE POLICY "anon_all" ON projects             FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "anon_all" ON material_categories  FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "anon_all" ON machinery_categories FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "anon_all" ON labor_categories       FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "anon_all" ON lump_labor_categories  FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "anon_all" ON other_categories       FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "anon_all" ON worker_teams         FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "anon_all" ON records              FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "anon_all" ON record_items         FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "anon_all" ON work_logs            FOR ALL TO anon USING (true) WITH CHECK (true);

-- STORAGE BUCKET -----------------------------------------------
-- หลังรันสคริปต์นี้แล้ว ให้สร้าง Storage bucket ด้วยตัวเองใน Dashboard:
--   Storage → New Bucket → ชื่อ: "procurement-images" → เปิด Public → Create
