import { WorkspaceAccessError } from "@/application/ports/piggy-track-repository";
import assert from "node:assert/strict";
import { test } from "node:test";
import { PiggyTrackApplication } from "@/application/piggy-track-application";
import type {
  PiggyTrackRepository,
  WorkspaceSnapshot,
} from "@/application/ports/piggy-track-repository";
import { mockData } from "@/infrastructure/local/mock-data";

test("application blocks every Viewer mutation and rechecks role after switching workspaces", async () => {
  let writes = 0;
  let role: "Owner" | "Viewer" = "Viewer";
  const snapshot = (): WorkspaceSnapshot => ({
    farmId: "farm",
    farmName: "Farm",
    farmRole: role,
    farms: [{ id: "farm", name: "Farm", role }],
    members: [],
    data: mockData,
  });
  const repository = new Proxy({} as PiggyTrackRepository, {
    get: (_target, key) =>
      key === "loadWorkspace"
        ? async () => snapshot()
        : async () => {
            writes++;
            return "farm";
          },
  });
  const app = new PiggyTrackApplication(repository, {
    getPreferredFarmId: () => undefined,
    setPreferredFarmId: () => {},
  });
  await app.loadWorkspace();
  const mutations = [
    () => app.saveBatch(mockData.batches[0]),
    () => app.deleteBatch("id"),
    () => app.savePig(mockData.pigs[0]),
    () => app.deletePig("id"),
    () => app.saveExpense(mockData.expenses[0]),
    () => app.deleteExpense("id"),
    () => app.saveBuyer(mockData.buyers[0]),
    () => app.deleteBuyer("id"),
    () => app.saveSale(mockData.sales[0]),
    () => app.deleteSale("id"),
    () => app.savePayment(mockData.payments[0]),
    () => app.deletePayment("id"),
    () => app.renameFarm("Changed"),
    () => app.removeFarmMember("id"),
    () => app.reconcilePigPurchases("id"),
  ];
  for (const mutate of mutations) await assert.rejects(mutate(), /read-only/);
  assert.throws(() => app.createFarmInvitation(), /read-only/);
  assert.equal(writes, 0);
  await app.switchFarm("farm");
  assert.equal(writes, 0);
  role = "Owner";
  await app.reloadWorkspace();
  await app.saveBatch(mockData.batches[0]);
  assert.equal(writes, 1);
  role = "Viewer";
  await app.switchFarm("farm");
  await assert.rejects(app.saveBatch(mockData.batches[0]), /read-only/);
  assert.equal(writes, 1);
  await app.acceptFarmInvitation("test-code");
  assert.equal(writes, 2, "Viewers may accept invitations to other farms");
  await assert.rejects(app.saveBatch(mockData.batches[0]), /read-only/);
});

test("revoked saved preferences fall back safely, while explicit inaccessible switches fail", async () => {
  const snapshot: WorkspaceSnapshot = {
    farmId: "available",
    farmName: "Farm",
    farmRole: "Viewer",
    farms: [{ id: "available", name: "Farm", role: "Viewer" }],
    members: [],
    data: mockData,
  };
  const repo = {
    loadWorkspace: async (id?: string) => {
      if (id === "removed") throw new WorkspaceAccessError();
      return snapshot;
    },
  } as PiggyTrackRepository;
  let preferred = "removed";
  const app = new PiggyTrackApplication(repo, {
    getPreferredFarmId: () => preferred,
    setPreferredFarmId: (id) => {
      preferred = id;
    },
  });
  assert.equal((await app.loadWorkspace()).farmId, "available");
  assert.equal(preferred, "available");
  await assert.rejects(app.switchFarm("removed"), WorkspaceAccessError);
  assert.equal(preferred, "available");
});
