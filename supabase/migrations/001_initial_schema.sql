-- ============================================================
-- LevBeauty — Initial Schema
-- Supabase (PostgreSQL 15+)
-- ============================================================

-- Enable UUID generation
create extension if not exists "pgcrypto";

-- ============================================================
-- PROFILES
-- Extends auth.users (one row per user)
-- ============================================================
create table public.profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  role        text not null check (role in ('owner', 'client')),
  full_name   text,
  phone       text,
  avatar_url  text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

alter table public.profiles enable row level security;

create policy "Users can read own profile"
  on public.profiles for select
  using (auth.uid() = id);

create policy "Users can update own profile"
  on public.profiles for update
  using (auth.uid() = id);

-- Auto-create profile on signup
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer as $$
begin
  insert into public.profiles (id, role, full_name)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'role', 'client'),
    coalesce(new.raw_user_meta_data->>'full_name', '')
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ============================================================
-- SUBSCRIPTIONS
-- One row per salon owner, linked to Stripe
-- ============================================================
create table public.subscriptions (
  id                  uuid primary key default gen_random_uuid(),
  owner_id            uuid not null references public.profiles(id) on delete cascade,
  plan                text not null check (plan in ('pro', 'premium', 'elite')) default 'pro',
  status              text not null check (status in ('active', 'canceled', 'past_due', 'trialing')) default 'trialing',
  stripe_customer_id  text unique,
  stripe_sub_id       text unique,
  current_period_end  timestamptz,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

alter table public.subscriptions enable row level security;

create policy "Owners can read own subscription"
  on public.subscriptions for select
  using (auth.uid() = owner_id);

-- ============================================================
-- SALONS
-- One salon per owner (expandable to multi-salon on ELITE)
-- ============================================================
create table public.salons (
  id               uuid primary key default gen_random_uuid(),
  owner_id         uuid not null references public.profiles(id) on delete cascade,
  name             text not null,
  phone            text,
  address          text,
  -- Home-visit config
  home_enabled     boolean not null default false,
  cep_base         text,
  max_radius_km    integer not null default 10,
  price_per_km     numeric(6,2) not null default 2.00,
  min_travel_fee   numeric(8,2) not null default 20.00,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

alter table public.salons enable row level security;

create policy "Owner can manage own salon"
  on public.salons for all
  using (auth.uid() = owner_id);

create policy "Clients can read any salon"
  on public.salons for select
  using (true);

-- ============================================================
-- SERVICES
-- Service catalog per salon
-- ============================================================
create table public.services (
  id              uuid primary key default gen_random_uuid(),
  salon_id        uuid not null references public.salons(id) on delete cascade,
  name            text not null,
  emoji           text default '💅',
  duration_min    integer not null default 60,
  price           numeric(8,2) not null default 0,
  profit_margin   numeric(5,2) not null default 30,
  tax_pct         numeric(5,2) not null default 6,
  card_pct        numeric(5,2) not null default 3,
  mkt_pct         numeric(5,2) not null default 5,
  manicure_pct    numeric(5,2) not null default 0,
  active          boolean not null default true,
  created_at      timestamptz not null default now()
);

alter table public.services enable row level security;

create policy "Owner can manage salon services"
  on public.services for all
  using (
    exists (
      select 1 from public.salons
      where salons.id = services.salon_id
        and salons.owner_id = auth.uid()
    )
  );

create policy "Clients can read active services"
  on public.services for select
  using (active = true);

-- ============================================================
-- INPUTS (Insumos)
-- Supply items per salon
-- ============================================================
create table public.inputs (
  id               uuid primary key default gen_random_uuid(),
  salon_id         uuid not null references public.salons(id) on delete cascade,
  name             text not null,
  unit             text not null default 'ml',
  pkg_qty          numeric(10,3) not null default 0,
  pkg_cost         numeric(8,2) not null default 0,
  per_application  numeric(10,3) not null default 0,
  created_at       timestamptz not null default now()
);

alter table public.inputs enable row level security;

create policy "Owner can manage salon inputs"
  on public.inputs for all
  using (
    exists (
      select 1 from public.salons
      where salons.id = inputs.salon_id
        and salons.owner_id = auth.uid()
    )
  );

-- ============================================================
-- SERVICE_INPUTS
-- Many-to-many: which inputs a service uses
-- ============================================================
create table public.service_inputs (
  service_id  uuid not null references public.services(id) on delete cascade,
  input_id    uuid not null references public.inputs(id) on delete cascade,
  primary key (service_id, input_id)
);

alter table public.service_inputs enable row level security;

create policy "Owner can manage service inputs"
  on public.service_inputs for all
  using (
    exists (
      select 1 from public.services s
      join public.salons sl on sl.id = s.salon_id
      where s.id = service_inputs.service_id
        and sl.owner_id = auth.uid()
    )
  );

-- ============================================================
-- APPOINTMENTS
-- ============================================================
create table public.appointments (
  id              uuid primary key default gen_random_uuid(),
  salon_id        uuid not null references public.salons(id) on delete cascade,
  client_id       uuid references public.profiles(id) on delete set null,
  client_name     text not null,
  client_phone    text,
  service_id      uuid references public.services(id) on delete set null,
  service_name    text not null,
  appt_date       date not null,
  appt_time       text not null,        -- e.g. "09:00"
  duration_min    integer not null default 60,
  price           numeric(8,2) not null default 0,
  status          text not null default 'pendente'
                    check (status in ('pendente', 'confirmado', 'concluido', 'cancelado')),
  payment_method  text check (payment_method in ('pix', 'credito', 'local')),
  payment_status  text not null default 'pendente'
                    check (payment_status in ('pendente', 'pago')),
  location        text not null default 'salao'
                    check (location in ('salao', 'domicilio')),
  client_cep      text,
  travel_fee      numeric(8,2) default 0,
  notes           text,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

alter table public.appointments enable row level security;

create policy "Owner can manage salon appointments"
  on public.appointments for all
  using (
    exists (
      select 1 from public.salons
      where salons.id = appointments.salon_id
        and salons.owner_id = auth.uid()
    )
  );

create policy "Clients can read own appointments"
  on public.appointments for select
  using (auth.uid() = client_id);

create policy "Clients can insert own appointments"
  on public.appointments for insert
  with check (auth.uid() = client_id);

create policy "Clients can cancel own appointments"
  on public.appointments for update
  using (auth.uid() = client_id)
  with check (status = 'cancelado');

-- Index for common queries
create index appointments_salon_date_idx on public.appointments(salon_id, appt_date);
create index appointments_client_idx on public.appointments(client_id);

-- ============================================================
-- FIXED_COSTS
-- Monthly fixed costs per salon
-- ============================================================
create table public.fixed_costs (
  id          uuid primary key default gen_random_uuid(),
  salon_id    uuid not null references public.salons(id) on delete cascade,
  name        text not null,
  amount      numeric(8,2) not null default 0,
  category    text default 'outros',
  created_at  timestamptz not null default now()
);

alter table public.fixed_costs enable row level security;

create policy "Owner can manage fixed costs"
  on public.fixed_costs for all
  using (
    exists (
      select 1 from public.salons
      where salons.id = fixed_costs.salon_id
        and salons.owner_id = auth.uid()
    )
  );

-- ============================================================
-- updated_at auto-update trigger
-- ============================================================
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger set_profiles_updated_at
  before update on public.profiles
  for each row execute procedure public.set_updated_at();

create trigger set_salons_updated_at
  before update on public.salons
  for each row execute procedure public.set_updated_at();

create trigger set_subscriptions_updated_at
  before update on public.subscriptions
  for each row execute procedure public.set_updated_at();

create trigger set_appointments_updated_at
  before update on public.appointments
  for each row execute procedure public.set_updated_at();
