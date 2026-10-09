import type { BatchStatus, ExpenseCategory, FeedType, PigStatus } from "@/types/domain";

export const batchStatuses: BatchStatus[] = ["Active", "Completed", "Archived"];
export const pigStatuses: PigStatus[] = ["Active", "Sold", "Died", "Removed"];
export const expenseCategories: ExpenseCategory[] = ["Piglets", "Feed", "Vitamins", "Medicine", "Vaccines", "Pig House Repair", "Labor", "Transportation", "Water", "Electricity", "Other"];
export const feedTypes: FeedType[] = ["Pre Starter", "Starter", "Starter Premium", "Grower", "Finisher"];

export function formString(data: FormData, key: string): string {
  return String(data.get(key) ?? "").trim();
}

export function formNumber(data: FormData, key: string): number {
  const value = Number(data.get(key));
  if (!Number.isFinite(value)) throw new Error(`${key} must be a number.`);
  return value;
}
