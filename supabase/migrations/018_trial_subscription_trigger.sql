-- 018: Auto-create trial subscription for new owner accounts
-- Updates handle_new_user to insert a subscriptions row with 14-day trial.

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  INSERT INTO public.profiles (id, role, full_name)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'role', 'client'),
    COALESCE(NEW.raw_user_meta_data->>'full_name', '')
  );

  IF COALESCE(NEW.raw_user_meta_data->>'role', 'client') = 'owner' THEN
    INSERT INTO public.subscriptions (owner_id, plan, status, current_period_end)
    VALUES (NEW.id, 'pro', 'trialing', NOW() + INTERVAL '14 days');
  END IF;

  RETURN NEW;
END;
$$;
