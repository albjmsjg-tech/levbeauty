-- Global pricing parameters per salon.
-- Replaces per-service sliders (profit_margin/tax_pct/card_pct/mkt_pct on services).
-- Only manicure_pct remains per-service (it varies by service, not salon).
CREATE TABLE public.pricing_config (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  salon_id        uuid NOT NULL UNIQUE REFERENCES public.salons(id) ON DELETE CASCADE,
  profit_margin   numeric(5,2) NOT NULL DEFAULT 35,
  tax_pct         numeric(5,2) NOT NULL DEFAULT 7,
  card_pct        numeric(5,2) NOT NULL DEFAULT 3.30,
  fixed_cost_pct  numeric(5,2) NOT NULL DEFAULT 5,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.pricing_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owner can manage own pricing config"
  ON public.pricing_config FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.salons
      WHERE salons.id = pricing_config.salon_id
        AND salons.owner_id = auth.uid()
    )
  );

CREATE TRIGGER set_pricing_config_updated_at
  BEFORE UPDATE ON public.pricing_config
  FOR EACH ROW EXECUTE PROCEDURE public.set_updated_at();
