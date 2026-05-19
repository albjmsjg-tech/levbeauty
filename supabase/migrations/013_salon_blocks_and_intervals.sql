-- ============================================================
-- LevBeauty — Salon Blocks & dual interval config (013)
-- ============================================================

-- 1. Rename slot_interval_min → salon_slot_interval_min
ALTER TABLE public.salons
  RENAME COLUMN slot_interval_min TO salon_slot_interval_min;

-- 2. Add home_visit_interval_min (2h default)
ALTER TABLE public.salons
  ADD COLUMN IF NOT EXISTS home_visit_interval_min int NOT NULL DEFAULT 120;

-- 3. Drop old full-day-only blocked_dates table
DROP TABLE IF EXISTS public.salon_blocked_dates;

-- 4. Create salon_blocks: unified full-day OR partial blocking
CREATE TABLE IF NOT EXISTS public.salon_blocks (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  salon_id   uuid NOT NULL REFERENCES public.salons(id) ON DELETE CASCADE,
  block_date date NOT NULL,
  start_time time,
  end_time   time,
  reason     text,
  created_at timestamptz DEFAULT now(),
  CONSTRAINT chk_block_times CHECK (
    (start_time IS NULL AND end_time IS NULL)
    OR (start_time IS NOT NULL AND end_time IS NOT NULL AND end_time > start_time)
  )
);

ALTER TABLE public.salon_blocks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owner can manage salon blocks"
  ON public.salon_blocks FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.salons
      WHERE id = salon_blocks.salon_id AND owner_id = auth.uid()
    )
  );

CREATE POLICY "Public can read salon blocks"
  ON public.salon_blocks FOR SELECT
  USING (true);

GRANT SELECT ON public.salon_blocks TO anon, authenticated;
