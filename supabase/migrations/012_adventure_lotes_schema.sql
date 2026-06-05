-- Lotes (precificação escalonada) por aventura

ALTER TABLE adventures
  ADD COLUMN has_lotes boolean NOT NULL DEFAULT false;

ALTER TABLE adventures
  ADD CONSTRAINT adventure_mode_exclusive
  CHECK (NOT (has_lotes AND has_baterias));

CREATE TABLE adventure_lotes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  adventure_id uuid NOT NULL REFERENCES adventures(id) ON DELETE CASCADE,
  label text NOT NULL,
  sort_order integer NOT NULL DEFAULT 0,
  capacity integer NOT NULL CHECK (capacity > 0),
  price numeric NOT NULL CHECK (price >= 0),
  pix_copia_cola text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX adventure_lotes_adventure_idx
  ON adventure_lotes(adventure_id, sort_order);

ALTER TABLE registrations
  ADD COLUMN lote_id uuid REFERENCES adventure_lotes(id) ON DELETE RESTRICT;

ALTER TABLE adventure_lotes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "adventure_lotes_select_public"
  ON adventure_lotes FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "adventure_lotes_admin_write"
  ON adventure_lotes FOR ALL
  TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());
