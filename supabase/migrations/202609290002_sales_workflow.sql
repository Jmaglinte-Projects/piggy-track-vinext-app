create function public.record_pig_sale(
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
  if target_farm_id not in (select private.user_farm_ids()) then raise exception 'Farm access denied'; end if;
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

create function public.delete_pig_sale(target_sale_id uuid)
returns void
language plpgsql
set search_path = ''
as $$
declare target_pig_id uuid; target_farm_id uuid;
begin
  select pig_id, farm_id into target_pig_id, target_farm_id from public.pig_sales where id = target_sale_id;
  if target_pig_id is null then raise exception 'Sale not found'; end if;
  delete from public.pig_sales where id = target_sale_id;
  update public.pigs set status = 'Active' where id = target_pig_id and farm_id = target_farm_id;
end;
$$;

create function public.record_payment(
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
  if target_farm_id not in (select private.user_farm_ids()) then raise exception 'Farm access denied'; end if;
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
