-- ============================================================
-- LevBeauty — Client Management
-- Adds public.clients table and restructures appointments
-- ============================================================

-- 1. Clear fake data (safe to delete before schema changes)
DELETE FROM public.appointments;

-- 2. Rename client_id → profile_id (preserves auth user linkage semantics)
ALTER TABLE public.appointments RENAME COLUMN client_id TO profile_id;

-- 3. Create clients table
CREATE TABLE public.clients (
  id            uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  salon_id      uuid        NOT NULL REFERENCES public.salons(id) ON DELETE CASCADE,
  phone         text        NOT NULL,
  name          text        NOT NULL,
  is_vip        boolean     NOT NULL DEFAULT false,
  is_blocked    boolean     NOT NULL DEFAULT false,
  notes         text,
  profile_id    uuid        REFERENCES public.profiles(id) ON DELETE SET NULL,
  last_visit_at timestamptz,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT clients_salon_phone_unique UNIQUE (salon_id, phone)
);

-- 4. Add client_id FK to appointments
--    (table is empty after step 1, so NOT NULL is safe without a default)
ALTER TABLE public.appointments
  ADD COLUMN client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE RESTRICT;

-- 5. Expand payment_method CHECK to include dinheiro and outro
ALTER TABLE public.appointments
  DROP CONSTRAINT IF EXISTS appointments_payment_method_check;

ALTER TABLE public.appointments
  ADD CONSTRAINT appointments_payment_method_check
  CHECK (payment_method IN ('pix', 'credito', 'local', 'dinheiro', 'outro'));

-- 6. Drop stale policies that referenced old client_id / guest-insert model
DROP POLICY IF EXISTS "Clients can read own appointments"   ON public.appointments;
DROP POLICY IF EXISTS "Clients can insert own appointments" ON public.appointments;
DROP POLICY IF EXISTS "Clients can cancel own appointments" ON public.appointments;
DROP POLICY IF EXISTS "Guests can book appointments"        ON public.appointments;

-- 7. New policies on appointments using profile_id
CREATE POLICY "Logged users can read own appointments"
  ON public.appointments FOR SELECT
  USING (auth.uid() = profile_id);

CREATE POLICY "Logged users can cancel own appointments"
  ON public.appointments FOR UPDATE
  USING (auth.uid() = profile_id AND status = 'cancelado');

-- 8. Enable RLS + owner policy on clients
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owner can manage own salon clients"
  ON public.clients FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.salons
      WHERE salons.id  = clients.salon_id
        AND salons.owner_id = auth.uid()
    )
  );

-- 9. updated_at auto-trigger for clients
--    (set_updated_at function already exists from migration 001)
CREATE TRIGGER set_clients_updated_at
  BEFORE UPDATE ON public.clients
  FOR EACH ROW EXECUTE PROCEDURE public.set_updated_at();
