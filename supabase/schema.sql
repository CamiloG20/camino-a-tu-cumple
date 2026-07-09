-- Ejecuta esto en Supabase → SQL Editor (proyecto nuevo)
-- Para seguridad en producción, después corre: npm run setup:secure-rls

create table if not exists public.days (
  id bigint generated always as identity primary key,
  day_number int unique not null check (day_number between 0 and 31),
  text text,
  image_path text,
  audio_path text,
  has_gift boolean default false,
  gift_number int,
  gift_message text,
  photo_paths text[] default '{}'
);

alter table public.days enable row level security;

drop policy if exists "Lectura publica de days" on public.days;
create policy "Lectura publica de days"
  on public.days for select
  using (true);

-- Tras migrar datos, aplica supabase/migrations/002_secure_rls.sql
