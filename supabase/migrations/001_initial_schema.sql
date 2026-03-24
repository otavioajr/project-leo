-- Adventures table
CREATE TABLE adventures (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text UNIQUE NOT NULL,
  title text NOT NULL,
  description text NOT NULL DEFAULT '',
  long_description text NOT NULL DEFAULT '',
  price numeric NOT NULL DEFAULT 0,
  duration text NOT NULL DEFAULT '',
  location text NOT NULL DEFAULT '',
  difficulty text NOT NULL DEFAULT 'Fácil',
  image_url text NOT NULL DEFAULT '',
  image_description text NOT NULL DEFAULT '',
  registrations_enabled boolean NOT NULL DEFAULT false,
  custom_fields jsonb DEFAULT '[]'::jsonb,
  created_at timestamptz DEFAULT now()
);

-- Registrations table
CREATE TABLE registrations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  adventure_id uuid REFERENCES adventures(id) ON DELETE SET NULL,
  adventure_title text NOT NULL DEFAULT '',
  name text NOT NULL,
  email text NOT NULL,
  phone text NOT NULL DEFAULT '',
  registration_date timestamptz DEFAULT now(),
  group_size integer NOT NULL DEFAULT 1,
  participants jsonb DEFAULT '[]'::jsonb,
  custom_data jsonb DEFAULT '{}'::jsonb,
  payment_status text NOT NULL DEFAULT 'pending',
  total_amount numeric DEFAULT 0,
  registration_token uuid DEFAULT gen_random_uuid()
);

-- Content table (homepage, pix config, etc.)
CREATE TABLE content (
  id text PRIMARY KEY,
  data jsonb NOT NULL DEFAULT '{}'::jsonb,
  updated_at timestamptz DEFAULT now()
);

-- Pages table
CREATE TABLE pages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text UNIQUE NOT NULL,
  title text NOT NULL,
  content text NOT NULL DEFAULT '',
  show_in_header boolean NOT NULL DEFAULT false,
  nav_order integer DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

-- Indexes
CREATE INDEX idx_pages_header ON pages (show_in_header, nav_order);
CREATE INDEX idx_registrations_token ON registrations (registration_token);

-- Enable Row Level Security
ALTER TABLE adventures ENABLE ROW LEVEL SECURITY;
ALTER TABLE registrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE content ENABLE ROW LEVEL SECURITY;
ALTER TABLE pages ENABLE ROW LEVEL SECURITY;

-- Helper function to check admin
CREATE OR REPLACE FUNCTION is_admin()
RETURNS boolean AS $$
  SELECT coalesce(
    (auth.jwt() -> 'app_metadata' ->> 'is_admin')::boolean,
    false
  );
$$ LANGUAGE sql SECURITY DEFINER;

-- Adventures policies
CREATE POLICY "adventures_select" ON adventures FOR SELECT USING (true);
CREATE POLICY "adventures_insert" ON adventures FOR INSERT WITH CHECK (is_admin());
CREATE POLICY "adventures_update" ON adventures FOR UPDATE USING (is_admin());
CREATE POLICY "adventures_delete" ON adventures FOR DELETE USING (is_admin());

-- Content policies
CREATE POLICY "content_select" ON content FOR SELECT USING (true);
CREATE POLICY "content_insert" ON content FOR INSERT WITH CHECK (is_admin());
CREATE POLICY "content_update" ON content FOR UPDATE USING (is_admin());
CREATE POLICY "content_delete" ON content FOR DELETE USING (is_admin());

-- Pages policies
CREATE POLICY "pages_select" ON pages FOR SELECT USING (true);
CREATE POLICY "pages_insert" ON pages FOR INSERT WITH CHECK (is_admin());
CREATE POLICY "pages_update" ON pages FOR UPDATE USING (is_admin());
CREATE POLICY "pages_delete" ON pages FOR DELETE USING (is_admin());

-- Registrations policies
CREATE POLICY "registrations_insert" ON registrations FOR INSERT WITH CHECK (true);
CREATE POLICY "registrations_select_admin" ON registrations FOR SELECT USING (is_admin());
CREATE POLICY "registrations_update_admin" ON registrations FOR UPDATE USING (is_admin());
CREATE POLICY "registrations_delete" ON registrations FOR DELETE USING (is_admin());

-- RPC functions for token-based access (payment page flow)
CREATE OR REPLACE FUNCTION get_registration_by_token(p_id uuid, p_token uuid)
RETURNS SETOF registrations AS $$
  SELECT * FROM registrations WHERE id = p_id AND registration_token = p_token;
$$ LANGUAGE sql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION confirm_payment_by_token(p_id uuid, p_token uuid)
RETURNS SETOF registrations AS $$
  UPDATE registrations
  SET payment_status = 'awaiting_confirmation'
  WHERE id = p_id
    AND registration_token = p_token
    AND payment_status NOT IN ('confirmed', 'cancelled', 'refunded')
  RETURNING *;
$$ LANGUAGE sql SECURITY DEFINER;

-- Auto-update updated_at on content table
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$ BEGIN NEW.updated_at = now(); RETURN NEW; END; $$ LANGUAGE plpgsql;
CREATE TRIGGER update_content_updated_at BEFORE UPDATE ON content FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Enable Realtime for all tables
ALTER PUBLICATION supabase_realtime ADD TABLE adventures;
ALTER PUBLICATION supabase_realtime ADD TABLE registrations;
ALTER PUBLICATION supabase_realtime ADD TABLE content;
ALTER PUBLICATION supabase_realtime ADD TABLE pages;
