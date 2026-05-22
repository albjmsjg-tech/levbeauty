-- ================================================================
-- LevBeauty — Anamnese fields + LGPD consent tracking on clients
-- ================================================================

ALTER TABLE public.clients
  ADD COLUMN IF NOT EXISTS allergies                    text,
  ADD COLUMN IF NOT EXISTS has_diabetes                 boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS is_pregnant                  boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS uses_continuous_medication   boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS other_conditions             text,
  ADD COLUMN IF NOT EXISTS preferences                  text,
  ADD COLUMN IF NOT EXISTS technical_history            text,
  ADD COLUMN IF NOT EXISTS general_notes                text,
  ADD COLUMN IF NOT EXISTS birth_date                   date,
  ADD COLUMN IF NOT EXISTS cep                          text,
  ADD COLUMN IF NOT EXISTS lgpd_consent_at              timestamptz,
  ADD COLUMN IF NOT EXISTS lgpd_consent_version         integer;
