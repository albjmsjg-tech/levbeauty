-- ============================================================
-- 019: Coupons, Affiliates, Referrals
-- ============================================================

-- ── COUPONS ──────────────────────────────────────────────────
CREATE TABLE public.coupons (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  code        text        NOT NULL UNIQUE,
  type        text        NOT NULL CHECK (type IN ('ambassador', 'discount')),
  benefit     text        NOT NULL CHECK (benefit IN ('months_free', 'percent_off')),
  value       integer     NOT NULL,
  active      boolean     NOT NULL DEFAULT true,
  created_at  timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.coupons ENABLE ROW LEVEL SECURITY;

-- Qualquer usuário autenticado pode consultar cupons ativos (para validar no checkout)
CREATE POLICY "Authenticated users can read active coupons"
  ON public.coupons FOR SELECT
  TO authenticated
  USING (active = true);

-- ── AFFILIATES ────────────────────────────────────────────────
CREATE TABLE public.affiliates (
  id            uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id      uuid        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  slug          text        NOT NULL UNIQUE,
  type          text        NOT NULL CHECK (type IN ('affiliate', 'ambassador')),
  status        text        NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
  contract_end  timestamptz,
  created_at    timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.affiliates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Affiliates can read own record"
  ON public.affiliates FOR SELECT
  TO authenticated
  USING (auth.uid() = owner_id);

-- ── REFERRALS ─────────────────────────────────────────────────
CREATE TABLE public.referrals (
  id                  uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  affiliate_id        uuid        NOT NULL REFERENCES public.affiliates(id) ON DELETE CASCADE,
  referred_owner_id   uuid        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  converted_at        timestamptz,
  commission_status   text        NOT NULL DEFAULT 'pending' CHECK (commission_status IN ('pending', 'paid')),
  commission_amount   numeric     NOT NULL DEFAULT 25.00,
  created_at          timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.referrals ENABLE ROW LEVEL SECURITY;

-- Afiliado vê suas próprias indicações
CREATE POLICY "Affiliates can read own referrals"
  ON public.referrals FOR SELECT
  TO authenticated
  USING (
    affiliate_id IN (
      SELECT id FROM public.affiliates WHERE owner_id = auth.uid()
    )
  );

-- ── SEED: cupons iniciais ─────────────────────────────────────
INSERT INTO public.coupons (code, type, benefit, value) VALUES
  ('EMBLEV6', 'ambassador', 'months_free',  6),
  ('LVB50',   'discount',   'percent_off', 50),
  ('LVB100',  'discount',   'percent_off', 100);
