-- Fecha “hoy” según hora de Ecuador (Quito / Guayaquil).
-- Evita que los días se desbloqueen a medianoche UTC (19:00 en Ecuador).

create or replace function public.app_today()
returns date
language sql
stable
as $$
  select (now() at time zone 'America/Guayaquil')::date;
$$;

create or replace function public.max_unlocked_day_number(as_of date default public.app_today())
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
