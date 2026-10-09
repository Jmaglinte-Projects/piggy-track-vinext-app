import type { Batch, Buyer, Expense, Payment, Pig, PigSale, PiggyTrackData } from "@/types/domain";

export interface WorkspaceSnapshot {
  farmId: string;
  farmName: string;
  farmRole: FarmRole;
  farms: FarmWorkspace[];
  members: FarmMember[];
  data: PiggyTrackData;
}

export type FarmRole = "Owner" | "Member";
export interface FarmWorkspace { id: string; name: string; role: FarmRole }
export interface FarmMember { userId: string; email: string; role: FarmRole; joinedAt: string }
export interface FarmInvitation { code: string; expiresAt: string }

export type BatchInput = Omit<Batch, "id" | "createdAt" | "updatedAt">;
export type PigInput = Omit<Pig, "id">;
export type ExpenseInput = Omit<Expense, "id">;
export type BuyerInput = Omit<Buyer, "id">;
export type SaleInput = Omit<PigSale, "id">;
export type PaymentInput = Omit<Payment, "id">;

export interface PiggyTrackRepository {
  loadWorkspace(farmId?: string): Promise<WorkspaceSnapshot>;
  renameFarm(name: string): Promise<void>;
  createFarmInvitation(): Promise<FarmInvitation>;
  acceptFarmInvitation(code: string): Promise<string>;
  removeFarmMember(userId: string): Promise<void>;
  saveBatch(input: BatchInput, id?: string): Promise<Batch>;
  deleteBatch(id: string): Promise<void>;
  savePig(input: PigInput, id?: string): Promise<Pig>;
  deletePig(id: string): Promise<void>;
  saveExpense(input: ExpenseInput, id?: string): Promise<Expense>;
  deleteExpense(id: string): Promise<void>;
  saveBuyer(input: BuyerInput, id?: string): Promise<Buyer>;
  deleteBuyer(id: string): Promise<void>;
  saveSale(input: SaleInput, id?: string): Promise<PigSale>;
  deleteSale(id: string): Promise<void>;
  savePayment(input: PaymentInput, id?: string): Promise<Payment>;
  deletePayment(id: string): Promise<void>;
}
