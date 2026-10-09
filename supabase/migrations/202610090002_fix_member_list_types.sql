create or replace function public.list_farm_members(target_farm_id uuid)
returns table(user_id uuid, email text, role text, joined_at timestamptz)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if target_farm_id not in (select private.user_farm_ids()) then raise exception 'Farm access denied'; end if;
  return query
    select
      fm.user_id,
      coalesce(u.email, 'Unknown member')::text,
      fm.role::text,
      fm.created_at
    from public.farm_members fm
    join auth.users u on u.id = fm.user_id
    where fm.farm_id = target_farm_id
    order by case when fm.role = 'Owner' then 0 else 1 end, fm.created_at;
end;
$$;

revoke execute on function public.list_farm_members(uuid) from public, anon;
grant execute on function public.list_farm_members(uuid) to authenticated;
