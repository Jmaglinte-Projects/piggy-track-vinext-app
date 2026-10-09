create extension if not exists pgcrypto;

create schema if not exists private;

create table public.farms (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(trim(name)) between 2 and 100),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.farm_members (
  farm_id uuid not null references public.farms(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null check (role in ('Owner', 'Member')),
  created_at timestamptz not null default now(),
  primary key (farm_id, user_id)
);

create table public.batches (
  id uuid primary key default gen_random_uuid(),
  farm_id uuid not null references public.farms(id) on delete cascade,
  name text not null check (char_length(trim(name)) between 2 and 120),
  start_date date not null,
  end_date date,
  status text not null default 'Active' check (status in ('Active', 'Completed', 'Archived')),
  notes text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, farm_id),
  check (end_date is null or end_date >= start_date)
);

create table public.pigs (
  id uuid primary key default gen_random_uuid(),
  farm_id uuid not null references public.farms(id) on delete cascade,
  batch_id uuid not null,
  tag_number text not null check (char_length(trim(tag_number)) between 1 and 60),
  purchase_price numeric(12,2) not null check (purchase_price >= 0),
  purchase_weight numeric(8,2) not null check (purchase_weight >= 0),
  current_weight numeric(8,2) not null check (current_weight >= 0),
  status text not null default 'Active' check (status in ('Active', 'Sold', 'Died', 'Removed')),
  notes text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, farm_id, batch_id),
  unique (batch_id, tag_number),
  foreign key (batch_id, farm_id) references public.batches(id, farm_id) on delete restrict
);

create table public.expenses (
  id uuid primary key default gen_random_uuid(),
  farm_id uuid not null references public.farms(id) on delete cascade,
  batch_id uuid not null,
  category text not null check (category in ('Piglets', 'Feed', 'Vitamins', 'Medicine', 'Vaccines', 'Pig House Repair', 'Labor', 'Transportation', 'Water', 'Electricity', 'Other')),
  description text not null check (char_length(trim(description)) between 1 and 160),
  quantity numeric(12,3) not null check (quantity > 0),
  unit text not null check (char_length(trim(unit)) between 1 and 30),
  unit_price numeric(12,2) not null check (unit_price >= 0),
  expense_date date not null,
  notes text not null default '',
  feed_type text check (feed_type in ('Pre Starter', 'Starter', 'Starter Premium', 'Grower', 'Finisher')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, farm_id, batch_id),
  foreign key (batch_id, farm_id) references public.batches(id, farm_id) on delete restrict,
  check ((category = 'Feed' and feed_type is not null) or (category <> 'Feed' and feed_type is null))
);

create table public.buyers (
  id uuid primary key default gen_random_uuid(),
  farm_id uuid not null references public.farms(id) on delete cascade,
  name text not null check (char_length(trim(name)) between 1 and 120),
  contact_information text not null default '',
  notes text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, farm_id)
);

create table public.pig_sales (
  id uuid primary key default gen_random_uuid(),
  farm_id uuid not null references public.farms(id) on delete cascade,
  batch_id uuid not null,
  pig_id uuid not null unique,
  buyer_id uuid not null,
  actual_weight numeric(8,2) not null check (actual_weight >= 0),
  weight_deduction numeric(8,2) not null default 0 check (weight_deduction >= 0 and weight_deduction <= actual_weight),
  price_per_kg numeric(12,2) not null check (price_per_kg >= 0),
  sale_date date not null,
  payment_due_date date not null,
  notes text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, farm_id),
  foreign key (pig_id, farm_id, batch_id) references public.pigs(id, farm_id, batch_id) on delete restrict,
  foreign key (buyer_id, farm_id) references public.buyers(id, farm_id) on delete restrict,
  check (payment_due_date >= sale_date)
);

create table public.payments (
  id uuid primary key default gen_random_uuid(),
  farm_id uuid not null references public.farms(id) on delete cascade,
  sale_id uuid not null,
  amount numeric(12,2) not null check (amount > 0),
  payment_date date not null,
  payment_method text not null check (payment_method in ('Cash', 'Bank Transfer', 'GCash', 'Other')),
  notes text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  foreign key (sale_id, farm_id) references public.pig_sales(id, farm_id) on delete restrict
);

create index farm_members_user_id_idx on public.farm_members(user_id);
create index batches_farm_id_idx on public.batches(farm_id);
create index pigs_farm_batch_idx on public.pigs(farm_id, batch_id);
create index expenses_farm_batch_date_idx on public.expenses(farm_id, batch_id, expense_date desc);
create index buyers_farm_id_idx on public.buyers(farm_id);
create index pig_sales_farm_batch_idx on public.pig_sales(farm_id, batch_id);
create index payments_farm_sale_idx on public.payments(farm_id, sale_id);

create function private.user_farm_ids()
returns setof uuid
language sql
stable
security definer
set search_path = ''
as $$
  select farm_id from public.farm_members where user_id = (select auth.uid())
$$;

create function private.is_farm_owner(target_farm_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.farm_members
    where farm_id = target_farm_id and user_id = (select auth.uid()) and role = 'Owner'
  )
$$;

revoke all on schema private from public;
grant usage on schema private to authenticated;
revoke execute on function private.user_farm_ids() from public, anon;
revoke execute on function private.is_farm_owner(uuid) from public, anon;
grant execute on function private.user_farm_ids() to authenticated;
grant execute on function private.is_farm_owner(uuid) to authenticated;

create function public.create_farm(farm_name text)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare new_farm_id uuid;
begin
  if (select auth.uid()) is null then raise exception 'Authentication required'; end if;
  if char_length(trim(farm_name)) < 2 then raise exception 'Farm name is required'; end if;
  insert into public.farms(name) values (trim(farm_name)) returning id into new_farm_id;
  insert into public.farm_members(farm_id, user_id, role) values (new_farm_id, (select auth.uid()), 'Owner');
  return new_farm_id;
end;
$$;
revoke execute on function public.create_farm(text) from public, anon;
grant execute on function public.create_farm(text) to authenticated;

create function private.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin new.updated_at = now(); return new; end;
$$;

create trigger farms_updated_at before update on public.farms for each row execute function private.set_updated_at();
create trigger batches_updated_at before update on public.batches for each row execute function private.set_updated_at();
create trigger pigs_updated_at before update on public.pigs for each row execute function private.set_updated_at();
create trigger expenses_updated_at before update on public.expenses for each row execute function private.set_updated_at();
create trigger buyers_updated_at before update on public.buyers for each row execute function private.set_updated_at();
create trigger pig_sales_updated_at before update on public.pig_sales for each row execute function private.set_updated_at();
create trigger payments_updated_at before update on public.payments for each row execute function private.set_updated_at();

alter table public.farms enable row level security;
alter table public.farm_members enable row level security;
alter table public.batches enable row level security;
alter table public.pigs enable row level security;
alter table public.expenses enable row level security;
alter table public.buyers enable row level security;
alter table public.pig_sales enable row level security;
alter table public.payments enable row level security;

revoke all on all tables in schema public from anon;
grant select on public.farms, public.farm_members to authenticated;
grant select, insert, update, delete on public.batches, public.pigs, public.expenses, public.buyers, public.pig_sales, public.payments to authenticated;
grant insert, update, delete on public.farm_members to authenticated;

create policy farms_select on public.farms for select to authenticated using (id in (select private.user_farm_ids()));
create policy farms_update on public.farms for update to authenticated using (private.is_farm_owner(id)) with check (private.is_farm_owner(id));
create policy members_select on public.farm_members for select to authenticated using (farm_id in (select private.user_farm_ids()));
create policy members_insert on public.farm_members for insert to authenticated with check (private.is_farm_owner(farm_id));
create policy members_update on public.farm_members for update to authenticated using (private.is_farm_owner(farm_id) and user_id <> (select auth.uid())) with check (private.is_farm_owner(farm_id));
create policy members_delete on public.farm_members for delete to authenticated using (private.is_farm_owner(farm_id) and user_id <> (select auth.uid()));

create policy batches_all on public.batches for all to authenticated using (farm_id in (select private.user_farm_ids())) with check (farm_id in (select private.user_farm_ids()));
create policy pigs_all on public.pigs for all to authenticated using (farm_id in (select private.user_farm_ids())) with check (farm_id in (select private.user_farm_ids()));
create policy expenses_all on public.expenses for all to authenticated using (farm_id in (select private.user_farm_ids())) with check (farm_id in (select private.user_farm_ids()));
create policy buyers_all on public.buyers for all to authenticated using (farm_id in (select private.user_farm_ids())) with check (farm_id in (select private.user_farm_ids()));
create policy pig_sales_all on public.pig_sales for all to authenticated using (farm_id in (select private.user_farm_ids())) with check (farm_id in (select private.user_farm_ids()));
create policy payments_all on public.payments for all to authenticated using (farm_id in (select private.user_farm_ids())) with check (farm_id in (select private.user_farm_ids()));
