import type { BatchStatus, ExpenseCategory, FeedType, PigStatus } from "@/domain/entities";

export const batchStatuses: readonly BatchStatus[] = ["Active", "Completed", "Archived"];
export const pigStatuses: readonly PigStatus[] = ["Active", "Sold", "Died", "Removed"];
export const expenseCategories: readonly ExpenseCategory[] = [
  "Piglets",
  "Feed",
  "Vitamins",
  "Medicine",
  "Vaccines",
  "Pig House Repair",
  "Labor",
  "Transportation",
  "Water",
  "Electricity",
  "Other",
];
export const feedTypes: readonly FeedType[] = ["Pre Starter", "Starter", "Starter Premium", "Grower", "Finisher"];
