-- ============================================================
-- LevBeauty — Comanda Refactor (011)
-- Transforma appointments de 1 serviço para N serviços (comanda)
-- Banco está vazio — pode dropar colunas livremente
-- ============================================================

-- 1. Remover colunas de serviço único de appointments
ALTER TABLE public.appointments
  DROP COLUMN IF EXISTS service_id,
  DROP COLUMN IF EXISTS service_name,
  DROP COLUMN IF EXISTS price,
  DROP COLUMN IF EXISTS duration_min;

-- 2. Adicionar total_price (calculado via trigger)
ALTER TABLE public.appointments
  ADD COLUMN IF NOT EXISTS total_price numeric(8,2) NOT NULL DEFAULT 0;

-- 3. Expandir payment_method constraint (já inclui dinheiro/outro da 006)
ALTER TABLE public.appointments
  DROP CONSTRAINT IF EXISTS appointments_payment_method_check;

ALTER TABLE public.appointments
  ADD CONSTRAINT appointments_payment_method_check
  CHECK (payment_method IN ('pix', 'credito', 'local', 'dinheiro', 'outro'));

-- 4. Tabela appointment_items
CREATE TABLE IF NOT EXISTS public.appointment_items (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  appointment_id  uuid NOT NULL REFERENCES public.appointments(id) ON DELETE CASCADE,
  service_id      uuid NOT NULL REFERENCES public.services(id) ON DELETE RESTRICT,
  service_name    text NOT NULL,
  price           numeric(8,2) NOT NULL,
  duration_min    int NOT NULL DEFAULT 60,
  position        int NOT NULL DEFAULT 1,
  created_at      timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_appt_items_appt_pos
  ON public.appointment_items(appointment_id, position);

-- 5. RLS em appointment_items
ALTER TABLE public.appointment_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owner can manage appointment items"
  ON public.appointment_items FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.appointments a
      JOIN public.salons s ON s.id = a.salon_id
      WHERE a.id = appointment_items.appointment_id
        AND s.owner_id = auth.uid()
    )
  );

CREATE POLICY "Client can read own appointment items"
  ON public.appointment_items FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.appointments a
      WHERE a.id = appointment_items.appointment_id
        AND a.profile_id = auth.uid()
    )
  );

-- 6. Função que recalcula total_price quando itens mudam
CREATE OR REPLACE FUNCTION public.recalc_appointment_total()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_appt_id uuid;
BEGIN
  IF TG_OP = 'DELETE' THEN
    v_appt_id := OLD.appointment_id;
  ELSE
    v_appt_id := NEW.appointment_id;
  END IF;

  UPDATE public.appointments
  SET total_price = COALESCE(
    (SELECT SUM(price) FROM public.appointment_items WHERE appointment_id = v_appt_id),
    0
  ) + COALESCE(travel_fee, 0)
  WHERE id = v_appt_id;

  IF TG_OP = 'DELETE' THEN RETURN OLD; ELSE RETURN NEW; END IF;
END;
$$;

DROP TRIGGER IF EXISTS trg_recalc_appointment_total ON public.appointment_items;

CREATE TRIGGER trg_recalc_appointment_total
  AFTER INSERT OR UPDATE OR DELETE ON public.appointment_items
  FOR EACH ROW EXECUTE FUNCTION public.recalc_appointment_total();

-- 7. Também atualiza total_price quando travel_fee muda no appointment
CREATE OR REPLACE FUNCTION public.recalc_total_on_travel_fee()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  IF NEW.travel_fee IS DISTINCT FROM OLD.travel_fee THEN
    NEW.total_price := COALESCE(
      (SELECT SUM(price) FROM public.appointment_items WHERE appointment_id = NEW.id),
      0
    ) + COALESCE(NEW.travel_fee, 0);
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_recalc_total_on_travel_fee ON public.appointments;

CREATE TRIGGER trg_recalc_total_on_travel_fee
  BEFORE UPDATE OF travel_fee ON public.appointments
  FOR EACH ROW EXECUTE FUNCTION public.recalc_total_on_travel_fee();
