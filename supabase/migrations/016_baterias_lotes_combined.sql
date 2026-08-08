-- Modo combinado: baterias com lotes independentes por horário (Climb Adventure)

-- 1. Permitir has_lotes e has_baterias simultaneamente
ALTER TABLE adventures
  DROP CONSTRAINT IF EXISTS adventure_mode_exclusive;

-- 2. Lotes podem pertencer a uma bateria (modo combinado) ou só à aventura (modo só-lotes)
ALTER TABLE adventure_lotes
  ADD COLUMN bateria_id uuid REFERENCES adventure_baterias(id) ON DELETE CASCADE;

CREATE INDEX adventure_lotes_bateria_idx
  ON adventure_lotes(bateria_id, sort_order)
  WHERE bateria_id IS NOT NULL;


-- 3. Disponibilidade de lotes (inclui bateria_id)
CREATE OR REPLACE FUNCTION get_adventure_lotes_with_availability(
  p_adventure_id uuid
)
RETURNS TABLE (
  id uuid,
  bateria_id uuid,
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
    l.bateria_id,
    l.label,
    l.sort_order,
    l.capacity,
    l.price,
    COALESCE(lc.reserved, 0) AS reserved
  FROM adventure_lotes l
  LEFT JOIN lote_counts lc ON lc.lote_id = l.id
  WHERE l.adventure_id = p_adventure_id
  ORDER BY l.bateria_id NULLS FIRST, l.sort_order, l.created_at;
$$;


-- 4. Lote ativo (opcionalmente filtrado por bateria)
DROP FUNCTION IF EXISTS get_active_lote(uuid);

CREATE OR REPLACE FUNCTION get_active_lote(
  p_adventure_id uuid,
  p_bateria_id uuid DEFAULT NULL
)
RETURNS TABLE (
  id uuid,
  bateria_id uuid,
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
    l.bateria_id,
    l.label,
    l.sort_order,
    l.capacity,
    l.price,
    COALESCE(lc.reserved, 0) AS reserved,
    (l.capacity - COALESCE(lc.reserved, 0)) AS remaining
  FROM adventure_lotes l
  LEFT JOIN lote_counts lc ON lc.lote_id = l.id
  WHERE l.adventure_id = p_adventure_id
    AND (
      (p_bateria_id IS NULL AND l.bateria_id IS NULL)
      OR l.bateria_id = p_bateria_id
    )
    AND COALESCE(lc.reserved, 0) < l.capacity
  ORDER BY l.sort_order, l.created_at
  LIMIT 1;
$$;

REVOKE EXECUTE ON FUNCTION get_active_lote(uuid, uuid) FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION get_active_lote(uuid, uuid) TO anon, authenticated;


-- 5. Baterias com lote ativo (modo combinado — UI pública)
CREATE OR REPLACE FUNCTION get_baterias_with_lote_availability(
  p_adventure_id uuid
)
RETURNS TABLE (
  id uuid,
  label text,
  start_time time,
  end_time time,
  sort_order integer,
  active_lote_id uuid,
  active_lote_label text,
  active_lote_price numeric,
  active_lote_remaining integer
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
  ),
  active_lotes AS (
    SELECT DISTINCT ON (l.bateria_id)
      l.bateria_id,
      l.id AS active_lote_id,
      l.label AS active_lote_label,
      l.price AS active_lote_price,
      (l.capacity - COALESCE(lc.reserved, 0)) AS active_lote_remaining
    FROM adventure_lotes l
    LEFT JOIN lote_counts lc ON lc.lote_id = l.id
    WHERE l.adventure_id = p_adventure_id
      AND l.bateria_id IS NOT NULL
      AND COALESCE(lc.reserved, 0) < l.capacity
    ORDER BY l.bateria_id, l.sort_order, l.created_at
  )
  SELECT
    b.id,
    b.label,
    b.start_time,
    b.end_time,
    b.sort_order,
    al.active_lote_id,
    al.active_lote_label,
    al.active_lote_price,
    COALESCE(al.active_lote_remaining, 0) AS active_lote_remaining
  FROM adventure_baterias b
  LEFT JOIN active_lotes al ON al.bateria_id = b.id
  WHERE b.adventure_id = p_adventure_id
  ORDER BY b.sort_order, b.start_time;
$$;

REVOKE EXECUTE ON FUNCTION get_baterias_with_lote_availability(uuid) FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION get_baterias_with_lote_availability(uuid) TO anon, authenticated;


-- 6. Salvar lotes (suporta bateria_id no modo combinado)
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
  v_bateria_id uuid;
  v_combined_mode boolean;
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

  v_combined_mode := p_has_lotes AND v_has_baterias;

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
    v_bateria_id := NULLIF(v_lote->>'bateria_id', '')::uuid;

    IF v_combined_mode THEN
      IF v_bateria_id IS NULL THEN
        RAISE EXCEPTION USING MESSAGE = 'LOTE_BATERIA_REQUIRED';
      END IF;

      IF NOT EXISTS (
        SELECT 1 FROM adventure_baterias b
        WHERE b.id = v_bateria_id AND b.adventure_id = p_adventure_id
      ) THEN
        RAISE EXCEPTION USING MESSAGE = 'BATERIA_NOT_FOUND';
      END IF;
    ELSIF v_bateria_id IS NOT NULL THEN
      RAISE EXCEPTION USING MESSAGE = 'LOTE_BATERIA_NOT_ALLOWED';
    END IF;

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
        pix_copia_cola = COALESCE(v_lote->>'pix_copia_cola', pix_copia_cola),
        bateria_id = CASE WHEN v_combined_mode THEN v_bateria_id ELSE NULL END
      WHERE id = v_lote_id AND adventure_id = p_adventure_id;

      IF NOT FOUND THEN
        RAISE EXCEPTION USING MESSAGE = 'LOTE_NOT_FOUND';
      END IF;

      v_kept_ids := array_append(v_kept_ids, v_lote_id);
    ELSE
      INSERT INTO adventure_lotes (
        adventure_id, bateria_id, label, sort_order, capacity, price, pix_copia_cola
      )
      VALUES (
        p_adventure_id,
        CASE WHEN v_combined_mode THEN v_bateria_id ELSE NULL END,
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

  -- No modo combinado, capacidade da bateria = soma das vagas dos lotes
  IF v_combined_mode THEN
    UPDATE adventure_baterias b
    SET capacity = COALESCE((
      SELECT SUM(l.capacity)::integer
      FROM adventure_lotes l
      WHERE l.bateria_id = b.id
    ), 0)
    WHERE b.adventure_id = p_adventure_id;
  END IF;
END;
$$;


-- 7. Inscrição com capacidade (branch modo combinado)
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

  -- Modo combinado: baterias + lotes
  IF v_has_lotes AND v_has_baterias THEN
    IF p_group_size <> 1 THEN
      RAISE EXCEPTION USING MESSAGE = 'INVALID_GROUP_SIZE';
    END IF;

    IF p_bateria_assignments IS NULL
       OR jsonb_typeof(p_bateria_assignments) <> 'object'
       OR NOT (p_bateria_assignments ? 'principal')
       OR NOT (p_bateria_assignments ? 'participants')
       OR jsonb_typeof(p_bateria_assignments->'participants') <> 'array' THEN
      RAISE EXCEPTION USING MESSAGE = 'BATERIA_ASSIGNMENTS_MISMATCH';
    END IF;

    IF jsonb_array_length(p_bateria_assignments->'participants') <> 0 THEN
      RAISE EXCEPTION USING MESSAGE = 'BATERIA_ASSIGNMENTS_MISMATCH';
    END IF;

    v_principal_id := (p_bateria_assignments->>'principal')::uuid;

    IF NOT EXISTS (
      SELECT 1 FROM adventure_baterias b
      WHERE b.id = v_principal_id AND b.adventure_id = p_adventure_id
    ) THEN
      RAISE EXCEPTION USING MESSAGE = 'BATERIA_NOT_FOUND';
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
      AND l.bateria_id = v_principal_id
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
      p_bateria_assignments,
      v_active_lote_id,
      'pending',
      v_lote_price
    )
    RETURNING *
    INTO v_registration;

    RETURN v_registration;
  END IF;

  -- Modo só-lotes
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
      AND l.bateria_id IS NULL
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
