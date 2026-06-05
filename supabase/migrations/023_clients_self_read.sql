-- 023: permite que a cliente final leia seu próprio registro em clients via profile_id
-- Executar manualmente no Supabase SQL Editor

CREATE POLICY "Profiles can read own client records"
  ON public.clients FOR SELECT
  USING (profile_id = auth.uid());
