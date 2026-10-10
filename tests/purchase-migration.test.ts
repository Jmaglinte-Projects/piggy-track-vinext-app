import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { test } from "node:test";
import { PGlite } from "@electric-sql/pglite";

const farm = "00000000-0000-0000-0000-000000000001";
const batch = "00000000-0000-0000-0000-000000000002";
const legacyBatch = "00000000-0000-0000-0000-000000000003";
const pig = "00000000-0000-0000-0000-000000000004";
const legacyPig = "00000000-0000-0000-0000-000000000005";
const user = "00000000-0000-0000-0000-000000000006";

test("PostgreSQL migration backfill, triggers, history protection, reconciliation, and farm isolation", async () => {
  const db = new PGlite();
  try {
    await db.exec(`
      create role anon; create role authenticated;
      create schema auth;
      create table auth.users(id uuid primary key);
      create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
      grant usage on schema auth to authenticated;
    `);
    // gen_random_uuid is built into PostgreSQL. The WASM test DB has no pgcrypto extension.
    const initial = await readFile(
      new URL("../supabase/migrations/202609290001_initial_schema.sql", import.meta.url),
      "utf8",
    );
    await db.exec(initial.replace("create extension if not exists pgcrypto;", ""));
    await db.exec(`
      insert into auth.users values ('${user}');
      insert into public.farms(id,name) values ('${farm}','Test farm');
      insert into public.farm_members(farm_id,user_id,role) values ('${farm}','${user}','Owner');
      insert into public.batches(id,farm_id,name,start_date) values ('${batch}','${farm}','Clean batch','2026-10-01'), ('${legacyBatch}','${farm}','Legacy batch','2026-10-01');
      insert into public.pigs(id,farm_id,batch_id,tag_number,purchase_price,purchase_weight,current_weight) values ('${pig}','${farm}','${batch}','P1',3500,20,20), ('${legacyPig}','${farm}','${legacyBatch}','P2',3500,20,20);
      insert into public.expenses(farm_id,batch_id,category,description,quantity,unit,unit_price,expense_date) values ('${farm}','${legacyBatch}','Piglets','Original purchase',1,'head',3600,'2026-10-01');
    `);
    await db.exec(
      await readFile(
        new URL(
          "../supabase/migrations/202610100001_link_pig_purchase_expenses.sql",
          import.meta.url,
        ),
        "utf8",
      ),
    );
    await db.exec(`set role authenticated; set request.jwt.claim.sub = '${user}';`);
    const total = async (id: string) =>
      Number(
        (
          await db.query<{ total: string }>(
            "select coalesce(sum(quantity * unit_price),0)::text as total from public.expenses where batch_id = $1 and not superseded",
            [id],
          )
        ).rows[0].total,
      );
    assert.equal(await total(batch), 3500);
    assert.equal(await total(legacyBatch), 3600);
    await db.exec(
      `update public.pigs set purchase_price = 4000, status = 'Died' where id = '${pig}';`,
    );
    assert.equal(await total(batch), 4000);
    await assert.rejects(
      db.exec(`update public.expenses set unit_price = 1 where pig_id = '${pig}';`),
      /protected/,
    );
    await assert.rejects(db.exec(`delete from public.pigs where id = '${pig}';`), /foreign key/);
    await assert.rejects(
      db.exec(
        `insert into public.expenses(farm_id,batch_id,category,description,quantity,unit,unit_price,expense_date) values ('${farm}','${batch}','Piglets','Duplicate',1,'head',4000,'2026-10-01');`,
      ),
      /twice/,
    );
    await db.exec(
      `insert into public.pigs(farm_id,batch_id,tag_number,purchase_price,purchase_weight,current_weight) values ('${farm}','${legacyBatch}','P3',3500,20,20);`,
    );
    assert.equal(await total(legacyBatch), 3600);
    await db.exec(
      `delete from public.pigs where batch_id = '${legacyBatch}' and tag_number = 'P3';`,
    );
    await db.exec(`update public.pigs set purchase_price = 3700 where id = '${legacyPig}';`);
    assert.equal(await total(legacyBatch), 3600);
    await db.query("select public.reconcile_pig_purchases($1)", [legacyBatch]);
    await db.query("select public.reconcile_pig_purchases($1)", [legacyBatch]);
    assert.equal(await total(legacyBatch), 3700);
    const history = await db.query<{ unit_price: string; superseded: boolean }>(
      "select unit_price::text, superseded from public.expenses where batch_id = $1 and pig_id is null",
      [legacyBatch],
    );
    assert.deepEqual(history.rows, [{ unit_price: "3600.00", superseded: true }]);
    await assert.rejects(
      db.exec(`delete from public.expenses where batch_id = '${legacyBatch}' and superseded;`),
      /protected/,
    );
    await db.exec(
      `insert into public.pigs(farm_id,batch_id,tag_number,purchase_price,purchase_weight,current_weight) values ('${farm}','${batch}','P4',3500,20,20);`,
    );
    assert.equal(await total(batch), 7500);
    await assert.rejects(
      db.exec(`update public.pigs set batch_id = '${legacyBatch}' where id = '${pig}';`),
      /original batch/,
    );
    await assert.rejects(
      db.exec(`update public.batches set purchase_costs_reconciled = false where id = '${batch}';`),
      /reversed/,
    );
    await db.exec("set request.jwt.claim.sub = '00000000-0000-0000-0000-000000000099';");
    await assert.rejects(
      db.query("select public.reconcile_pig_purchases($1)", [batch]),
      /access denied/,
    );
    assert.equal((await db.query("select * from public.expenses")).rows.length, 0);
  } finally {
    await db.close();
  }
});
