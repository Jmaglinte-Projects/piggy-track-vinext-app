-- One membership per user/workspace; Owners write, Viewers read.
alter table public.farm_members drop constraint farm_members_role_check;
update public.farm_members set role = 'Viewer' where role = 'Member';
alter table public.farm_members add constraint farm_members_role_check check (role in ('Owner', 'Viewer'));

-- Owners may rename farms; RLS still checks ownership.
grant update (name) on public.farms to authenticated;

-- Membership changes go only through the checked invitation/removal workflows.
revoke insert, update, delete on public.farm_members from public, anon, authenticated;
drop policy members_insert on public.farm_members;
drop policy members_update on public.farm_members;
drop policy members_delete on public.farm_members;
drop policy members_select on public.farm_members;
create policy members_select on public.farm_members for select to authenticated
  using (user_id = (select auth.uid()) or private.is_farm_owner(farm_id));

drop policy batches_all on public.batches;
create policy batches_select on public.batches for select to authenticated
  using (farm_id in (select private.user_farm_ids()));
create policy batches_insert on public.batches for insert to authenticated
  with check (private.is_farm_owner(farm_id));
create policy batches_update on public.batches for update to authenticated
  using (private.is_farm_owner(farm_id)) with check (private.is_farm_owner(farm_id));
create policy batches_delete on public.batches for delete to authenticated
  using (private.is_farm_owner(farm_id));

drop policy pigs_all on public.pigs;
create policy pigs_select on public.pigs for select to authenticated
  using (farm_id in (select private.user_farm_ids()));
create policy pigs_insert on public.pigs for insert to authenticated
  with check (private.is_farm_owner(farm_id));
create policy pigs_update on public.pigs for update to authenticated
  using (private.is_farm_owner(farm_id)) with check (private.is_farm_owner(farm_id));
create policy pigs_delete on public.pigs for delete to authenticated
  using (private.is_farm_owner(farm_id));

drop policy expenses_all on public.expenses;
create policy expenses_select on public.expenses for select to authenticated
  using (farm_id in (select private.user_farm_ids()));
create policy expenses_insert on public.expenses for insert to authenticated
  with check (private.is_farm_owner(farm_id));
create policy expenses_update on public.expenses for update to authenticated
  using (private.is_farm_owner(farm_id)) with check (private.is_farm_owner(farm_id));
create policy expenses_delete on public.expenses for delete to authenticated
  using (private.is_farm_owner(farm_id));

drop policy buyers_all on public.buyers;
create policy buyers_select on public.buyers for select to authenticated
  using (farm_id in (select private.user_farm_ids()));
create policy buyers_insert on public.buyers for insert to authenticated
  with check (private.is_farm_owner(farm_id));
create policy buyers_update on public.buyers for update to authenticated
  using (private.is_farm_owner(farm_id)) with check (private.is_farm_owner(farm_id));
create policy buyers_delete on public.buyers for delete to authenticated
  using (private.is_farm_owner(farm_id));

drop policy pig_sales_all on public.pig_sales;
create policy pig_sales_select on public.pig_sales for select to authenticated
  using (farm_id in (select private.user_farm_ids()));
create policy pig_sales_insert on public.pig_sales for insert to authenticated
  with check (private.is_farm_owner(farm_id));
create policy pig_sales_update on public.pig_sales for update to authenticated
  using (private.is_farm_owner(farm_id)) with check (private.is_farm_owner(farm_id));
create policy pig_sales_delete on public.pig_sales for delete to authenticated
  using (private.is_farm_owner(farm_id));

drop policy payments_all on public.payments;
create policy payments_select on public.payments for select to authenticated
  using (farm_id in (select private.user_farm_ids()));
create policy payments_insert on public.payments for insert to authenticated
  with check (private.is_farm_owner(farm_id));
create policy payments_update on public.payments for update to authenticated
  using (private.is_farm_owner(farm_id)) with check (private.is_farm_owner(farm_id));
create policy payments_delete on public.payments for delete to authenticated
  using (private.is_farm_owner(farm_id));

-- Fetch only the caller's role, never another user's membership row.
create function public.list_my_farms()
returns table(id uuid, name text, role text)
language sql stable security invoker set search_path = '' as $$
  select f.id, f.name, fm.role::text
  from public.farm_members fm join public.farms f on f.id = fm.farm_id
  where fm.user_id = (select auth.uid())
  order by f.created_at, f.id
$$;
revoke all on function public.list_my_farms() from public, anon;
grant execute on function public.list_my_farms() to authenticated;

-- Concurrent initial loads must not create multiple personal farms.
create function public.ensure_farm_workspace()
returns uuid language plpgsql security definer set search_path = '' as $$
declare current_user_id uuid := (select auth.uid()); existing_farm_id uuid;
begin
  if current_user_id is null then raise exception 'Authentication required'; end if;
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(current_user_id::text, 0));
  select fm.farm_id into existing_farm_id from public.farm_members fm
    where fm.user_id = current_user_id order by fm.created_at, fm.farm_id limit 1;
  if existing_farm_id is not null then return existing_farm_id; end if;
  return public.create_farm('My Piggery');
end;
$$;
revoke all on function public.ensure_farm_workspace() from public, anon;
grant execute on function public.ensure_farm_workspace() to authenticated;

create or replace function public.record_pig_sale(
  target_sale_id uuid,
  target_farm_id uuid,
  target_batch_id uuid,
  target_pig_id uuid,
  target_buyer_id uuid,
  target_actual_weight numeric,
  target_weight_deduction numeric,
  target_price_per_kg numeric,
  target_sale_date date,
  target_payment_due_date date,
  target_notes text
)
returns uuid
language plpgsql
set search_path = ''
as $$
declare saved_id uuid; previous_pig_id uuid;
begin
  if not private.is_farm_owner(target_farm_id) then raise exception 'Only farm owners can modify records'; end if;
  if target_sale_id is null then
    insert into public.pig_sales(farm_id, batch_id, pig_id, buyer_id, actual_weight, weight_deduction, price_per_kg, sale_date, payment_due_date, notes)
    values (target_farm_id, target_batch_id, target_pig_id, target_buyer_id, target_actual_weight, target_weight_deduction, target_price_per_kg, target_sale_date, target_payment_due_date, coalesce(target_notes, ''))
    returning id into saved_id;
  else
    select pig_id into previous_pig_id from public.pig_sales where id = target_sale_id and farm_id = target_farm_id;
    update public.pig_sales set buyer_id = target_buyer_id, actual_weight = target_actual_weight, weight_deduction = target_weight_deduction,
      pig_id = target_pig_id, batch_id = target_batch_id, price_per_kg = target_price_per_kg, sale_date = target_sale_date,
      payment_due_date = target_payment_due_date, notes = coalesce(target_notes, '')
    where id = target_sale_id and farm_id = target_farm_id returning id into saved_id;
  end if;
  if saved_id is null then raise exception 'Sale could not be saved'; end if;
  if previous_pig_id is not null and previous_pig_id <> target_pig_id then
    update public.pigs set status = 'Active' where id = previous_pig_id and farm_id = target_farm_id;
  end if;
  update public.pigs set status = 'Sold', current_weight = target_actual_weight where id = target_pig_id and farm_id = target_farm_id;
  return saved_id;
end;
$$;

create or replace function public.delete_pig_sale(target_sale_id uuid)
returns void
language plpgsql
set search_path = ''
as $$
declare target_pig_id uuid; target_farm_id uuid;
begin
  select pig_id, farm_id into target_pig_id, target_farm_id from public.pig_sales where id = target_sale_id;
  if target_pig_id is null then raise exception 'Sale not found'; end if;
  if not private.is_farm_owner(target_farm_id) then raise exception 'Only farm owners can modify records'; end if;
  delete from public.pig_sales where id = target_sale_id;
  update public.pigs set status = 'Active' where id = target_pig_id and farm_id = target_farm_id;
end;
$$;

create or replace function public.record_payment(
  target_payment_id uuid,
  target_farm_id uuid,
  target_sale_id uuid,
  target_amount numeric,
  target_payment_date date,
  target_payment_method text,
  target_notes text
)
returns uuid
language plpgsql
set search_path = ''
as $$
declare sale_total numeric; paid_total numeric; saved_id uuid;
begin
  if not private.is_farm_owner(target_farm_id) then raise exception 'Only farm owners can modify records'; end if;
  select (actual_weight - weight_deduction) * price_per_kg into sale_total from public.pig_sales where id = target_sale_id and farm_id = target_farm_id;
  if sale_total is null then raise exception 'Sale not found'; end if;
  select coalesce(sum(amount), 0) into paid_total from public.payments where sale_id = target_sale_id and id <> coalesce(target_payment_id, '00000000-0000-0000-0000-000000000000'::uuid);
  if paid_total + target_amount > sale_total then raise exception 'Payment exceeds the outstanding balance'; end if;
  if target_payment_id is null then
    insert into public.payments(farm_id, sale_id, amount, payment_date, payment_method, notes)
    values (target_farm_id, target_sale_id, target_amount, target_payment_date, target_payment_method, coalesce(target_notes, '')) returning id into saved_id;
  else
    update public.payments set amount = target_amount, payment_date = target_payment_date, payment_method = target_payment_method, notes = coalesce(target_notes, '')
    where id = target_payment_id and farm_id = target_farm_id returning id into saved_id;
  end if;
  if saved_id is null then raise exception 'Payment could not be saved'; end if;
  return saved_id;
end;
$$;

revoke execute on function public.record_pig_sale(uuid, uuid, uuid, uuid, uuid, numeric, numeric, numeric, date, date, text) from public, anon;
revoke execute on function public.delete_pig_sale(uuid) from public, anon;
revoke execute on function public.record_payment(uuid, uuid, uuid, numeric, date, text, text) from public, anon;
grant execute on function public.record_pig_sale(uuid, uuid, uuid, uuid, uuid, numeric, numeric, numeric, date, date, text) to authenticated;
grant execute on function public.delete_pig_sale(uuid) to authenticated;
grant execute on function public.record_payment(uuid, uuid, uuid, numeric, date, text, text) to authenticated;

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
  values (invitation_farm_id, (select auth.uid()), 'Viewer')
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

create or replace function public.list_farm_members(target_farm_id uuid)
returns table(user_id uuid, email text, role text, joined_at timestamptz)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not private.is_farm_owner(target_farm_id) then raise exception 'Only farm owners can view the member directory'; end if;
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

create or replace function public.remove_farm_member(target_farm_id uuid, target_user_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not private.is_farm_owner(target_farm_id) then raise exception 'Only farm owners can remove members'; end if;
  if target_user_id = (select auth.uid()) then raise exception 'Owners cannot remove themselves'; end if;
  delete from public.farm_members
  where farm_id = target_farm_id and user_id = target_user_id and role = 'Viewer';
  if not found then raise exception 'Member not found'; end if;
end;
$$;


create or replace function public.reconcile_pig_purchases(target_batch_id uuid)
returns void language plpgsql security invoker set search_path = '' as $$
declare target_farm_id uuid;
begin
  select farm_id into target_farm_id from public.batches where id = target_batch_id;
  if target_farm_id is null or not private.is_farm_owner(target_farm_id) then
    raise exception 'Only farm owners can reconcile purchase costs';
  end if;
  update public.batches set purchase_costs_reconciled = true where id = target_batch_id;
end;
$$;
revoke all on function public.reconcile_pig_purchases(uuid) from public, anon;
grant execute on function public.reconcile_pig_purchases(uuid) to authenticated;

-- Append-only change history. Financial snapshots are visible only to farm Owners.
create table public.farm_audit_log (
  id bigint generated always as identity primary key,
  farm_id uuid not null references public.farms(id) on delete cascade,
  actor_user_id uuid,
  table_name text not null,
  record_id text not null,
  action text not null check (action in ('INSERT', 'UPDATE', 'DELETE')),
  occurred_at timestamptz not null default now(),
  old_data jsonb,
  new_data jsonb
);
create index farm_audit_log_farm_time_idx on public.farm_audit_log(farm_id, occurred_at desc);
alter table public.farm_audit_log enable row level security;
revoke all on public.farm_audit_log from public, anon, authenticated;
grant select on public.farm_audit_log to authenticated;
create policy audit_owner_select on public.farm_audit_log for select to authenticated
  using (private.is_farm_owner(farm_id));

create function private.audit_farm_change()
returns trigger language plpgsql security definer set search_path = '' as $$
declare previous jsonb; current_row jsonb; row_data jsonb;
begin
  if TG_OP <> 'INSERT' then previous := to_jsonb(old); end if;
  if TG_OP <> 'DELETE' then current_row := to_jsonb(new); end if;
  if previous is not distinct from current_row then return new; end if;
  row_data := coalesce(current_row, previous);
  insert into public.farm_audit_log(farm_id, actor_user_id, table_name, record_id, action, old_data, new_data)
  values ((case when TG_TABLE_NAME = 'farms' then row_data->>'id' else row_data->>'farm_id' end)::uuid,
    (select auth.uid()), TG_TABLE_NAME,
    coalesce(row_data->>'id', row_data->>'user_id'), TG_OP, previous, current_row);
  if TG_OP = 'DELETE' then return old; end if;
  return new;
end;
$$;
revoke all on function private.audit_farm_change() from public, anon, authenticated;
create trigger batches_audit_change after insert or update or delete on public.batches
  for each row execute function private.audit_farm_change();
create trigger pigs_audit_change after insert or update or delete on public.pigs
  for each row execute function private.audit_farm_change();
create trigger expenses_audit_change after insert or update or delete on public.expenses
  for each row execute function private.audit_farm_change();
create trigger buyers_audit_change after insert or update or delete on public.buyers
  for each row execute function private.audit_farm_change();
create trigger pig_sales_audit_change after insert or update or delete on public.pig_sales
  for each row execute function private.audit_farm_change();
create trigger payments_audit_change after insert or update or delete on public.payments
  for each row execute function private.audit_farm_change();
create trigger farm_members_audit_change after insert or update or delete on public.farm_members
  for each row execute function private.audit_farm_change();
create trigger farms_audit_change after insert or update on public.farms
  for each row execute function private.audit_farm_change();
