-- Hora del recordatorio diario (configurable desde admin).
alter table public.app_config
  add column if not exists notification_hour int not null default 10
  check (notification_hour between 0 and 23);

create or replace function public.get_notification_hour()
returns int
language sql
stable
security definer
set search_path = public
as $$
  select notification_hour from public.app_config where id = 1;
$$;

revoke all on function public.get_notification_hour() from public;
grant execute on function public.get_notification_hour() to anon, authenticated;
