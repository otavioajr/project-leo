-- supabase/migrations/015_adventure_visibility.sql
-- Visibilidade pública da aventura: quando desabilitada, visitantes não
-- conseguem ler a linha (RLS). Admins continuam vendo todas.

ALTER TABLE adventures
  ADD COLUMN is_enabled boolean NOT NULL DEFAULT true;

DROP POLICY IF EXISTS "adventures_select" ON adventures;
CREATE POLICY "adventures_select" ON adventures
  FOR SELECT
  USING (is_enabled = true OR is_admin());
