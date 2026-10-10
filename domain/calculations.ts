import type { Expense, Payment, Pig, PigSale } from "@/domain/entities";

export function calculateExpenseAmount(expense: Expense): number {
  return expense.quantity * expense.unitPrice;
}

export function calculateBillableWeight(sale: PigSale): number {
  return Math.max(0, sale.actualWeight - sale.weightDeduction);
}

export function calculateSaleTotal(sale: PigSale): number {
  return calculateBillableWeight(sale) * sale.pricePerKg;
}

export function calculateBatchExpenses(expenses: Expense[]): number {
  return expenses.reduce((total, expense) => total + calculateExpenseAmount(expense), 0);
}

export function calculateBatchSales(sales: PigSale[]): number {
  return sales.reduce((total, sale) => total + calculateSaleTotal(sale), 0);
}

export function calculatePaymentsReceived(payments: Payment[]): number {
  return payments.reduce((total, payment) => total + payment.amount, 0);
}

export function calculateOutstandingBalance(sale: PigSale, payments: Payment[]): number {
  const paid = payments
    .filter((payment) => payment.saleId === sale.id)
    .reduce((total, payment) => total + payment.amount, 0);
  return Math.max(0, calculateSaleTotal(sale) - paid);
}

export function calculateNetProfit(totalSales: number, totalExpenses: number): number {
  return totalSales - totalExpenses;
}

export function calculateAverageCostPerPig(totalExpenses: number, pigs: Pig[]): number {
  return pigs.length === 0 ? 0 : totalExpenses / pigs.length;
}

export function calculateFeedCostPerPig(feedExpenses: Expense[], pigs: Pig[]): number {
  return pigs.length === 0 ? 0 : calculateBatchExpenses(feedExpenses) / pigs.length;
}

export function calculateAverageFeedPrice(feedExpenses: Expense[]): number {
  const quantity = feedExpenses.reduce((total, expense) => total + expense.quantity, 0);
  return quantity === 0 ? 0 : calculateBatchExpenses(feedExpenses) / quantity;
}

export function calculateRoi(netProfit: number, totalExpenses: number): number {
  return totalExpenses === 0 ? 0 : (netProfit / totalExpenses) * 100;
}

export function calculateDaysInCycle(
  startDate: string,
  endDate: string | null,
  today = new Date(),
): number {
  const start = new Date(`${startDate}T00:00:00+08:00`);
  const end = endDate ? new Date(`${endDate}T00:00:00+08:00`) : today;
  return Math.max(0, Math.floor((end.getTime() - start.getTime()) / 86_400_000) + 1);
}

export function getPaymentStatus(
  sale: PigSale,
  payments: Payment[],
): "Paid" | "Partially Paid" | "Pending" {
  const balance = calculateOutstandingBalance(sale, payments);
  if (balance === 0) return "Paid";
  return balance < calculateSaleTotal(sale) ? "Partially Paid" : "Pending";
}
