-- RPC function to clear must_change_password flag after first login password change
CREATE OR REPLACE FUNCTION clear_must_change_password()
RETURNS void AS $$
BEGIN
  UPDATE auth.users
  SET raw_app_meta_data = raw_app_meta_data - 'must_change_password'
  WHERE id = auth.uid();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
