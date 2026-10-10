import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import { test } from "node:test";
import { PGlite } from "@electric-sql/pglite";
import { pgcrypto } from "@electric-sql/pglite/contrib/pgcrypto";

const owner = "20000000-0000-0000-0000-000000000001";
const viewer = "20000000-0000-0000-0000-000000000002";
const outsider = "20000000-0000-0000-0000-000000000003";
const farm = "20000000-0000-0000-0000-000000000004";
const otherFarm = "20000000-0000-0000-0000-000000000005";

test("farm investment migration supports setup before batches, isolates farms, protects writes and audits changes", async () => {
  const db = new PGlite({ extensions: { pgcrypto } });
  try {
    await db.exec(`create role anon; create role authenticated; create schema auth; create schema extensions;
      create extension pgcrypto with schema extensions;
      create table auth.users(id uuid primary key, email text);
      create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
      grant usage on schema auth to authenticated;`);
    const directory = new URL("../supabase/migrations/", import.meta.url);
    for (const file of (await readdir(directory)).filter((file) => file.endsWith(".sql")).sort())
      await db.exec(await readFile(new URL(file, directory), "utf8"));
    await db.exec(`insert into auth.users values ('${owner}','owner@example.test'),('${viewer}','viewer@example.test'),('${outsider}','other@example.test');
      insert into public.farms(id,name) values ('${farm}','Farm'),('${otherFarm}','Other farm');
      insert into public.farm_members(farm_id,user_id,role) values ('${farm}','${owner}','Owner'),('${farm}','${viewer}','Viewer'),('${otherFarm}','${outsider}','Owner');`);
    const signIn = (id: string) =>
      db.exec(`reset role; set role authenticated; set request.jwt.claim.sub = '${id}';`);
    const insert = `insert into public.farm_investments(farm_id,name,category,amount,investment_date) values ('${farm}','Pigpen','Construction',100000,'2026-10-10') returning id`;
    await signIn(owner);
    const id = (await db.query<{ id: string }>(insert)).rows[0].id;
    assert.equal((await db.query("select * from public.batches")).rows.length, 0);
    assert.equal((await db.query("select * from public.expenses")).rows.length, 0);
    await db.query("update public.farm_investments set amount=120000 where id=$1", [id]);
    const audit = (
      await db.query<{
        actor_user_id: string;
        old_data: { amount: number };
        new_data: { amount: number };
      }>(
        "select actor_user_id,old_data,new_data from public.farm_audit_log where table_name='farm_investments' and action='UPDATE'",
      )
    ).rows[0];
    assert.equal(audit.actor_user_id, owner);
    assert.equal(audit.old_data.amount, 100000);
    assert.equal(audit.new_data.amount, 120000);
    await assert.rejects(db.exec(insert.replace("100000", "0")), /check constraint/);
    await assert.rejects(db.exec(insert.replace("100000", "'NaN'")), /check constraint/);
    await assert.rejects(db.exec(insert.replace("'Pigpen'", "' '")), /check constraint/);
    await assert.rejects(
      db.exec(insert.replace("'Construction'", "'Invalid'")),
      /check constraint/,
    );
    await assert.rejects(
      db.exec(`update public.farm_investments set farm_id='${otherFarm}'`),
      /permission denied/,
    );
    await signIn(viewer);
    assert.equal((await db.query("select * from public.farm_investments")).rows.length, 1);
    await assert.rejects(db.exec(insert), /row-level security/);
    assert.equal(
      (await db.query("update public.farm_investments set amount=1 returning id")).rows.length,
      0,
    );
    assert.equal(
      (await db.query("delete from public.farm_investments returning id")).rows.length,
      0,
    );
    await signIn(outsider);
    assert.equal((await db.query("select * from public.farm_investments")).rows.length, 0);
    await assert.rejects(db.exec(insert), /row-level security/);
    assert.equal(
      (await db.query("update public.farm_investments set amount=1 returning id")).rows.length,
      0,
    );
    assert.equal(
      (await db.query("delete from public.farm_investments returning id")).rows.length,
      0,
    );
    await signIn(owner);
    await db.exec(`select public.remove_farm_member('${farm}','${viewer}')`);
    await signIn(viewer);
    assert.equal((await db.query("select * from public.farm_investments")).rows.length, 0);
    await signIn(owner);
    await db.query("delete from public.farm_investments where id=$1", [id]);
    assert.equal(
      (
        await db.query(
          "select * from public.farm_audit_log where table_name='farm_investments' and action='DELETE'",
        )
      ).rows.length,
      1,
    );
    await db.exec("reset role; set role anon; set request.jwt.claim.sub='';");
    await assert.rejects(db.exec("select * from public.farm_investments"), /permission denied/);
  } finally {
    await db.close();
  }
});
