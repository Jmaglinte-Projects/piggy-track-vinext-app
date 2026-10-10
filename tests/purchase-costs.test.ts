import assert from "node:assert/strict";
import { test } from "node:test";
import { LocalPiggyTrackRepository } from "@/infrastructure/repositories/local-piggy-track-repository";
import { calculateBatchExpenses } from "@/domain/calculations";
import { buildBatchReport } from "@/domain/reports";
import type { PiggyTrackData } from "@/domain/entities";

const batch = {
  id: "batch",
  name: "Test batch",
  startDate: "2026-10-01",
  endDate: null,
  status: "Active" as const,
  notes: "",
  createdAt: "",
  updatedAt: "",
};
const pig = {
  batchId: batch.id,
  tagNumber: "P1",
  purchasePrice: 3500,
  purchaseWeight: 20,
  currentWeight: 20,
  status: "Active" as const,
  notes: "",
};
const expense = {
  batchId: batch.id,
  category: "Feed" as const,
  description: "Feed",
  quantity: 1,
  unit: "sack",
  unitPrice: 1200,
  expenseDate: "2026-10-01",
  notes: "",
};
function repository(data: PiggyTrackData) {
  const storage = new Map([["piggytrack-demo-workspace-v2", JSON.stringify(data)]]);
  Object.defineProperty(globalThis, "window", {
    configurable: true,
    value: {
      localStorage: {
        getItem: (key: string) => storage.get(key) ?? null,
        setItem: (key: string, value: string) => storage.set(key, value),
      },
    },
  });
  return new LocalPiggyTrackRepository();
}
function empty(): PiggyTrackData {
  return {
    investments: [],
    batches: [{ ...batch }],
    pigs: [],
    expenses: [],
    buyers: [],
    sales: [],
    payments: [],
  };
}

test("purchase + operating costs agree with reports; editing and status changes count once", async () => {
  const repo = repository(empty());
  const saved = await repo.savePig(pig);
  await repo.saveExpense(expense);
  let data = (await repo.loadWorkspace()).data;
  assert.equal(calculateBatchExpenses(data.expenses), 4700);
  assert.equal(buildBatchReport(data, batch.id)?.totalExpenses, 4700);
  assert.equal(buildBatchReport(data, batch.id)?.netProfit, -4700);
  assert.equal(data.expenses.find((e) => e.pigId === saved.id)?.expenseDate, batch.startDate);
  for (const status of ["Sold", "Died", "Removed"] as const) {
    await repo.savePig({ ...pig, purchasePrice: 4000, status }, saved.id);
    data = (await repo.loadWorkspace()).data;
    assert.equal(data.expenses.filter((e) => e.pigId === saved.id).length, 1);
    assert.equal(calculateBatchExpenses(data.expenses), 5200);
  }
  const linked = data.expenses.find((e) => e.pigId === saved.id)!;
  await assert.rejects(repo.saveExpense({ ...expense, unitPrice: 1 }, linked.id), /protected/);
  await assert.rejects(repo.deleteExpense(linked.id), /protected/);
  await assert.rejects(repo.deletePig(saved.id), /Removed/);
  await assert.rejects(repo.saveExpense({ ...expense, category: "Piglets" }), /twice/);
  await assert.rejects(repo.savePig({ ...pig, purchasePrice: -1 }), /zero/);
});

test("legacy costs stay unchanged until explicit reconciliation and original entries remain as history", async () => {
  const initial = empty();
  initial.pigs = [{ ...pig, id: "legacy-pig" }];
  initial.expenses = [
    { ...expense, id: "old", category: "Piglets", unitPrice: 3600 },
    { ...expense, id: "feed" },
  ];
  const repo = repository(initial);
  let data = (await repo.loadWorkspace()).data;
  assert.equal(data.batches[0].purchaseCostsReconciled, false);
  assert.equal(calculateBatchExpenses(data.expenses), 4800);
  const missingPig = await repo.savePig({ ...pig, tagNumber: "P2" });
  assert.equal(calculateBatchExpenses((await repo.loadWorkspace()).data.expenses), 4800);
  await repo.deletePig(missingPig.id);
  await repo.savePig({ ...pig, purchasePrice: 3700 }, "legacy-pig");
  assert.equal(calculateBatchExpenses((await repo.loadWorkspace()).data.expenses), 4800);
  await repo.reconcilePigPurchases(batch.id);
  await repo.reconcilePigPurchases(batch.id);
  data = (await repo.loadWorkspace()).data;
  assert.equal(data.batches[0].purchaseCostsReconciled, true);
  assert.equal(data.expenses.find((e) => e.id === "old")?.superseded, true);
  assert.equal(data.expenses.find((e) => e.id === "old")?.unitPrice, 3600);
  assert.equal(calculateBatchExpenses(data.expenses), 4900);
  const report = buildBatchReport(data, batch.id)!;
  assert.equal(report.totalExpenses, 4900);
  assert.equal(report.averageCostPerPig, 4900);
  assert.equal(
    report.expenseBreakdown.reduce((sum, e) => sum + e.amount, 0),
    report.totalExpenses,
  );
  await assert.rejects(repo.deleteExpense("old"), /protected/);
});

test("clean legacy batches backfill once; zero-price pigs and other batches do not inflate totals", async () => {
  const initial = empty();
  initial.batches.push({ ...batch, id: "other" });
  initial.pigs = [
    { ...pig, id: "old-pig" },
    { ...pig, id: "free", purchasePrice: 0 },
    { ...pig, id: "other-pig", batchId: "other" },
  ];
  const repo = repository(initial);
  await repo.loadWorkspace();
  const data = (await repo.loadWorkspace()).data;
  assert.equal(data.expenses.length, 3);
  assert.equal(buildBatchReport(data, batch.id)?.totalExpenses, 3500);
  await assert.rejects(repo.savePig({ ...pig, batchId: "other" }, "old-pig"), /original batch/);
});

test("ten pigs at 3500 plus feed and medicine total 48000", async () => {
  const repo = repository(empty());
  for (let i = 0; i < 10; i++) await repo.savePig({ ...pig, tagNumber: `P${i + 1}` });
  await repo.saveExpense({ ...expense, unitPrice: 12000 });
  await repo.saveExpense({
    ...expense,
    category: "Medicine",
    description: "Medicine",
    unitPrice: 1000,
  });
  const data = (await repo.loadWorkspace()).data;
  assert.equal(calculateBatchExpenses(data.expenses), 48000);
  const report = buildBatchReport(data, batch.id)!;
  assert.equal(report.totalExpenses, 48000);
  assert.equal(report.averageCostPerPig, 4800);
  assert.equal(
    report.expenseBreakdown.find((entry) => entry.category === "Piglets")?.amount,
    35000,
  );
});
