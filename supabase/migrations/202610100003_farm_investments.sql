-- Farm setup and equipment costs are independent of the batch expense ledger.
create table public.farm_investments (
  id uuid primary key default gen_random_uuid(),
  farm_id uuid not null references public.farms(id) on delete cascade,
  name text not null check (length(trim(name)) between 1 and 120),
  category text not null check (category in ('Construction', 'Water Systems', 'Fencing', 'Equipment', 'Other')),
  amount numeric(12,2) not null check (amount > 0 and amount <> 'NaN'::numeric),
  investment_date date not null check (investment_date between date '0001-01-01' and date '9999-12-31'),
  notes text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index farm_investments_farm_date_idx on public.farm_investments(farm_id, investment_date desc);
alter table public.farm_investments enable row level security;
revoke all on public.farm_investments from public, anon;
grant select, insert, delete on public.farm_investments to authenticated;
grant update (name, category, amount, investment_date, notes) on public.farm_investments to authenticated;
create policy investments_select on public.farm_investments for select to authenticated
  using (farm_id in (select private.user_farm_ids()));
create policy investments_insert on public.farm_investments for insert to authenticated
  with check (private.is_farm_owner(farm_id));
create policy investments_update on public.farm_investments for update to authenticated
  using (private.is_farm_owner(farm_id)) with check (private.is_farm_owner(farm_id));
create policy investments_delete on public.farm_investments for delete to authenticated
  using (private.is_farm_owner(farm_id));
create trigger farm_investments_updated_at before update on public.farm_investments
  for each row execute function private.set_updated_at();
create trigger farm_investments_audit_change after insert or update or delete on public.farm_investments
  for each row execute function private.audit_farm_change();
