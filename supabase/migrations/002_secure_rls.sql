-- Seguridad: solo exponer días y media desbloqueados por fecha.
-- Ejecutar en Supabase SQL Editor o: npm run setup:secure-rls

create table if not exists public.app_config (
  id int primary key default 1 check (id = 1),
  birthday_month int not null default 8 check (birthday_month between 1 and 12),
  birthday_day int not null default 9 check (birthday_day between 1 and 31),
  updated_at timestamptz not null default now()
);

insert into public.app_config (id, birthday_month, birthday_day)
values (1, 8, 9)
on conflict (id) do nothing;

alter table public.app_config enable row level security;

drop policy if exists "app_config service role only" on public.app_config;
create policy "app_config service role only"
  on public.app_config
  for all
  using (false)
  with check (false);

create or replace function public.get_birthday_month()
returns int
language sql
stable
security definer
set search_path = public
as $$
  select birthday_month from public.app_config where id = 1;
$$;

create or replace function public.get_birthday_day()
returns int
language sql
stable
security definer
set search_path = public
as $$
  select birthday_day from public.app_config where id = 1;
$$;

create or replace function public.max_unlocked_day_number(as_of date default current_date)
returns int
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  birthday date;
  start_date date;
  days_until int;
begin
  birthday := make_date(
    extract(year from as_of)::int,
    public.get_birthday_month(),
    public.get_birthday_day()
  );

  if as_of > birthday then
    birthday := make_date(
      extract(year from as_of)::int + 1,
      public.get_birthday_month(),
      public.get_birthday_day()
    );
  end if;

  start_date := birthday - 31;
  if as_of < start_date then
    return -1;
  end if;

  days_until := birthday - as_of;
  return days_until;
end;
$$;

create or replace function public.storage_day_number_from_path(path text)
returns int
language plpgsql
immutable
as $$
declare
  parts text[];
begin
  parts := string_to_array(path, '/');

  if array_length(parts, 1) >= 2 and parts[1] in ('images', 'sounds') then
    return nullif(split_part(parts[2], '.', 1), '')::int;
  end if;

  if array_length(parts, 1) >= 2 and parts[1] = 'photos' and parts[2] ~ '^day[0-9]+$' then
    return substring(parts[2] from 'day([0-9]+)')::int;
  end if;

  return null;
exception
  when others then
    return null;
end;
$$;

create or replace function public.get_unlocked_days(as_of date default current_date)
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

revoke all on function public.get_unlocked_days(date) from public;
grant execute on function public.get_unlocked_days(date) to anon, authenticated;

drop policy if exists "Lectura publica de days" on public.days;
drop policy if exists "days anon no direct select" on public.days;

create policy "days anon no direct select"
  on public.days
  for select
  to anon, authenticated
  using (false);

-- Storage: bucket privado, lectura solo de media desbloqueada
update storage.buckets
set public = false
where id = 'media';

drop policy if exists "Public read media" on storage.objects;
drop policy if exists "Public read unlocked media" on storage.objects;
drop policy if exists "Service role full media" on storage.objects;

create policy "Public read unlocked media"
  on storage.objects
  for select
  to anon, authenticated
  using (
    bucket_id = 'media'
    and public.storage_day_number_from_path(name) is not null
    and public.storage_day_number_from_path(name) >= public.max_unlocked_day_number()
  );

create policy "Service role full media"
  on storage.objects
  for all
  to service_role
  using (bucket_id = 'media')
  with check (bucket_id = 'media');
