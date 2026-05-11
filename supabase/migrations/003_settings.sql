alter table public.salons add column if not exists home_salon boolean not null default true;
alter table public.salons add column if not exists requires_deposit boolean not null default false;

alter table public.appointments add column if not exists deposit_paid boolean not null default false;
alter table public.appointments add column if not exists deposit_amount numeric(8,2) not null default 0;
alter table public.appointments add column if not exists stripe_session_id text;
