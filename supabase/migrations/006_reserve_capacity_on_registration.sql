-- Exposed to anon/authenticated so the public adventure page can read the reserved count.
CREATE OR REPLACE FUNCTION get_adventure_reserved_participants(p_adventure_id uuid)
RETURNS integer
LANGUAGE sql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT COALESCE(SUM(group_size), 0)::integer
  FROM registrations
  WHERE adventure_id = p_adventure_id;
$$;

REVOKE EXECUTE ON FUNCTION get_adventure_reserved_participants(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION get_adventure_reserved_participants(uuid) TO anon, authenticated;

CREATE OR REPLACE FUNCTION create_registration_with_capacity(
  p_adventure_id uuid,
  p_name text,
  p_email text,
  p_phone text,
  p_group_size integer,
  p_participants jsonb,
  p_custom_data jsonb
)
RETURNS registrations
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_max_participants integer;
  v_adventure_title text;
  v_adventure_price numeric;
  v_reserved integer;
  v_registration registrations%ROWTYPE;
BEGIN
  IF p_group_size IS NULL OR p_group_size <= 0 THEN
    RAISE EXCEPTION USING MESSAGE = 'INVALID_GROUP_SIZE';
  END IF;

  SELECT title, price, max_participants
  INTO v_adventure_title, v_adventure_price, v_max_participants
  FROM adventures
  WHERE id = p_adventure_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION USING MESSAGE = 'ADVENTURE_NOT_FOUND';
  END IF;

  SELECT COALESCE(SUM(group_size), 0)::integer
  INTO v_reserved
  FROM registrations
  WHERE adventure_id = p_adventure_id;

  IF v_max_participants IS NOT NULL AND v_reserved + p_group_size > v_max_participants THEN
    RAISE EXCEPTION USING MESSAGE = 'CAPACITY_EXCEEDED';
  END IF;

  INSERT INTO registrations (
    adventure_id,
    adventure_title,
    name,
    email,
    phone,
    group_size,
    participants,
    custom_data,
    payment_status,
    total_amount
  )
  VALUES (
    p_adventure_id,
    v_adventure_title,
    p_name,
    p_email,
    p_phone,
    p_group_size,
    p_participants,
    p_custom_data,
    'pending',
    v_adventure_price * p_group_size
  )
  RETURNING *
  INTO v_registration;

  RETURN v_registration;
END;
$$;

REVOKE EXECUTE ON FUNCTION create_registration_with_capacity(uuid, text, text, text, integer, jsonb, jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION create_registration_with_capacity(uuid, text, text, text, integer, jsonb, jsonb) TO anon, authenticated;

DROP POLICY IF EXISTS "registrations_insert" ON registrations;
