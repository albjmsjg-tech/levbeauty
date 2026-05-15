-- Simplify pricing: remove commission and profit-margin concepts.
-- LevBeauty is solo-professional SaaS — no commissioned employees.

-- Drop per-service legacy pricing columns
ALTER TABLE public.services
  DROP COLUMN IF EXISTS profit_margin,
  DROP COLUMN IF EXISTS tax_pct,
  DROP COLUMN IF EXISTS card_pct,
  DROP COLUMN IF EXISTS mkt_pct,
  DROP COLUMN IF EXISTS manicure_pct;

-- Drop profit_margin from global pricing config
ALTER TABLE public.pricing_config
  DROP COLUMN IF EXISTS profit_margin;
