import {
  calculateAverageCostPerPig,
  calculateBatchExpenses,
  calculateBatchSales,
  calculateBillableWeight,
  calculateFeedCostPerPig,
  calculateNetProfit,
  calculateOutstandingBalance,
  calculatePaymentsReceived,
  calculateRoi,
} from "@/domain/calculations";
import type { Batch, ExpenseCategory, PiggyTrackData } from "@/domain/entities";

export interface BatchReport {
  batch: Batch;
  pigCount: number;
  soldPigCount: number;
  totalExpenses: number;
  feedCost: number;
  totalSales: number;
  netProfit: number;
  roi: number;
  paymentsReceived: number;
  receivables: number;
  averageCostPerPig: number;
  feedCostPerPig: number;
  averageSellingWeight: number;
  averageSellingPricePerKg: number;
  expenseBreakdown: Array<{ category: ExpenseCategory; amount: number }>;
}

export function buildBatchReport(data: PiggyTrackData, batchId: string): BatchReport | null {
  const batch = data.batches.find((item) => item.id === batchId);
  if (!batch) return null;

  const pigs = data.pigs.filter((pig) => pig.batchId === batchId);
  const expenses = data.expenses.filter((expense) => expense.batchId === batchId);
  const feedExpenses = expenses.filter((expense) => expense.category === "Feed");
  const sales = data.sales.filter((sale) => sale.batchId === batchId);
  const saleIds = new Set(sales.map((sale) => sale.id));
  const payments = data.payments.filter((payment) => saleIds.has(payment.saleId));
  const totalExpenses = calculateBatchExpenses(expenses);
  const totalSales = calculateBatchSales(sales);
  const netProfit = calculateNetProfit(totalSales, totalExpenses);
  const totalBillableWeight = sales.reduce((sum, sale) => sum + calculateBillableWeight(sale), 0);

  const expenseBreakdown = Array.from(
    expenses.reduce((totals, expense) => {
      totals.set(
        expense.category,
        (totals.get(expense.category) ?? 0) + expense.quantity * expense.unitPrice,
      );
      return totals;
    }, new Map<ExpenseCategory, number>()),
  )
    .map(([category, amount]) => ({ category, amount }))
    .sort((a, b) => b.amount - a.amount);

  return {
    batch,
    pigCount: pigs.length,
    soldPigCount: pigs.filter((pig) => pig.status === "Sold").length,
    totalExpenses,
    feedCost: calculateBatchExpenses(feedExpenses),
    totalSales,
    netProfit,
    roi: calculateRoi(netProfit, totalExpenses),
    paymentsReceived: calculatePaymentsReceived(payments),
    receivables: sales.reduce((sum, sale) => sum + calculateOutstandingBalance(sale, payments), 0),
    averageCostPerPig: calculateAverageCostPerPig(totalExpenses, pigs),
    feedCostPerPig: calculateFeedCostPerPig(feedExpenses, pigs),
    averageSellingWeight: sales.length === 0 ? 0 : totalBillableWeight / sales.length,
    averageSellingPricePerKg: totalBillableWeight === 0 ? 0 : totalSales / totalBillableWeight,
    expenseBreakdown,
  };
}

export function buildAllBatchReports(data: PiggyTrackData): BatchReport[] {
  return data.batches
    .map((batch) => buildBatchReport(data, batch.id))
    .filter((report): report is BatchReport => report !== null);
}
