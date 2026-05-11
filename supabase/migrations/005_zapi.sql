alter table public.salons
  add column if not exists zapi_instance_id text,
  add column if not exists zapi_token       text,
  add column if not exists zapi_connected   boolean not null default false;
