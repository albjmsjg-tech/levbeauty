-- ============================================================
-- LevBeauty — Revert 015+016 to match Vercel deployment (017)
-- Restores requires_deposit on salons and old status constraint
-- to match code at commit 60bc67d (currently deployed on Vercel)
-- ============================================================

-- ── salons: restore requires_deposit ─────────────────────────
ALTER TABLE public.salons
  ADD COLUMN IF NOT EXISTS requires_deposit boolean NOT NULL DEFAULT false;

-- Backfill from deposit_pct so existing salons keep their setting
UPDATE public.salons
  SET requires_deposit = true
  WHERE deposit_pct > 0;

-- ── appointments.status: revert to old enum ───────────────────
-- Drop current default and constraint added by 015
ALTER TABLE public.appointments
  ALTER COLUMN status DROP DEFAULT;

ALTER TABLE public.appointments
  DROP CONSTRAINT IF EXISTS appointments_status_check;

-- Drop partial index that uses 'aguardando_sinal' (invalid in old enum)
DROP INDEX IF EXISTS idx_appt_reminder_window;

-- Normalize any rows with new-enum-only values to old equivalents
UPDATE public.appointments
  SET status = 'pendente'
  WHERE status = 'aguardando_sinal';

UPDATE public.appointments
  SET status = 'concluido'
  WHERE status = 'finalizado';

-- Restore old constraint and default
ALTER TABLE public.appointments
  ADD CONSTRAINT appointments_status_check
  CHECK (status IN ('pendente', 'confirmado', 'concluido', 'cancelado'));

ALTER TABLE public.appointments
  ALTER COLUMN status SET DEFAULT 'pendente';
