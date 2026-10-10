export type BatchStatus = "Active" | "Completed" | "Archived";
export type PigStatus = "Active" | "Sold" | "Died" | "Removed";

export type ExpenseCategory =
  | "Piglets"
  | "Feed"
  | "Vitamins"
  | "Medicine"
  | "Vaccines"
  | "Pig House Repair"
  | "Labor"
  | "Transportation"
  | "Water"
  | "Electricity"
  | "Other";

export type FeedType = "Pre Starter" | "Starter" | "Starter Premium" | "Grower" | "Finisher";

export interface Batch {
  id: string;
  name: string;
  startDate: string;
  endDate: string | null;
  status: BatchStatus;
  notes: string;
  purchaseCostsReconciled?: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Pig {
  id: string;
  batchId: string;
  tagNumber: string;
  purchasePrice: number;
  purchaseWeight: number;
  currentWeight: number;
  status: PigStatus;
  notes: string;
}

export interface Expense {
  pigId?: string;
  superseded?: boolean;
  id: string;
  batchId: string;
  category: ExpenseCategory;
  description: string;
  quantity: number;
  unit: string;
  unitPrice: number;
  expenseDate: string;
  notes: string;
  feedType?: FeedType;
}

export interface Buyer {
  id: string;
  name: string;
  contactInformation: string;
  notes: string;
}

export interface PigSale {
  id: string;
  pigId: string;
  batchId: string;
  buyerId: string;
  actualWeight: number;
  weightDeduction: number;
  pricePerKg: number;
  saleDate: string;
  paymentDueDate: string;
  notes: string;
}

export interface Payment {
  id: string;
  saleId: string;
  amount: number;
  paymentDate: string;
  paymentMethod: "Cash" | "Bank Transfer" | "GCash" | "Other";
  notes: string;
}

export interface FarmInvestment {
  id: string;
  name: string;
  category: "Construction" | "Water Systems" | "Fencing" | "Equipment" | "Other";
  amount: number;
  investmentDate: string;
  notes: string;
}

export interface PiggyTrackData {
  investments: FarmInvestment[];
  batches: Batch[];
  pigs: Pig[];
  expenses: Expense[];
  buyers: Buyer[];
  sales: PigSale[];
  payments: Payment[];
}
