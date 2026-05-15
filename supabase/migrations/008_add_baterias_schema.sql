-- supabase/migrations/008_add_baterias_schema.sql

-- 1. Flag no adventure
ALTER TABLE adventures
  ADD COLUMN has_baterias boolean NOT NULL DEFAULT false;

-- 2. Tabela de baterias
CREATE TABLE adventure_baterias (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  adventure_id uuid NOT NULL REFERENCES adventures(id) ON DELETE CASCADE,
  label text NOT NULL,
  start_time time NOT NULL,
  end_time   time NOT NULL,
  capacity   integer NOT NULL CHECK (capacity > 0),
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT bateria_time_valid CHECK (end_time > start_time)
);

CREATE INDEX adventure_baterias_adventure_idx
  ON adventure_baterias(adventure_id, sort_order);

-- 3. Atribuições por inscrição
ALTER TABLE registrations
  ADD COLUMN bateria_assignments jsonb;

-- 4. RLS para adventure_baterias
ALTER TABLE adventure_baterias ENABLE ROW LEVEL SECURITY;

CREATE POLICY "adventure_baterias_select_public"
  ON adventure_baterias FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "adventure_baterias_admin_write"
  ON adventure_baterias FOR ALL
  TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());
