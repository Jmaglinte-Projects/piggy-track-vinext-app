create table public.farm_invitations (
  id uuid primary key default gen_random_uuid(),
  farm_id uuid not null references public.farms(id) on delete cascade,
  code_hash text not null unique,
  expires_at timestamptz not null,
  used_at timestamptz,
  used_by uuid references auth.users(id) on delete set null,
  created_by uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  check (expires_at > created_at)
);

create index farm_invitations_farm_id_idx on public.farm_invitations(farm_id);
alter table public.farm_invitations enable row level security;
grant select, delete on public.farm_invitations to authenticated;

create policy invitations_select on public.farm_invitations for select to authenticated
  using (private.is_farm_owner(farm_id));
create policy invitations_delete on public.farm_invitations for delete to authenticated
  using (private.is_farm_owner(farm_id));

create function public.create_farm_invitation(target_farm_id uuid, validity_days integer default 7)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare raw_code text; invitation_expiry timestamptz;
begin
  if (select auth.uid()) is null then raise exception 'Authentication required'; end if;
  if not private.is_farm_owner(target_farm_id) then raise exception 'Only farm owners can create invitations'; end if;
  if validity_days < 1 or validity_days > 30 then raise exception 'Invitation validity must be between 1 and 30 days'; end if;

  raw_code := upper(encode(extensions.gen_random_bytes(8), 'hex'));
  invitation_expiry := now() + make_interval(days => validity_days);
  insert into public.farm_invitations(farm_id, code_hash, expires_at, created_by)
  values (target_farm_id, encode(extensions.digest(raw_code, 'sha256'), 'hex'), invitation_expiry, (select auth.uid()));

  return jsonb_build_object('code', raw_code, 'expires_at', invitation_expiry);
end;
$$;

create function public.accept_farm_invitation(invitation_code text)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare invitation_id uuid; invitation_farm_id uuid; invitation_expiry timestamptz; invitation_used_at timestamptz;
begin
  if (select auth.uid()) is null then raise exception 'Authentication required'; end if;
  if char_length(trim(invitation_code)) < 8 then raise exception 'Invalid invitation code'; end if;

  select id, farm_id, expires_at, used_at
    into invitation_id, invitation_farm_id, invitation_expiry, invitation_used_at
  from public.farm_invitations
  where code_hash = encode(extensions.digest(upper(regexp_replace(trim(invitation_code), '[^A-Fa-f0-9]', '', 'g')), 'sha256'), 'hex')
  for update;

  if invitation_id is null then raise exception 'Invitation code is invalid'; end if;
  if invitation_used_at is not null then raise exception 'Invitation code has already been used'; end if;
  if invitation_expiry <= now() then raise exception 'Invitation code has expired'; end if;

  insert into public.farm_members(farm_id, user_id, role)
  values (invitation_farm_id, (select auth.uid()), 'Member')
  on conflict (farm_id, user_id) do nothing;

  update public.farm_invitations
  set used_at = now(), used_by = (select auth.uid())
  where id = invitation_id;

  return invitation_farm_id;
end;
$$;

create function public.list_farm_members(target_farm_id uuid)
returns table(user_id uuid, email text, role text, joined_at timestamptz)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if target_farm_id not in (select private.user_farm_ids()) then raise exception 'Farm access denied'; end if;
  return query
    select fm.user_id, coalesce(u.email, 'Unknown member')::text, fm.role::text, fm.created_at
    from public.farm_members fm
    join auth.users u on u.id = fm.user_id
    where fm.farm_id = target_farm_id
    order by case when fm.role = 'Owner' then 0 else 1 end, fm.created_at;
end;
$$;

create function public.remove_farm_member(target_farm_id uuid, target_user_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not private.is_farm_owner(target_farm_id) then raise exception 'Only farm owners can remove members'; end if;
  if target_user_id = (select auth.uid()) then raise exception 'Owners cannot remove themselves'; end if;
  delete from public.farm_members
  where farm_id = target_farm_id and user_id = target_user_id and role = 'Member';
  if not found then raise exception 'Member not found'; end if;
end;
$$;

revoke execute on function public.create_farm_invitation(uuid, integer) from public, anon;
revoke execute on function public.accept_farm_invitation(text) from public, anon;
revoke execute on function public.list_farm_members(uuid) from public, anon;
revoke execute on function public.remove_farm_member(uuid, uuid) from public, anon;
grant execute on function public.create_farm_invitation(uuid, integer) to authenticated;
grant execute on function public.accept_farm_invitation(text) to authenticated;
grant execute on function public.list_farm_members(uuid) to authenticated;
grant execute on function public.remove_farm_member(uuid, uuid) to authenticated;
