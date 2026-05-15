CREATE OR REPLACE FUNCTION get_adventure_baterias_with_availability(
  p_adventure_id uuid
)
RETURNS TABLE (
  id uuid,
  label text,
  start_time time,
  end_time time,
  capacity integer,
  sort_order integer,
  reserved integer
)
LANGUAGE sql SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  WITH slot_counts AS (
    SELECT s.bid AS bateria_id, COUNT(*)::integer AS reserved
    FROM registrations r,
         LATERAL (
           SELECT (r.bateria_assignments->>'principal')::uuid AS bid
           WHERE r.bateria_assignments ? 'principal'
           UNION ALL
           SELECT (jsonb_array_elements_text(r.bateria_assignments->'participants'))::uuid
           WHERE r.bateria_assignments ? 'participants'
         ) AS s(bid)
    WHERE r.adventure_id = p_adventure_id
      AND r.bateria_assignments IS NOT NULL
      AND is_registration_capacity_active(r.payment_status)
    GROUP BY s.bid
  )
  SELECT b.id, b.label, b.start_time, b.end_time, b.capacity, b.sort_order,
         COALESCE(sc.reserved, 0) AS reserved
  FROM adventure_baterias b
  LEFT JOIN slot_counts sc ON sc.bateria_id = b.id
  WHERE b.adventure_id = p_adventure_id
  ORDER BY b.sort_order, b.start_time;
$$;

REVOKE EXECUTE ON FUNCTION get_adventure_baterias_with_availability(uuid) FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION get_adventure_baterias_with_availability(uuid)
  TO anon, authenticated;


CREATE OR REPLACE FUNCTION delete_adventure_bateria(p_bateria_id uuid)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE v_count integer;
BEGIN
  IF NOT is_admin() THEN
    RAISE EXCEPTION USING MESSAGE = 'NOT_AUTHORIZED';
  END IF;

  SELECT COUNT(*) INTO v_count
  FROM registrations r,
       LATERAL (
         SELECT (r.bateria_assignments->>'principal')::uuid AS bid
         WHERE r.bateria_assignments ? 'principal'
         UNION ALL
         SELECT (jsonb_array_elements_text(r.bateria_assignments->'participants'))::uuid
         WHERE r.bateria_assignments ? 'participants'
       ) s(bid)
  WHERE s.bid = p_bateria_id
    AND is_registration_capacity_active(r.payment_status);

  IF v_count > 0 THEN
    RAISE EXCEPTION USING MESSAGE = 'BATERIA_HAS_REGISTRATIONS';
  END IF;

  DELETE FROM adventure_baterias WHERE id = p_bateria_id;
END;
$$;

REVOKE EXECUTE ON FUNCTION delete_adventure_bateria(uuid) FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION delete_adventure_bateria(uuid) TO authenticated;


CREATE OR REPLACE FUNCTION save_adventure_baterias(
  p_adventure_id uuid,
  p_has_baterias boolean,
  p_baterias jsonb
)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_current_has_baterias boolean;
  v_active_count integer;
  v_active_with_assignments integer;
  v_kept_ids uuid[];
  v_bateria jsonb;
  v_bateria_id uuid;
  v_slot_count integer;
BEGIN
  IF NOT is_admin() THEN
    RAISE EXCEPTION USING MESSAGE = 'NOT_AUTHORIZED';
  END IF;

  IF p_baterias IS NULL OR jsonb_typeof(p_baterias) <> 'array' THEN
    RAISE EXCEPTION USING MESSAGE = 'INVALID_BATERIA_PAYLOAD';
  END IF;

  SELECT has_baterias INTO v_current_has_baterias
  FROM adventures WHERE id = p_adventure_id FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION USING MESSAGE = 'ADVENTURE_NOT_FOUND';
  END IF;

  -- Transição da flag: enforçar invariantes
  IF v_current_has_baterias = false AND p_has_baterias = true THEN
    SELECT COUNT(*) INTO v_active_count
    FROM registrations r
    WHERE r.adventure_id = p_adventure_id
      AND is_registration_capacity_active(r.payment_status);

    IF v_active_count > 0 THEN
      RAISE EXCEPTION USING MESSAGE = 'CANNOT_ENABLE_BATERIAS_WITH_REGISTRATIONS';
    END IF;
  END IF;

  IF v_current_has_baterias = true AND p_has_baterias = false THEN
    SELECT COUNT(*) INTO v_active_with_assignments
    FROM registrations r
    WHERE r.adventure_id = p_adventure_id
      AND r.bateria_assignments IS NOT NULL
      AND is_registration_capacity_active(r.payment_status);

    IF v_active_with_assignments > 0 THEN
      RAISE EXCEPTION USING MESSAGE = 'CANNOT_DISABLE_BATERIAS_WITH_REGISTRATIONS';
    END IF;
  END IF;

  UPDATE adventures SET has_baterias = p_has_baterias WHERE id = p_adventure_id;

  -- Upsert linhas em p_baterias
  v_kept_ids := ARRAY[]::uuid[];

  FOR v_bateria IN SELECT * FROM jsonb_array_elements(p_baterias)
  LOOP
    IF v_bateria ? 'id' AND v_bateria->>'id' <> '' THEN
      v_bateria_id := (v_bateria->>'id')::uuid;
      UPDATE adventure_baterias SET
        label      = v_bateria->>'label',
        start_time = (v_bateria->>'start_time')::time,
        end_time   = (v_bateria->>'end_time')::time,
        capacity   = (v_bateria->>'capacity')::integer,
        sort_order = COALESCE((v_bateria->>'sort_order')::integer, 0)
      WHERE id = v_bateria_id AND adventure_id = p_adventure_id;

      IF NOT FOUND THEN
        RAISE EXCEPTION USING MESSAGE = 'BATERIA_NOT_FOUND';
      END IF;
    ELSE
      INSERT INTO adventure_baterias (adventure_id, label, start_time, end_time, capacity, sort_order)
      VALUES (
        p_adventure_id,
        v_bateria->>'label',
        (v_bateria->>'start_time')::time,
        (v_bateria->>'end_time')::time,
        (v_bateria->>'capacity')::integer,
        COALESCE((v_bateria->>'sort_order')::integer, 0)
      )
      RETURNING id INTO v_bateria_id;
    END IF;

    v_kept_ids := array_append(v_kept_ids, v_bateria_id);
  END LOOP;

  -- Deletar baterias da aventura que não estão em v_kept_ids
  FOR v_bateria_id IN
    SELECT id FROM adventure_baterias
    WHERE adventure_id = p_adventure_id
      AND NOT (id = ANY(v_kept_ids))
  LOOP
    SELECT COUNT(*) INTO v_slot_count
    FROM registrations r,
         LATERAL (
           SELECT (r.bateria_assignments->>'principal')::uuid AS bid
           WHERE r.bateria_assignments ? 'principal'
           UNION ALL
           SELECT (jsonb_array_elements_text(r.bateria_assignments->'participants'))::uuid
           WHERE r.bateria_assignments ? 'participants'
         ) s(bid)
    WHERE s.bid = v_bateria_id
      AND is_registration_capacity_active(r.payment_status);

    IF v_slot_count > 0 THEN
      RAISE EXCEPTION USING MESSAGE = 'BATERIA_HAS_REGISTRATIONS';
    END IF;

    DELETE FROM adventure_baterias WHERE id = v_bateria_id;
  END LOOP;
END;
$$;

REVOKE EXECUTE ON FUNCTION save_adventure_baterias(uuid, boolean, jsonb) FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION save_adventure_baterias(uuid, boolean, jsonb) TO authenticated;


-- Drop the previous 7-arg signature so CREATE OR REPLACE below installs cleanly
-- without producing an overload conflict (PostgREST would not be able to choose).
DROP FUNCTION IF EXISTS create_registration_with_capacity(uuid, text, text, text, integer, jsonb, jsonb);

CREATE OR REPLACE FUNCTION create_registration_with_capacity(
  p_adventure_id uuid,
  p_name text,
  p_email text,
  p_phone text,
  p_group_size integer,
  p_participants jsonb,
  p_custom_data jsonb,
  p_bateria_assignments jsonb DEFAULT NULL
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
  v_registrations_enabled boolean;
  v_has_baterias boolean;
  v_reserved integer;
  v_registration registrations%ROWTYPE;
  v_participants_count integer;
  v_principal_id uuid;
  v_invalid_count integer;
  v_bateria_id uuid;
  v_new_slots integer;
  v_current_reserved integer;
  v_bateria_capacity integer;
  v_bateria_label text;
  v_effective_assignments jsonb;
BEGIN
  IF p_group_size IS NULL OR p_group_size <= 0 THEN
    RAISE EXCEPTION USING MESSAGE = 'INVALID_GROUP_SIZE';
  END IF;

  SELECT title, price, max_participants, registrations_enabled, has_baterias
  INTO v_adventure_title, v_adventure_price, v_max_participants, v_registrations_enabled, v_has_baterias
  FROM adventures
  WHERE id = p_adventure_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION USING MESSAGE = 'ADVENTURE_NOT_FOUND';
  END IF;

  IF NOT v_registrations_enabled THEN
    RAISE EXCEPTION USING MESSAGE = 'REGISTRATIONS_DISABLED';
  END IF;

  IF v_has_baterias THEN
    IF p_bateria_assignments IS NULL
       OR jsonb_typeof(p_bateria_assignments) <> 'object'
       OR NOT (p_bateria_assignments ? 'principal')
       OR NOT (p_bateria_assignments ? 'participants')
       OR jsonb_typeof(p_bateria_assignments->'participants') <> 'array' THEN
      RAISE EXCEPTION USING MESSAGE = 'BATERIA_ASSIGNMENTS_MISMATCH';
    END IF;

    v_participants_count := jsonb_array_length(p_bateria_assignments->'participants');
    IF v_participants_count <> p_group_size - 1 THEN
      RAISE EXCEPTION USING MESSAGE = 'BATERIA_ASSIGNMENTS_MISMATCH';
    END IF;

    v_principal_id := (p_bateria_assignments->>'principal')::uuid;

    SELECT COUNT(*) INTO v_invalid_count
    FROM (
      SELECT v_principal_id AS bid
      UNION ALL
      SELECT (jsonb_array_elements_text(p_bateria_assignments->'participants'))::uuid
    ) needed
    WHERE NOT EXISTS (
      SELECT 1 FROM adventure_baterias b
      WHERE b.id = needed.bid AND b.adventure_id = p_adventure_id
    );

    IF v_invalid_count > 0 THEN
      RAISE EXCEPTION USING MESSAGE = 'BATERIA_NOT_FOUND';
    END IF;

    -- Para cada bateria mencionada, validar capacidade
    FOR v_bateria_id, v_new_slots IN
      SELECT bid, COUNT(*)::integer AS new_slots
      FROM (
        SELECT v_principal_id AS bid
        UNION ALL
        SELECT (jsonb_array_elements_text(p_bateria_assignments->'participants'))::uuid
      ) needed
      GROUP BY bid
    LOOP
      SELECT capacity, label INTO v_bateria_capacity, v_bateria_label
      FROM adventure_baterias WHERE id = v_bateria_id;

      SELECT COUNT(*)::integer INTO v_current_reserved
      FROM registrations r,
           LATERAL (
             SELECT (r.bateria_assignments->>'principal')::uuid AS bid
             WHERE r.bateria_assignments ? 'principal'
             UNION ALL
             SELECT (jsonb_array_elements_text(r.bateria_assignments->'participants'))::uuid
             WHERE r.bateria_assignments ? 'participants'
           ) s(bid)
      WHERE s.bid = v_bateria_id
        AND r.adventure_id = p_adventure_id
        AND r.bateria_assignments IS NOT NULL
        AND is_registration_capacity_active(r.payment_status);

      IF v_current_reserved + v_new_slots > v_bateria_capacity THEN
        RAISE EXCEPTION USING MESSAGE = 'BATERIA_CAPACITY_EXCEEDED:' || v_bateria_label;
      END IF;
    END LOOP;

    v_effective_assignments := p_bateria_assignments;
  ELSE
    SELECT COALESCE(SUM(group_size), 0)::integer
    INTO v_reserved
    FROM registrations
    WHERE adventure_id = p_adventure_id
      AND is_registration_capacity_active(payment_status);

    IF v_max_participants IS NOT NULL AND v_reserved + p_group_size > v_max_participants THEN
      RAISE EXCEPTION USING MESSAGE = 'CAPACITY_EXCEEDED';
    END IF;

    v_effective_assignments := NULL;
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
    bateria_assignments,
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
    v_effective_assignments,
    'pending',
    v_adventure_price * p_group_size
  )
  RETURNING *
  INTO v_registration;

  RETURN v_registration;
END;
$$;

REVOKE EXECUTE ON FUNCTION create_registration_with_capacity(uuid, text, text, text, integer, jsonb, jsonb, jsonb) FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION create_registration_with_capacity(uuid, text, text, text, integer, jsonb, jsonb, jsonb) TO anon, authenticated;
