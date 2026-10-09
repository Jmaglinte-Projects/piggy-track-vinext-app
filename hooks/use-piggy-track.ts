"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { createRepository } from "@/services/repository";
import type { BatchInput, BuyerInput, ExpenseInput, FarmInvitation, PaymentInput, PigInput, SaleInput, WorkspaceSnapshot } from "@/services/piggy-track-repository";

const preferredFarmKey = "piggytrack-preferred-farm";

export interface PiggyTrackState {
  workspace: WorkspaceSnapshot | null;
  loading: boolean;
  saving: boolean;
  error: string | null;
  reload: () => Promise<void>;
  saveBatch: (input: BatchInput, id?: string) => Promise<void>;
  deleteBatch: (id: string) => Promise<void>;
  savePig: (input: PigInput, id?: string) => Promise<void>;
  deletePig: (id: string) => Promise<void>;
  saveExpense: (input: ExpenseInput, id?: string) => Promise<void>;
  deleteExpense: (id: string) => Promise<void>;
  saveBuyer: (input: BuyerInput, id?: string) => Promise<void>;
  deleteBuyer: (id: string) => Promise<void>;
  saveSale: (input: SaleInput, id?: string) => Promise<void>;
  deleteSale: (id: string) => Promise<void>;
  savePayment: (input: PaymentInput, id?: string) => Promise<void>;
  deletePayment: (id: string) => Promise<void>;
  switchFarm: (farmId: string) => Promise<void>;
  renameFarm: (name: string) => Promise<void>;
  createFarmInvitation: () => Promise<FarmInvitation>;
  acceptFarmInvitation: (code: string) => Promise<void>;
  removeFarmMember: (userId: string) => Promise<void>;
}

export function usePiggyTrack(enabled: boolean): PiggyTrackState {
  const repository = useMemo(() => createRepository(), []);
  const [workspace, setWorkspace] = useState<WorkspaceSnapshot | null>(null);
  const [loading, setLoading] = useState(enabled);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    if (!enabled) return;
    setLoading(true); setError(null);
    try { setWorkspace(await repository.loadWorkspace(window.localStorage.getItem(preferredFarmKey) ?? undefined)); }
    catch (cause) { setError(cause instanceof Error ? cause.message : "Unable to load PiggyTrack."); }
    finally { setLoading(false); }
  }, [enabled, repository]);

  useEffect(() => { void reload(); }, [reload]);

  const mutate = useCallback(async (operation: () => Promise<unknown>) => {
    setSaving(true); setError(null);
    try { await operation(); setWorkspace(await repository.loadWorkspace()); }
    catch (cause) { const message = cause instanceof Error ? cause.message : "Unable to save changes."; setError(message); throw cause; }
    finally { setSaving(false); }
  }, [repository]);

  const switchFarm = useCallback(async (farmId: string) => {
    setSaving(true); setError(null);
    try { const next = await repository.loadWorkspace(farmId); window.localStorage.setItem(preferredFarmKey, next.farmId); setWorkspace(next); }
    catch (cause) { setError(cause instanceof Error ? cause.message : "Unable to switch farms."); throw cause; }
    finally { setSaving(false); }
  }, [repository]);

  const acceptFarmInvitation = useCallback(async (code: string) => {
    setSaving(true); setError(null);
    try { const farmId = await repository.acceptFarmInvitation(code); const next = await repository.loadWorkspace(farmId); window.localStorage.setItem(preferredFarmKey, farmId); setWorkspace(next); }
    catch (cause) { setError(cause instanceof Error ? cause.message : "Unable to join farm."); throw cause; }
    finally { setSaving(false); }
  }, [repository]);

  return {
    workspace, loading, saving, error, reload,
    saveBatch: (input, id) => mutate(() => repository.saveBatch(input, id)),
    deleteBatch: (id) => mutate(() => repository.deleteBatch(id)),
    savePig: (input, id) => mutate(() => repository.savePig(input, id)),
    deletePig: (id) => mutate(() => repository.deletePig(id)),
    saveExpense: (input, id) => mutate(() => repository.saveExpense(input, id)),
    deleteExpense: (id) => mutate(() => repository.deleteExpense(id)),
    saveBuyer: (input, id) => mutate(() => repository.saveBuyer(input, id)),
    deleteBuyer: (id) => mutate(() => repository.deleteBuyer(id)),
    saveSale: (input, id) => mutate(() => repository.saveSale(input, id)),
    deleteSale: (id) => mutate(() => repository.deleteSale(id)),
    savePayment: (input, id) => mutate(() => repository.savePayment(input, id)),
    deletePayment: (id) => mutate(() => repository.deletePayment(id)),
    switchFarm,
    renameFarm: (name) => mutate(() => repository.renameFarm(name)),
    createFarmInvitation: () => repository.createFarmInvitation(),
    acceptFarmInvitation,
    removeFarmMember: (userId) => mutate(() => repository.removeFarmMember(userId)),
  };
}
