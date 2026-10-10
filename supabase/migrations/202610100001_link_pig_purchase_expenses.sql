-- Pig purchases become ledger transactions. Existing manual Piglets entries require review.
alter table public.batches add column purchase_costs_reconciled boolean not null default true;
alter table public.expenses add column pig_id uuid unique;
alter table public.expenses add column superseded boolean not null default false;
alter table public.expenses add constraint expenses_purchase_pig_fk
  foreign key (pig_id, farm_id, batch_id) references public.pigs(id, farm_id, batch_id) on delete restrict;
alter table public.expenses add constraint expenses_purchase_shape
  check (pig_id is null or (category = 'Piglets' and quantity = 1 and unit = 'head' and not superseded));
alter table public.expenses add constraint expenses_superseded_shape
  check (not superseded or (category = 'Piglets' and pig_id is null));

update public.batches b set purchase_costs_reconciled = false
where exists (select 1 from public.expenses e where e.batch_id = b.id and e.category = 'Piglets');

create function private.sync_pig_purchase(p public.pigs)
returns void language plpgsql security definer set search_path = '' as $$
begin
  insert into public.expenses(farm_id, batch_id, pig_id, category, description, quantity, unit, unit_price, expense_date, notes)
  select p.farm_id, p.batch_id, p.id, 'Piglets', 'Purchase of ' || p.tag_number, 1, 'head', p.purchase_price,
    b.start_date, 'Recorded automatically from pig purchase price. Date defaults to batch start date.'
  from public.batches b where b.id = p.batch_id and b.purchase_costs_reconciled
  on conflict (pig_id) do update set description = excluded.description, unit_price = excluded.unit_price;
end;
$$;
revoke all on function private.sync_pig_purchase(public.pigs) from public, anon, authenticated;

-- Backfill only batches with no ambiguous manual purchase entries.
do $$ declare p public.pigs; begin
  for p in select * from public.pigs loop perform private.sync_pig_purchase(p); end loop;
end $$;

create function private.guard_pig_purchase()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if TG_OP = 'UPDATE' and (new.batch_id <> old.batch_id or new.farm_id <> old.farm_id) then
    raise exception 'A pig purchase belongs to its original batch. Keep the original batch.';
  end if;
  -- Serialize purchases and reconciliation on the batch. Pending batches retain manual totals.
  perform 1 from public.batches where id = new.batch_id for update;
  return new;
end;
$$;
create trigger pigs_guard_purchase before insert or update on public.pigs
  for each row execute function private.guard_pig_purchase();

create function private.sync_pig_purchase_trigger()
returns trigger language plpgsql security definer set search_path = '' as $$
begin perform private.sync_pig_purchase(new); return new; end;
$$;
create trigger pigs_sync_purchase after insert or update on public.pigs
  for each row execute function private.sync_pig_purchase_trigger();

create function private.guard_purchase_expense()
returns trigger language plpgsql security definer set search_path = '' as $$
declare reconciled boolean;
begin
  -- Linked expenses and replacement history can only be changed by the purchase triggers.
  if pg_trigger_depth() > 1 then
    if TG_OP = 'DELETE' then return old; else return new; end if;
  end if;
  if TG_OP <> 'INSERT' and (old.pig_id is not null or old.superseded) then
    raise exception 'Purchase history is protected. Edit the pig purchase price instead.';
  end if;
  if TG_OP = 'DELETE' then return old; end if;
  if new.pig_id is not null or new.superseded then
    raise exception 'Purchase history is managed automatically from Pigs.';
  end if;
  if new.category = 'Piglets' then
    select purchase_costs_reconciled into reconciled from public.batches where id = new.batch_id for update;
    if TG_OP = 'INSERT' then
      raise exception 'Add pig purchase costs through Pigs to avoid counting them twice.';
    elsif old.category <> 'Piglets' or old.batch_id <> new.batch_id or reconciled then
      raise exception 'Add pig purchase costs through Pigs to avoid counting them twice.';
    end if;
  end if;
  return new;
end;
$$;
create trigger expenses_guard_purchase before insert or update or delete on public.expenses
  for each row execute function private.guard_purchase_expense();

create function private.guard_purchase_reconciliation()
returns trigger language plpgsql set search_path = '' as $$
begin
  if TG_OP = 'INSERT' and not new.purchase_costs_reconciled then
    raise exception 'New batches use automatic purchase costs.';
  elsif TG_OP = 'UPDATE' and old.purchase_costs_reconciled and not new.purchase_costs_reconciled then
    raise exception 'Purchase reconciliation cannot be reversed.';
  end if;
  return new;
end;
$$;
create trigger batches_guard_purchase_reconciliation before insert or update on public.batches
  for each row execute function private.guard_purchase_reconciliation();

create function private.reconcile_purchases_trigger()
returns trigger language plpgsql security definer set search_path = '' as $$
declare p public.pigs;
begin
  if not old.purchase_costs_reconciled and new.purchase_costs_reconciled then
    update public.expenses set superseded = true
      where batch_id = new.id and category = 'Piglets' and pig_id is null and not superseded;
    for p in select * from public.pigs where batch_id = new.id loop
      perform private.sync_pig_purchase(p);
    end loop;
  end if;
  return new;
end;
$$;
create trigger batches_reconcile_purchases after update on public.batches
  for each row execute function private.reconcile_purchases_trigger();

create function public.reconcile_pig_purchases(target_batch_id uuid)
returns void language plpgsql security invoker set search_path = '' as $$
begin
  update public.batches set purchase_costs_reconciled = true where id = target_batch_id;
  if not found then raise exception 'Batch not found or access denied.'; end if;
end;
$$;
revoke all on function public.reconcile_pig_purchases(uuid) from public, anon;
grant execute on function public.reconcile_pig_purchases(uuid) to authenticated;
revoke all on function private.guard_pig_purchase(), private.sync_pig_purchase_trigger(),
  private.guard_purchase_expense(), private.guard_purchase_reconciliation(), private.reconcile_purchases_trigger()
  from public, anon, authenticated;
