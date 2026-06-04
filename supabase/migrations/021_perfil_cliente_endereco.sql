-- 021: adiciona campos de endereço ao perfil da cliente final
-- Executar manualmente no Supabase SQL Editor

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS cep                  text,
  ADD COLUMN IF NOT EXISTS address_street       text,
  ADD COLUMN IF NOT EXISTS address_number       text,
  ADD COLUMN IF NOT EXISTS address_complement   text,
  ADD COLUMN IF NOT EXISTS address_neighborhood text,
  ADD COLUMN IF NOT EXISTS address_city         text,
  ADD COLUMN IF NOT EXISTS address_state        char(2);
