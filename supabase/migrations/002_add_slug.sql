-- Add slug to salons for public booking URLs
alter table public.salons
  add column if not exists slug text unique;

create index if not exists salons_slug_idx
  on public.salons(slug);

-- Function for availability check — exposes only time data, no client info
create or replace function public.get_booked_slots(p_salon_id uuid, p_date date)
returns table (appt_time text, duration_min integer)
language sql
security definer
stable
as $$
  select appt_time, duration_min
  from public.appointments
  where salon_id = p_salon_id
    and appt_date = p_date
    and status != 'cancelado';
$$;

-- Guest bookings: allow unauthenticated inserts where client_id is null
create policy "Guests can book appointments"
  on public.appointments for insert
  with check (client_id is null);

-- Permissions for the anon (public) role
grant select on public.salons to anon;
grant select on public.services to anon;
grant insert on public.appointments to anon;
grant execute on function public.get_booked_slots(uuid, date) to anon, authenticated;
