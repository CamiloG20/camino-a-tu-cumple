-- Ejecuta en Supabase → SQL Editor si la tabla ya existía sin esta columna
alter table public.days add column if not exists gift_message text;
