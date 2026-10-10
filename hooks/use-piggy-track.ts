"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { createPiggyTrackApplication } from "@/infrastructure/composition-root";
import type {
  BatchInput,
  BuyerInput,
  ExpenseInput,
  InvestmentInput,
  FarmInvitation,
  PaymentInput,
  PigInput,
  SaleInput,
  WorkspaceSnapshot,
} from "@/application/ports/piggy-track-repository";

export interface PiggyTrackState {
  workspace: WorkspaceSnapshot | null;
  loading: boolean;
  saving: boolean;
  error: string | null;
  reload: () => Promise<void>;
  saveBatch: (input: BatchInput, id?: string) => Promise<void>;
  deleteBatch: (id: string) => Promise<void>;
  reconcilePigPurchases: (batchId: string) => Promise<void>;
  savePig: (input: PigInput, id?: string) => Promise<void>;
  deletePig: (id: string) => Promise<void>;
  saveExpense: (input: ExpenseInput, id?: string) => Promise<void>;
  deleteExpense: (id: string) => Promise<void>;
  saveInvestment: (input: InvestmentInput, id?: string) => Promise<void>;
  deleteInvestment: (id: string) => Promise<void>;
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
  const application = useMemo(() => createPiggyTrackApplication(), []);
  const [workspace, setWorkspace] = useState<WorkspaceSnapshot | null>(null);
  const [loading, setLoading] = useState(enabled);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    if (!enabled) return;
    setLoading(true);
    setError(null);
    try {
      setWorkspace(await application.loadWorkspace());
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to load PiggyTrack.");
    } finally {
      setLoading(false);
    }
  }, [application, enabled]);

  useEffect(() => {
    void reload();
  }, [reload]);

  const mutate = useCallback(async (operation: () => Promise<WorkspaceSnapshot>) => {
    setSaving(true);
    setError(null);
    try {
      setWorkspace(await operation());
    } catch (cause) {
      const message = cause instanceof Error ? cause.message : "Unable to save changes.";
      setError(message);
      throw cause;
    } finally {
      setSaving(false);
    }
  }, []);

  const switchFarm = useCallback(
    async (farmId: string) => {
      setSaving(true);
      setError(null);
      try {
        setWorkspace(await application.switchFarm(farmId));
      } catch (cause) {
        setError(cause instanceof Error ? cause.message : "Unable to switch farms.");
        throw cause;
      } finally {
        setSaving(false);
      }
    },
    [application],
  );

  const acceptFarmInvitation = useCallback(
    async (code: string) => {
      setSaving(true);
      setError(null);
      try {
        setWorkspace(await application.acceptFarmInvitation(code));
      } catch (cause) {
        setError(cause instanceof Error ? cause.message : "Unable to join farm.");
        throw cause;
      } finally {
        setSaving(false);
      }
    },
    [application],
  );

  return {
    workspace,
    loading,
    saving,
    error,
    reload,
    saveBatch: (input, id) => mutate(() => application.saveBatch(input, id)),
    deleteBatch: (id) => mutate(() => application.deleteBatch(id)),
    reconcilePigPurchases: (batchId) => mutate(() => application.reconcilePigPurchases(batchId)),
    savePig: (input, id) => mutate(() => application.savePig(input, id)),
    deletePig: (id) => mutate(() => application.deletePig(id)),
    saveExpense: (input, id) => mutate(() => application.saveExpense(input, id)),
    deleteExpense: (id) => mutate(() => application.deleteExpense(id)),
    saveInvestment: (input, id) => mutate(() => application.saveInvestment(input, id)),
    deleteInvestment: (id) => mutate(() => application.deleteInvestment(id)),
    saveBuyer: (input, id) => mutate(() => application.saveBuyer(input, id)),
    deleteBuyer: (id) => mutate(() => application.deleteBuyer(id)),
    saveSale: (input, id) => mutate(() => application.saveSale(input, id)),
    deleteSale: (id) => mutate(() => application.deleteSale(id)),
    savePayment: (input, id) => mutate(() => application.savePayment(input, id)),
    deletePayment: (id) => mutate(() => application.deletePayment(id)),
    switchFarm,
    renameFarm: (name) => mutate(() => application.renameFarm(name)),
    createFarmInvitation: () => application.createFarmInvitation(),
    acceptFarmInvitation,
    removeFarmMember: (userId) => mutate(() => application.removeFarmMember(userId)),
  };
}
