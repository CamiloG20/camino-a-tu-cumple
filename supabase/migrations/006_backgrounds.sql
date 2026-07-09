-- Fondos configurables: global (app_config) y por día (days.background_path).
-- Storage: backgrounds/global.{ext} y backgrounds/day{N}.{ext}

alter table public.app_config
  add column if not exists background_path text;

alter table public.days
  add column if not exists background_path text;

create or replace function public.storage_day_number_from_path(path text)
returns int
language plpgsql
immutable
as $$
declare
  parts text[];
  base text;
begin
  parts := string_to_array(path, '/');

  if array_length(parts, 1) >= 2 and parts[1] in ('images', 'sounds') then
    return nullif(split_part(parts[2], '.', 1), '')::int;
  end if;

  if array_length(parts, 1) >= 2 and parts[1] = 'photos' and parts[2] ~ '^day[0-9]+$' then
    return substring(parts[2] from 'day([0-9]+)')::int;
  end if;

  if array_length(parts, 1) >= 2 and parts[1] = 'backgrounds' then
    base := split_part(parts[2], '.', 1);
    if base = 'global' then
      return 31;
    end if;
    if base ~ '^day[0-9]+$' then
      return substring(base from 'day([0-9]+)')::int;
    end if;
  end if;

  return null;
exception
  when others then
    return null;
end;
$$;

drop policy if exists "Public read global background" on storage.objects;

create policy "Public read global background"
  on storage.objects
  for select
  to anon, authenticated
  using (
    bucket_id = 'media'
    and name like 'backgrounds/global.%'
  );
