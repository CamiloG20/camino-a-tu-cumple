-- Suscripciones Web Push (iPhone PWA + Android)
-- Ejecutar en Supabase SQL Editor o incluir en setup

create table if not exists public.push_subscriptions (
  id bigint generated always as identity primary key,
  endpoint text unique not null,
  subscription jsonb not null,
  user_agent text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists push_subscriptions_endpoint_idx on public.push_subscriptions (endpoint);

alter table public.push_subscriptions enable row level security;

drop policy if exists "push_subscriptions no public" on public.push_subscriptions;
create policy "push_subscriptions no public"
  on public.push_subscriptions
  for all
  to anon, authenticated
  using (false)
  with check (false);
