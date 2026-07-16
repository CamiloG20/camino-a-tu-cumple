-- Los day_number bajan hacia el cumpleaños (31 → 0).
-- El pasado tiene números MAYORES que hoy; el futuro, menores.
-- Corregir filtro: desbloqueados = day_number >= max_unlocked (pasado + hoy).

create or replace function public.get_unlocked_days(as_of date default public.app_today())
returns setof public.days
language sql
stable
security definer
set search_path = public
as $$
  select *
  from public.days
  where day_number >= public.max_unlocked_day_number(as_of)
  order by day_number desc;
$$;

drop policy if exists "Public read unlocked media" on storage.objects;

create policy "Public read unlocked media"
  on storage.objects
  for select
  to anon, authenticated
  using (
    bucket_id = 'media'
    and public.storage_day_number_from_path(name) is not null
    and public.storage_day_number_from_path(name) >= public.max_unlocked_day_number()
  );
