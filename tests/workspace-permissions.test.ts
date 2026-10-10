import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import { test } from "node:test";
import { PGlite } from "@electric-sql/pglite";
import { pgcrypto } from "@electric-sql/pglite/contrib/pgcrypto";

const owner = "10000000-0000-0000-0000-000000000001";
const viewer = "10000000-0000-0000-0000-000000000002";
const outsider = "10000000-0000-0000-0000-000000000003";
const farm = "10000000-0000-0000-0000-000000000004";
const otherFarm = "10000000-0000-0000-0000-000000000005";
const batch = "10000000-0000-0000-0000-000000000006";
const pig = "10000000-0000-0000-0000-000000000007";
const buyer = "10000000-0000-0000-0000-000000000008";

test("workspace permission migration enforces roles, isolates farms, and records protected history", async (t) => {
  const db = new PGlite({ extensions: { pgcrypto } });
  try {
    await db.exec(`
      create role anon; create role authenticated; create schema auth;
      create schema extensions; create extension pgcrypto with schema extensions;
      create table auth.users(id uuid primary key, email text);
      create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
      grant usage on schema auth to authenticated;
    `);
    const directory = new URL("../supabase/migrations/", import.meta.url);
    const migrations = (await readdir(directory)).filter((file) => file.endsWith(".sql")).sort();
    for (const file of migrations.filter(
      (file) => file < "202610100002_workspace_permissions.sql",
    )) {
      await db.exec(await readFile(new URL(file, directory), "utf8"));
    }
    // Seed pre-migration Member data, reproducing two membership rows for one shared farm.
    await db.exec(`
      insert into auth.users values ('${owner}','owner@example.test'), ('${viewer}','viewer@example.test'), ('${outsider}','other@example.test');
      insert into public.farms(id,name) values ('${farm}','Shared farm'),('${otherFarm}','Other farm');
      insert into public.farm_members(farm_id,user_id,role) values ('${farm}','${owner}','Owner'),('${farm}','${viewer}','Member'),('${otherFarm}','${outsider}','Owner');
    `);
    await db.exec(
      await readFile(new URL("202610100002_workspace_permissions.sql", directory), "utf8"),
    );
    for (const file of migrations.filter(
      (file) => file > "202610100002_workspace_permissions.sql",
    )) {
      await db.exec(await readFile(new URL(file, directory), "utf8"));
    }
    const signIn = (id: string) =>
      db.exec(`set role authenticated; set request.jwt.claim.sub = '${id}';`);
    await signIn(owner);
    await db.exec(`
      insert into public.batches(id,farm_id,name,start_date) values ('${batch}','${farm}','Batch one','2026-10-01');
      insert into public.pigs(id,farm_id,batch_id,tag_number,purchase_price,purchase_weight,current_weight) values ('${pig}','${farm}','${batch}','P1',3500,20,20);
      insert into public.expenses(farm_id,batch_id,category,description,quantity,unit,unit_price,expense_date) values ('${farm}','${batch}','Medicine','Medicine',1,'item',1000,'2026-10-01');
      insert into public.buyers(id,farm_id,name) values ('${buyer}','${farm}','Buyer');
    `);
    const sale = (
      await db.query<{ id: string }>(
        `select public.record_pig_sale(null,'${farm}','${batch}','${pig}','${buyer}',100,0,200,'2026-10-10','2026-10-11','') as id`,
      )
    ).rows[0].id;
    await db.exec(
      `select public.record_payment(null,'${farm}','${sale}',1000,'2026-10-10','Cash','');`,
    );

    await t.test(
      "one workspace per user with their own role and idempotent bootstrap",
      async () => {
        assert.deepEqual((await db.query("select * from public.list_my_farms()")).rows, [
          { id: farm, name: "Shared farm", role: "Owner" },
        ]);
        await signIn(viewer);
        assert.deepEqual((await db.query("select * from public.list_my_farms()")).rows, [
          { id: farm, name: "Shared farm", role: "Viewer" },
        ]);
        assert.equal((await db.query("select * from public.farm_members")).rows.length, 1);
        assert.equal(
          (await db.query<{ id: string }>("select public.ensure_farm_workspace() as id")).rows[0]
            .id,
          farm,
        );
      },
    );

    const inserts: Record<string, string> = {
      batches: `insert into public.batches(farm_id,name,start_date) values ('${farm}','Forbidden','2026-10-01')`,
      pigs: `insert into public.pigs(farm_id,batch_id,tag_number,purchase_price,purchase_weight,current_weight) values ('${farm}','${batch}','P2',3500,20,20)`,
      expenses: `insert into public.expenses(farm_id,batch_id,category,description,quantity,unit,unit_price,expense_date) values ('${farm}','${batch}','Medicine','Forbidden',1,'item',10,'2026-10-10')`,
      buyers: `insert into public.buyers(farm_id,name) values ('${farm}','Forbidden')`,
      pig_sales: `insert into public.pig_sales(farm_id,batch_id,pig_id,buyer_id,actual_weight,price_per_kg,sale_date,payment_due_date) values ('${farm}','${batch}','${pig}','${buyer}',100,200,'2026-10-10','2026-10-11')`,
      payments: `insert into public.payments(farm_id,sale_id,amount,payment_date,payment_method) values ('${farm}','${sale}',10,'2026-10-10','Cash')`,
    };
    await t.test(
      "Viewers can read every operational table but cannot insert, update, or delete",
      async () => {
        await signIn(viewer);
        for (const [table, insert] of Object.entries(inserts)) {
          assert.ok((await db.query(`select * from public.${table}`)).rows.length > 0, table);
          await assert.rejects(db.exec(insert), /row-level security/, table);
          assert.equal(
            (await db.query(`update public.${table} set notes = 'Forbidden' returning id`)).rows
              .length,
            0,
            table,
          );
          assert.equal(
            (await db.query(`delete from public.${table} returning id`)).rows.length,
            0,
            table,
          );
        }
        assert.equal(
          (await db.query("update public.farms set name = 'Forbidden' returning id")).rows.length,
          0,
        );
        await assert.rejects(
          db.exec(`update public.farm_members set role = 'Owner' where user_id = '${viewer}'`),
          /permission denied/,
        );
        await assert.rejects(
          db.exec(`insert into public.farm_members values ('${farm}','${outsider}','Owner',now())`),
          /permission denied/,
        );
        await assert.rejects(
          db.exec(`delete from public.farm_members where user_id = '${owner}'`),
          /permission denied/,
        );
      },
    );

    await t.test(
      "Viewer RPC calls cannot write, reconcile, invite, remove members, or expose the directory",
      async () => {
        await signIn(viewer);
        const calls = [
          `select public.record_pig_sale(null,'${farm}','${batch}','${pig}','${buyer}',100,0,200,'2026-10-10','2026-10-11','')`,
          `select public.record_payment(null,'${farm}','${sale}',1,'2026-10-10','Cash','')`,
          `select public.delete_pig_sale('${sale}')`,
          `select public.reconcile_pig_purchases('${batch}')`,
          `select public.create_farm_invitation('${farm}')`,
          `select public.remove_farm_member('${farm}','${owner}')`,
          `select public.list_farm_members('${farm}')`,
        ];
        for (const call of calls) await assert.rejects(db.exec(call), /Only farm owners/);
      },
    );

    await t.test(
      "Owners can edit records; audit logs preserve actor and values and cannot be forged",
      async () => {
        await signIn(owner);
        assert.equal(
          (await db.query("select * from public.list_farm_members($1)", [farm])).rows.length,
          2,
        );
        await db.exec(`update public.pigs set purchase_price = 4000 where id = '${pig}';`);
        const entry = (
          await db.query<{
            actor_user_id: string;
            old_data: { purchase_price: number };
            new_data: { purchase_price: number };
          }>(
            "select actor_user_id,old_data,new_data from public.farm_audit_log where table_name = 'pigs' and action = 'UPDATE' order by id desc limit 1",
          )
        ).rows[0];
        assert.equal(entry.actor_user_id, owner);
        assert.equal(entry.old_data.purchase_price, 3500);
        assert.equal(entry.new_data.purchase_price, 4000);
        assert.equal(
          Number(
            (
              await db.query<{ amount: string }>(
                "select unit_price::text as amount from public.expenses where pig_id = $1",
                [pig],
              )
            ).rows[0].amount,
          ),
          4000,
        );
        for (const statement of [
          "delete from public.farm_audit_log",
          "update public.farm_audit_log set action='DELETE'",
          `insert into public.farm_audit_log(farm_id,table_name,record_id,action) values ('${farm}','pigs','fake','INSERT')`,
        ]) {
          await assert.rejects(db.exec(statement), /permission denied/);
        }
        await signIn(viewer);
        assert.equal((await db.query("select * from public.farm_audit_log")).rows.length, 0);
      },
    );

    await t.test(
      "invites grant Viewer access, revocation is immediate, and other owners cannot access this farm",
      async () => {
        await signIn(owner);
        const invite = (
          await db.query<{ invitation: { code: string } }>(
            "select public.create_farm_invitation($1) as invitation",
            [farm],
          )
        ).rows[0].invitation;
        await signIn(outsider);
        for (const table of Object.keys(inserts))
          assert.equal(
            (await db.query(`select * from public.${table} where farm_id = '${farm}'`)).rows.length,
            0,
          );
        await assert.rejects(
          db.exec(`select public.create_farm_invitation('${farm}')`),
          /Only farm owners/,
        );
        await assert.rejects(
          db.exec(`select public.reconcile_pig_purchases('${batch}')`),
          /Only farm owners/,
        );
        await db.query("select public.accept_farm_invitation($1)", [invite.code]);
        const farms = (
          await db.query<{ id: string; role: string }>("select * from public.list_my_farms()")
        ).rows;
        assert.equal(farms.length, 2);
        assert.equal(farms.find((row) => row.id === farm)?.role, "Viewer");
        await assert.rejects(db.exec(inserts.buyers), /row-level security/);
        await signIn(owner);
        await db.query("select public.remove_farm_member($1,$2)", [farm, outsider]);
        await assert.rejects(
          db.query("select public.remove_farm_member($1,$2)", [farm, owner]),
          /cannot remove themselves/,
        );
        await signIn(outsider);
        assert.equal(
          (await db.query(`select * from public.pigs where farm_id = '${farm}'`)).rows.length,
          0,
        );
        await assert.rejects(db.exec(inserts.buyers), /row-level security/);
      },
    );

    await t.test(
      "new-user bootstrap creates one personal farm; anonymous access is denied",
      async () => {
        await db.exec(
          "reset role; insert into auth.users values ('10000000-0000-0000-0000-000000000099','new@example.test');",
        );
        await signIn("10000000-0000-0000-0000-000000000099");
        const first = (
          await db.query<{ id: string }>("select public.ensure_farm_workspace() as id")
        ).rows[0].id;
        assert.equal(
          (await db.query<{ id: string }>("select public.ensure_farm_workspace() as id")).rows[0]
            .id,
          first,
        );
        assert.equal((await db.query("select * from public.list_my_farms()")).rows.length, 1);
        await db.exec("reset role; set role anon; set request.jwt.claim.sub = ''; ");
        await assert.rejects(db.exec("select public.list_my_farms()"), /permission denied/);
        await assert.rejects(db.exec("select public.ensure_farm_workspace()"), /permission denied/);
        for (const table of Object.keys(inserts))
          await assert.rejects(db.exec(`select * from public.${table}`), /permission denied/);
      },
    );
  } finally {
    await db.close();
  }
});
