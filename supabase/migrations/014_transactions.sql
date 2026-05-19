-- ============================================================
-- LevBeauty — Transactions (014)
-- Stripe deposit tracking + idempotency key em appointments
-- ============================================================

-- Idempotency: garante que o mesmo Stripe session não cria 2 appointments
ALTER TABLE public.appointments
  ADD COLUMN IF NOT EXISTS stripe_session_id text;

CREATE UNIQUE INDEX IF NOT EXISTS idx_appt_stripe_session
  ON public.appointments(stripe_session_id)
  WHERE stripe_session_id IS NOT NULL;

-- Transactions: audit trail de sinais e saques
CREATE TABLE IF NOT EXISTS public.transactions (
  id                        uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  salon_id                  uuid NOT NULL REFERENCES public.salons(id) ON DELETE CASCADE,
  appointment_id            uuid REFERENCES public.appointments(id) ON DELETE SET NULL,
  type                      text NOT NULL CHECK (type IN ('sinal_received', 'withdrawal')),
  amount                    numeric(8,2) NOT NULL,
  stripe_payment_intent_id  text,
  status                    text NOT NULL DEFAULT 'pendente'
                              CHECK (status IN ('pendente', 'pago', 'falhou', 'cancelado')),
  created_at                timestamptz DEFAULT now()
);

ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owner can read own transactions"
  ON public.transactions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.salons
      WHERE id = transactions.salon_id AND owner_id = auth.uid()
    )
  );

GRANT SELECT ON public.transactions TO authenticated;

-- Função: saldo_sinais(salon_id) — total de sinais pagos menos saques
CREATE OR REPLACE FUNCTION public.saldo_sinais(p_salon_id uuid)
RETURNS numeric LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT
    COALESCE(SUM(CASE WHEN type = 'sinal_received' AND status = 'pago' THEN amount ELSE 0 END), 0)
    - COALESCE(SUM(CASE WHEN type = 'withdrawal'   AND status = 'pago' THEN amount ELSE 0 END), 0)
  FROM public.transactions
  WHERE salon_id = p_salon_id;
$$;
