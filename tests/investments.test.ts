import assert from "node:assert/strict";
import { test } from "node:test";
import { validateInvestment, buildInvestmentReport } from "@/domain/investments";
import { buildBatchReport } from "@/domain/reports";
import { PiggyTrackApplication } from "@/application/piggy-track-application";
import type {
  PiggyTrackRepository,
  WorkspaceSnapshot,
} from "@/application/ports/piggy-track-repository";
import { LocalPiggyTrackRepository } from "@/infrastructure/repositories/local-piggy-track-repository";
import { mockData } from "@/infrastructure/local/mock-data";

const input = {
  name: "Pigpen",
  category: "Construction" as const,
  amount: 100000,
  investmentDate: "2026-10-10",
  notes: "Foundation and roof",
};

test("investment validation rejects invalid amounts, names, categories and dates", () => {
  validateInvestment(input);
  validateInvestment({ ...input, amount: 0.01, investmentDate: "2024-02-29" });
  for (const amount of [0, -1, NaN, Infinity, 0.001, 10000000000])
    assert.throws(() => validateInvestment({ ...input, amount }), /Amount/);
  for (const investmentDate of [
    "",
    "2026-02-29",
    "2026-04-31",
    "2026-1-01",
    "2026-13-10",
    "0000-01-01",
  ])
    assert.throws(() => validateInvestment({ ...input, investmentDate }), /date/);
  for (const name of ["  ", "x".repeat(121)])
    assert.throws(() => validateInvestment({ ...input, name }), /name/);
  assert.throws(
    () => validateInvestment({ ...input, category: "Invalid" as typeof input.category }),
    /category/,
  );
});

test("farm investment totals use cents and never change batch expenses, profit or ROI", () => {
  assert.deepEqual(buildInvestmentReport([]), {
    totalInvested: 0,
    recordCount: 0,
    categoryBreakdown: [],
  });
  const before = buildBatchReport(mockData, mockData.batches[0].id);
  const data = {
    ...mockData,
    investments: [
      { ...input, id: "one" },
      { ...input, id: "two", amount: 0.1 },
      { ...input, id: "three", amount: 0.2 },
    ],
  };
  assert.deepEqual(buildBatchReport(data, mockData.batches[0].id), before);
  assert.equal(buildInvestmentReport(data.investments).totalInvested, 100000.3);
  assert.deepEqual(buildInvestmentReport(data.investments).categoryBreakdown, [
    { category: "Construction", amount: 100000.3 },
  ]);
});

test("local investment records persist, edit and delete before the first batch; legacy data loads", async () => {
  const legacy = { batches: [], pigs: [], expenses: [], buyers: [], sales: [], payments: [] };
  const storage = new Map([["piggytrack-demo-workspace-v2", JSON.stringify(legacy)]]);
  Object.defineProperty(globalThis, "window", {
    configurable: true,
    value: {
      localStorage: {
        getItem: (key: string) => storage.get(key) ?? null,
        setItem: (key: string, value: string) => storage.set(key, value),
      },
    },
  });
  const repo = new LocalPiggyTrackRepository();
  assert.deepEqual((await repo.loadWorkspace()).data.investments, []);
  const saved = await repo.saveInvestment(input);
  await repo.saveInvestment({ ...input, amount: 120000 }, saved.id);
  const data = (await new LocalPiggyTrackRepository().loadWorkspace()).data;
  assert.equal(data.investments[0].amount, 120000);
  assert.deepEqual(data.batches, []);
  assert.deepEqual(data.expenses, []);
  await assert.rejects(repo.saveInvestment({ ...input, amount: -10 }), /Amount/);
  await assert.rejects(repo.saveInvestment(input, "missing"), /not found/);
  await assert.rejects(repo.deleteInvestment("missing"), /not found/);
  assert.equal((await repo.loadWorkspace()).data.investments.length, 1);
  await repo.deleteInvestment(saved.id);
  assert.deepEqual((await repo.loadWorkspace()).data.investments, []);
});

test("application validates before writing and reloads investment changes; failures propagate", async () => {
  const calls: string[] = [];
  const workspace: WorkspaceSnapshot = {
    farmId: "farm",
    farmName: "Farm",
    farmRole: "Owner",
    farms: [],
    members: [],
    data: { ...mockData, investments: [] },
  };
  const repo = {
    loadWorkspace: async () => {
      calls.push("load");
      return workspace;
    },
    saveInvestment: async (value: typeof input, id?: string) => {
      calls.push("save");
      workspace.data.investments = [{ ...value, id: id ?? "saved" }];
      return workspace.data.investments[0];
    },
    deleteInvestment: async () => {
      throw new Error("Storage unavailable");
    },
  } as unknown as PiggyTrackRepository;
  const app = new PiggyTrackApplication(repo, {
    getPreferredFarmId: () => undefined,
    setPreferredFarmId: () => {},
  });
  await app.loadWorkspace();
  await assert.rejects(app.saveInvestment({ ...input, amount: 0 }), /Amount/);
  assert.deepEqual(calls, ["load"]);
  assert.equal((await app.saveInvestment(input)).data.investments[0].amount, 100000);
  assert.deepEqual(calls, ["load", "save", "load"]);
  await assert.rejects(app.deleteInvestment("saved"), /Storage unavailable/);
  assert.deepEqual(calls, ["load", "save", "load"]);
});
