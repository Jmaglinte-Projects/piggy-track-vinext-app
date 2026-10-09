create or replace function public.create_farm_invitation(target_farm_id uuid, validity_days integer default 7)
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

create or replace function public.accept_farm_invitation(invitation_code text)
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

revoke execute on function public.create_farm_invitation(uuid, integer) from public, anon;
revoke execute on function public.accept_farm_invitation(text) from public, anon;
grant execute on function public.create_farm_invitation(uuid, integer) to authenticated;
grant execute on function public.accept_farm_invitation(text) to authenticated;
