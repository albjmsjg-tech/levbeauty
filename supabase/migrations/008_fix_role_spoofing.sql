-- Fix role spoofing: role is now read from raw_app_meta_data (server-only)
-- instead of raw_user_meta_data (user-editable via signUp options.data).
-- Regular signUp calls don't touch app_metadata, so they default to 'client'.
-- Owner accounts are created via the admin API which sets app_metadata server-side.
CREATE OR REPLACE FUNCTION public.handle_new_user()
  RETURNS trigger
  LANGUAGE plpgsql
  SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO public.profiles (id, role, full_name)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_app_meta_data->>'role', 'client'),
    COALESCE(NEW.raw_user_meta_data->>'full_name', '')
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;
