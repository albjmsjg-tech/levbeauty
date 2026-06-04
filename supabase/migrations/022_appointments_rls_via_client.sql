-- 022: expande RLS de appointments para leitura/cancelamento via clients.profile_id
-- Executar manualmente no Supabase SQL Editor

-- ── SELECT ──────────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "Logged users can read own appointments" ON public.appointments;

CREATE POLICY "Logged users can read own appointments"
  ON public.appointments FOR SELECT
  USING (
    auth.uid() = profile_id
    OR EXISTS (
      SELECT 1 FROM public.clients
      WHERE clients.id         = appointments.client_id
        AND clients.profile_id = auth.uid()
    )
  );

-- ── UPDATE (cancelamento) ────────────────────────────────────────────────────
DROP POLICY IF EXISTS "Logged users can cancel own appointments" ON public.appointments;

CREATE POLICY "Logged users can cancel own appointments"
  ON public.appointments FOR UPDATE
  USING (
    auth.uid() = profile_id
    OR EXISTS (
      SELECT 1 FROM public.clients
      WHERE clients.id         = appointments.client_id
        AND clients.profile_id = auth.uid()
    )
  )
  WITH CHECK (status = 'cancelado');
