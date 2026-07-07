-- Ejecuta esto en Supabase → SQL Editor (una sola vez)

create table if not exists public.days (
  id bigint generated always as identity primary key,
  day_number int unique not null,
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

-- Bucket "media" se crea automáticamente con npm run migrate:firebase
