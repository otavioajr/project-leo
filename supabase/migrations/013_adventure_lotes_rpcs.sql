CREATE OR REPLACE FUNCTION get_adventure_lotes_with_availability(
  p_adventure_id uuid
)
RETURNS TABLE (
  id uuid,
  label text,
  sort_order integer,
  capacity integer,
  price numeric,
  reserved integer
)
LANGUAGE sql SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  WITH lote_counts AS (
    SELECT r.lote_id, COUNT(*)::integer AS reserved
    FROM registrations r
    WHERE r.adventure_id = p_adventure_id
      AND r.lote_id IS NOT NULL
      AND is_registration_capacity_active(r.payment_status)
    GROUP BY r.lote_id
  )
  SELECT
    l.id,
    l.label,
    l.sort_order,
    l.capacity,
    l.price,
    COALESCE(lc.reserved, 0) AS reserved
  FROM adventure_lotes l
  LEFT JOIN lote_counts lc ON lc.lote_id = l.id
  WHERE l.adventure_id = p_adventure_id
  ORDER BY l.sort_order, l.created_at;
$$;

REVOKE EXECUTE ON FUNCTION get_adventure_lotes_with_availability(uuid) FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION get_adventure_lotes_with_availability(uuid) TO anon, authenticated;


CREATE OR REPLACE FUNCTION get_active_lote(p_adventure_id uuid)
RETURNS TABLE (
  id uuid,
  label text,
  sort_order integer,
  capacity integer,
  price numeric,
  reserved integer,
  remaining integer
)
LANGUAGE sql SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  WITH lote_counts AS (
    SELECT r.lote_id, COUNT(*)::integer AS reserved
    FROM registrations r
    WHERE r.adventure_id = p_adventure_id
      AND r.lote_id IS NOT NULL
      AND is_registration_capacity_active(r.payment_status)
    GROUP BY r.lote_id
  )
  SELECT
    l.id,
    l.label,
    l.sort_order,
    l.capacity,
    l.price,
    COALESCE(lc.reserved, 0) AS reserved,
    (l.capacity - COALESCE(lc.reserved, 0)) AS remaining
  FROM adventure_lotes l
  LEFT JOIN lote_counts lc ON lc.lote_id = l.id
  WHERE l.adventure_id = p_adventure_id
    AND COALESCE(lc.reserved, 0) < l.capacity
  ORDER BY l.sort_order, l.created_at
  LIMIT 1;
$$;

REVOKE EXECUTE ON FUNCTION get_active_lote(uuid) FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION get_active_lote(uuid) TO anon, authenticated;


CREATE OR REPLACE FUNCTION save_adventure_lotes(
  p_adventure_id uuid,
  p_has_lotes boolean,
  p_lotes jsonb
)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_current_has_lotes boolean;
  v_has_baterias boolean;
  v_active_count integer;
  v_active_with_lote integer;
  v_kept_ids uuid[];
  v_lote jsonb;
  v_lote_id uuid;
  v_reserved integer;
  v_new_capacity integer;
BEGIN
  IF NOT is_admin() THEN
    RAISE EXCEPTION USING MESSAGE = 'NOT_AUTHORIZED';
  END IF;

  IF p_lotes IS NULL OR jsonb_typeof(p_lotes) <> 'array' THEN
    RAISE EXCEPTION USING MESSAGE = 'INVALID_LOTE_PAYLOAD';
  END IF;

  SELECT has_lotes, has_baterias
  INTO v_current_has_lotes, v_has_baterias
  FROM adventures
  WHERE id = p_adventure_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION USING MESSAGE = 'ADVENTURE_NOT_FOUND';
  END IF;

  IF p_has_lotes AND v_has_baterias THEN
    RAISE EXCEPTION USING MESSAGE = 'CANNOT_ENABLE_LOTES_WITH_BATERIAS';
  END IF;

  IF v_current_has_lotes = false AND p_has_lotes = true THEN
    SELECT COUNT(*) INTO v_active_count
    FROM registrations r
    WHERE r.adventure_id = p_adventure_id
      AND is_registration_capacity_active(r.payment_status);

    IF v_active_count > 0 THEN
      RAISE EXCEPTION USING MESSAGE = 'CANNOT_ENABLE_LOTES_WITH_REGISTRATIONS';
    END IF;
  END IF;

  IF v_current_has_lotes = true AND p_has_lotes = false THEN
    SELECT COUNT(*) INTO v_active_with_lote
    FROM registrations r
    WHERE r.adventure_id = p_adventure_id
      AND r.lote_id IS NOT NULL
      AND is_registration_capacity_active(r.payment_status);

    IF v_active_with_lote > 0 THEN
      RAISE EXCEPTION USING MESSAGE = 'CANNOT_DISABLE_LOTES_WITH_REGISTRATIONS';
    END IF;
  END IF;

  UPDATE adventures SET has_lotes = p_has_lotes WHERE id = p_adventure_id;

  v_kept_ids := ARRAY[]::uuid[];

  FOR v_lote IN SELECT * FROM jsonb_array_elements(p_lotes)
  LOOP
    v_lote_id := NULLIF(v_lote->>'id', '')::uuid;
    v_new_capacity := (v_lote->>'capacity')::integer;

    IF v_lote_id IS NOT NULL THEN
      SELECT COUNT(*)::integer INTO v_reserved
      FROM registrations r
      WHERE r.lote_id = v_lote_id
        AND is_registration_capacity_active(r.payment_status);

      IF v_new_capacity < v_reserved THEN
        RAISE EXCEPTION USING MESSAGE = 'LOTE_CAPACITY_BELOW_RESERVED';
      END IF;

      UPDATE adventure_lotes
      SET
        label = COALESCE(v_lote->>'label', label),
        sort_order = COALESCE((v_lote->>'sort_order')::integer, sort_order),
        capacity = v_new_capacity,
        price = COALESCE((v_lote->>'price')::numeric, price),
        pix_copia_cola = COALESCE(v_lote->>'pix_copia_cola', pix_copia_cola)
      WHERE id = v_lote_id AND adventure_id = p_adventure_id;

      IF NOT FOUND THEN
        RAISE EXCEPTION USING MESSAGE = 'LOTE_NOT_FOUND';
      END IF;

      v_kept_ids := array_append(v_kept_ids, v_lote_id);
    ELSE
      INSERT INTO adventure_lotes (
        adventure_id, label, sort_order, capacity, price, pix_copia_cola
      )
      VALUES (
        p_adventure_id,
        COALESCE(v_lote->>'label', 'Lote'),
        COALESCE((v_lote->>'sort_order')::integer, 0),
        v_new_capacity,
        COALESCE((v_lote->>'price')::numeric, 0),
        COALESCE(v_lote->>'pix_copia_cola', '')
      )
      RETURNING id INTO v_lote_id;

      v_kept_ids := array_append(v_kept_ids, v_lote_id);
    END IF;
  END LOOP;

  FOR v_lote_id IN
    SELECT l.id
    FROM adventure_lotes l
    WHERE l.adventure_id = p_adventure_id
      AND NOT (l.id = ANY (v_kept_ids))
  LOOP
    SELECT COUNT(*)::integer INTO v_reserved
    FROM registrations r
    WHERE r.lote_id = v_lote_id
      AND is_registration_capacity_active(r.payment_status);

    IF v_reserved > 0 THEN
      RAISE EXCEPTION USING MESSAGE = 'LOTE_HAS_REGISTRATIONS';
    END IF;

    DELETE FROM adventure_lotes WHERE id = v_lote_id;
  END LOOP;
END;
$$;

REVOKE EXECUTE ON FUNCTION save_adventure_lotes(uuid, boolean, jsonb) FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION save_adventure_lotes(uuid, boolean, jsonb) TO authenticated;


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
  v_has_lotes boolean;
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
  v_active_lote_id uuid;
  v_lote_price numeric;
  v_lote_reserved integer;
  v_lote_capacity integer;
BEGIN
  IF p_group_size IS NULL OR p_group_size <= 0 THEN
    RAISE EXCEPTION USING MESSAGE = 'INVALID_GROUP_SIZE';
  END IF;

  SELECT title, price, max_participants, registrations_enabled, has_baterias, has_lotes
  INTO v_adventure_title, v_adventure_price, v_max_participants, v_registrations_enabled, v_has_baterias, v_has_lotes
  FROM adventures
  WHERE id = p_adventure_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION USING MESSAGE = 'ADVENTURE_NOT_FOUND';
  END IF;

  IF NOT v_registrations_enabled THEN
    RAISE EXCEPTION USING MESSAGE = 'REGISTRATIONS_DISABLED';
  END IF;

  IF v_has_lotes THEN
    IF p_group_size <> 1 THEN
      RAISE EXCEPTION USING MESSAGE = 'INVALID_GROUP_SIZE';
    END IF;

    IF p_bateria_assignments IS NOT NULL THEN
      RAISE EXCEPTION USING MESSAGE = 'BATERIA_ASSIGNMENTS_MISMATCH';
    END IF;

    WITH lote_counts AS (
      SELECT r.lote_id, COUNT(*)::integer AS reserved
      FROM registrations r
      WHERE r.adventure_id = p_adventure_id
        AND r.lote_id IS NOT NULL
        AND is_registration_capacity_active(r.payment_status)
      GROUP BY r.lote_id
    )
    SELECT
      l.id,
      l.price,
      l.capacity,
      COALESCE(lc.reserved, 0)
    INTO v_active_lote_id, v_lote_price, v_lote_capacity, v_lote_reserved
    FROM adventure_lotes l
    LEFT JOIN lote_counts lc ON lc.lote_id = l.id
    WHERE l.adventure_id = p_adventure_id
      AND COALESCE(lc.reserved, 0) < l.capacity
    ORDER BY l.sort_order, l.created_at
    LIMIT 1;

    IF v_active_lote_id IS NULL THEN
      RAISE EXCEPTION USING MESSAGE = 'NO_ACTIVE_LOTE';
    END IF;

    IF v_lote_reserved >= v_lote_capacity THEN
      RAISE EXCEPTION USING MESSAGE = 'LOTE_CAPACITY_EXCEEDED';
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
      lote_id,
      payment_status,
      total_amount
    )
    VALUES (
      p_adventure_id,
      v_adventure_title,
      p_name,
      p_email,
      p_phone,
      1,
      p_participants,
      p_custom_data,
      NULL,
      v_active_lote_id,
      'pending',
      v_lote_price
    )
    RETURNING *
    INTO v_registration;

    RETURN v_registration;
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
    lote_id,
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
    NULL,
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
