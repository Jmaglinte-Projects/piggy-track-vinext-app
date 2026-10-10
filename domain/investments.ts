import type { FarmInvestment } from "@/domain/entities";

export const investmentCategories = [
  "Construction",
  "Water Systems",
  "Fencing",
  "Equipment",
  "Other",
] as const;

export function validateInvestment(input: Omit<FarmInvestment, "id">): void {
  if (!input.name.trim() || input.name.length > 120)
    throw new Error("Investment name must contain 1 to 120 characters.");
  if (!investmentCategories.includes(input.category))
    throw new Error("Choose a valid investment category.");
  if (
    !Number.isFinite(input.amount) ||
    input.amount <= 0 ||
    input.amount > 9999999999.99 ||
    Math.abs(input.amount * 100 - Math.round(input.amount * 100)) > 0.0001
  )
    throw new Error("Amount must be positive, below ₱10 billion, with at most two decimal places.");
  const date = new Date(`${input.investmentDate}T00:00:00Z`);
  if (
    !/^\d{4}-\d{2}-\d{2}$/.test(input.investmentDate) ||
    input.investmentDate.startsWith("0000-") ||
    !Number.isFinite(date.getTime()) ||
    date.toISOString().slice(0, 10) !== input.investmentDate
  )
    throw new Error("Enter a valid investment date.");
}

export function buildInvestmentReport(investments: readonly FarmInvestment[]) {
  const totalCents = investments.reduce((total, item) => total + Math.round(item.amount * 100), 0);
  return {
    totalInvested: totalCents / 100,
    recordCount: investments.length,
    categoryBreakdown: investmentCategories
      .map((category) => ({
        category,
        amount:
          investments
            .filter((item) => item.category === category)
            .reduce((total, item) => total + Math.round(item.amount * 100), 0) / 100,
      }))
      .filter((item) => item.amount > 0),
  };
}
