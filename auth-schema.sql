-- ============================================================
-- auth-schema.sql — Authentication & RBAC
-- รันใน Supabase SQL Editor หลังจาก schema.sql
-- ============================================================

-- 1. PROFILES TABLE ----------------------------------------

CREATE TABLE IF NOT EXISTS profiles (
  id          UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  email       TEXT NOT NULL DEFAULT '',
  full_name   TEXT          DEFAULT '',
  role        TEXT          DEFAULT 'user' CHECK (role IN ('admin','user')),
  created_at  TIMESTAMPTZ   DEFAULT NOW()
);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "profiles_read"   ON profiles FOR SELECT TO authenticated USING (true);
CREATE POLICY "profiles_insert" ON profiles FOR INSERT TO authenticated WITH CHECK (id = auth.uid());
CREATE POLICY "profiles_update" ON profiles FOR UPDATE TO authenticated
  USING (id = auth.uid() OR (SELECT role FROM profiles WHERE id = auth.uid()) = 'admin');

-- 2. AUTO-CREATE PROFILE ON SIGNUP -------------------------
-- First user → admin, all others → user

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE cnt INTEGER;
BEGIN
  SELECT COUNT(*) INTO cnt FROM public.profiles;
  INSERT INTO public.profiles (id, email, full_name, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    CASE WHEN cnt = 0 THEN 'admin' ELSE 'user' END
  );
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 3. ROLE HELPER FUNCTION ----------------------------------

CREATE OR REPLACE FUNCTION public.get_user_role()
RETURNS TEXT LANGUAGE sql SECURITY DEFINER STABLE AS $$
  SELECT role FROM public.profiles WHERE id = auth.uid();
$$;

-- 4. UPDATE RLS — DROP ANON, ADD AUTHENTICATED -------------
-- ทุกตาราง: SELECT/INSERT/UPDATE → authenticated ทุกคน
--            DELETE → admin เท่านั้น
-- (record_items และ work_logs: DELETE ได้ทุกคน เพราะใช้ตอน updateRecord)

-- PROJECTS
DROP POLICY IF EXISTS "anon_all"     ON projects;
CREATE POLICY "auth_select"  ON projects FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth_insert"  ON projects FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "auth_update"  ON projects FOR UPDATE TO authenticated USING (true);
CREATE POLICY "admin_delete" ON projects FOR DELETE TO authenticated
  USING (public.get_user_role() = 'admin');

-- MATERIAL CATEGORIES
DROP POLICY IF EXISTS "anon_all"     ON material_categories;
CREATE POLICY "auth_select"  ON material_categories FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth_insert"  ON material_categories FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "auth_update"  ON material_categories FOR UPDATE TO authenticated USING (true);
CREATE POLICY "admin_delete" ON material_categories FOR DELETE TO authenticated
  USING (public.get_user_role() = 'admin');

-- MACHINERY CATEGORIES
DROP POLICY IF EXISTS "anon_all"     ON machinery_categories;
CREATE POLICY "auth_select"  ON machinery_categories FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth_insert"  ON machinery_categories FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "auth_update"  ON machinery_categories FOR UPDATE TO authenticated USING (true);
CREATE POLICY "admin_delete" ON machinery_categories FOR DELETE TO authenticated
  USING (public.get_user_role() = 'admin');

-- LABOR CATEGORIES
DROP POLICY IF EXISTS "anon_all"     ON labor_categories;
CREATE POLICY "auth_select"  ON labor_categories FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth_insert"  ON labor_categories FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "auth_update"  ON labor_categories FOR UPDATE TO authenticated USING (true);
CREATE POLICY "admin_delete" ON labor_categories FOR DELETE TO authenticated
  USING (public.get_user_role() = 'admin');

-- WORKER TEAMS
DROP POLICY IF EXISTS "anon_all"     ON worker_teams;
CREATE POLICY "auth_select"  ON worker_teams FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth_insert"  ON worker_teams FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "auth_update"  ON worker_teams FOR UPDATE TO authenticated USING (true);
CREATE POLICY "admin_delete" ON worker_teams FOR DELETE TO authenticated
  USING (public.get_user_role() = 'admin');

-- RECORDS
DROP POLICY IF EXISTS "anon_all"     ON records;
CREATE POLICY "auth_select"  ON records FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth_insert"  ON records FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "auth_update"  ON records FOR UPDATE TO authenticated USING (true);
CREATE POLICY "admin_delete" ON records FOR DELETE TO authenticated
  USING (public.get_user_role() = 'admin');

-- RECORD ITEMS (DELETE allowed for all → needed by updateRecord)
DROP POLICY IF EXISTS "anon_all"     ON record_items;
CREATE POLICY "auth_all" ON record_items FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- WORK LOGS (DELETE allowed for all → needed by updateRecord)
DROP POLICY IF EXISTS "anon_all"     ON work_logs;
CREATE POLICY "auth_all" ON work_logs FOR ALL TO authenticated USING (true) WITH CHECK (true);
