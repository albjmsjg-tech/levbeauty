-- ============================================================
-- LevBeauty — Salon Hours, Blocked Dates & Slot Interval (012)
-- ============================================================

-- 1. Intervalo entre atendimentos
ALTER TABLE public.salons
  ADD COLUMN IF NOT EXISTS slot_interval_min int NOT NULL DEFAULT 15;

-- 2. Horários de atendimento por dia da semana
CREATE TABLE IF NOT EXISTS public.salon_hours (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  salon_id     uuid NOT NULL REFERENCES public.salons(id) ON DELETE CASCADE,
  day_of_week  int NOT NULL CHECK (day_of_week BETWEEN 0 AND 6),
  is_open      boolean NOT NULL DEFAULT true,
  opens_at     time,
  closes_at    time,
  UNIQUE (salon_id, day_of_week)
);

ALTER TABLE public.salon_hours ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owner can manage salon hours"
  ON public.salon_hours FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.salons
      WHERE id = salon_hours.salon_id AND owner_id = auth.uid()
    )
  );

CREATE POLICY "Public can read salon hours"
  ON public.salon_hours FOR SELECT
  USING (true);

GRANT SELECT ON public.salon_hours TO anon, authenticated;

-- 3. Folgas e datas bloqueadas
CREATE TABLE IF NOT EXISTS public.salon_blocked_dates (
  id        uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  salon_id  uuid NOT NULL REFERENCES public.salons(id) ON DELETE CASCADE,
  date      date NOT NULL,
  reason    text,
  UNIQUE (salon_id, date)
);

ALTER TABLE public.salon_blocked_dates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owner can manage blocked dates"
  ON public.salon_blocked_dates FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.salons
      WHERE id = salon_blocked_dates.salon_id AND owner_id = auth.uid()
    )
  );

CREATE POLICY "Public can read blocked dates"
  ON public.salon_blocked_dates FOR SELECT
  USING (true);

GRANT SELECT ON public.salon_blocked_dates TO anon, authenticated;

-- 4. Seed de horários padrão ao criar salão
--    Seg-Sex 09:00-18:00, Sáb 09:00-14:00, Dom fechado
CREATE OR REPLACE FUNCTION public.seed_salon_hours()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  INSERT INTO public.salon_hours (salon_id, day_of_week, is_open, opens_at, closes_at)
  VALUES
    (NEW.id, 0, false, NULL,    NULL   ),
    (NEW.id, 1, true,  '09:00', '18:00'),
    (NEW.id, 2, true,  '09:00', '18:00'),
    (NEW.id, 3, true,  '09:00', '18:00'),
    (NEW.id, 4, true,  '09:00', '18:00'),
    (NEW.id, 5, true,  '09:00', '18:00'),
    (NEW.id, 6, true,  '09:00', '14:00');
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_seed_salon_hours ON public.salons;

CREATE TRIGGER trg_seed_salon_hours
  AFTER INSERT ON public.salons
  FOR EACH ROW EXECUTE FUNCTION public.seed_salon_hours();

-- 5. Corrige get_booked_slots — duration_min foi movido para appointment_items na 011
CREATE OR REPLACE FUNCTION public.get_booked_slots(p_salon_id uuid, p_date date)
RETURNS TABLE (appt_time text, duration_min integer)
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT
    a.appt_time,
    COALESCE(SUM(ai.duration_min), 0)::integer AS duration_min
  FROM public.appointments a
  LEFT JOIN public.appointment_items ai ON ai.appointment_id = a.id
  WHERE a.salon_id = p_salon_id
    AND a.appt_date = p_date
    AND a.status != 'cancelado'
  GROUP BY a.id, a.appt_time;
$$;
