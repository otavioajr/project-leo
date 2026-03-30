ALTER TABLE adventures
ADD COLUMN max_participants integer;

ALTER TABLE adventures
ADD CONSTRAINT adventures_max_participants_check
CHECK (max_participants IS NULL OR max_participants > 0);

CREATE OR REPLACE FUNCTION get_adventure_confirmed_participants(p_adventure_id uuid)
RETURNS integer AS $$
  SELECT COALESCE(SUM(group_size), 0)::integer
  FROM registrations
  WHERE adventure_id = p_adventure_id
    AND payment_status = 'confirmed';
$$ LANGUAGE sql SECURITY DEFINER;
