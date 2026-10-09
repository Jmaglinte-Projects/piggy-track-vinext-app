import {
  calculateAverageCostPerPig,
  calculateBatchExpenses,
  calculateBatchSales,
  calculateBillableWeight,
  calculateDaysInCycle,
  calculateExpenseAmount,
  calculateNetProfit,
  calculateOutstandingBalance,
  calculatePaymentsReceived,
  calculateRoi,
  calculateSaleTotal,
  getPaymentStatus,
} from "@/domain/calculations";
import { formatCurrency, formatDate, formatPercent, formatWeight } from "@/presentation/formatters";
import type { ExpenseCategory, PiggyTrackData } from "@/domain/entities";
import { MetricCard } from "@/components/dashboard/metric-card";
import { Icon } from "@/components/ui/icon";

interface DashboardProps { data: PiggyTrackData; selectedBatchId: string; onOpenExpenses: () => void; onOpenFeed: () => void; onOpenSales: () => void }

const categoryColors: Record<string, string> = {
  Feed: "#c97445", Piglets: "#385e52", "Pig House Repair": "#d7aa54",
  Vitamins: "#789487", Medicine: "#9d7665", Other: "#a59c8c",
};

export function Dashboard({ data, selectedBatchId, onOpenExpenses, onOpenFeed, onOpenSales }: DashboardProps) {
  const batch = data.batches.find((item) => item.id === selectedBatchId);
  const pigs = data.pigs.filter((pig) => pig.batchId === selectedBatchId);
  const expenses = data.expenses.filter((expense) => expense.batchId === selectedBatchId);
  const sales = data.sales.filter((sale) => sale.batchId === selectedBatchId);
  const saleIds = new Set(sales.map((sale) => sale.id));
  const payments = data.payments.filter((payment) => saleIds.has(payment.saleId));
  const totalExpenses = calculateBatchExpenses(expenses);
  const totalSales = calculateBatchSales(sales);
  const received = calculatePaymentsReceived(payments);
  const outstanding = Math.max(0, totalSales - received);
  const netProfit = calculateNetProfit(totalSales, totalExpenses);
  const feedExpenses = calculateBatchExpenses(expenses.filter((expense) => expense.category === "Feed"));
  const activePigs = pigs.filter((pig) => pig.status === "Active").length;
  const soldPigs = pigs.filter((pig) => pig.status === "Sold").length;

  const breakdown = Array.from(
    expenses.reduce((totals, expense) => {
      totals.set(expense.category, (totals.get(expense.category) ?? 0) + calculateExpenseAmount(expense));
      return totals;
    }, new Map<ExpenseCategory, number>()),
  ).sort((a, b) => b[1] - a[1]);

  if (!batch) return null;
  if (pigs.length === 0 && expenses.length === 0 && sales.length === 0) {
    return (
      <section className="empty-state">
        <span><Icon name="batches" /></span><h2>No records in this batch yet</h2>
        <p>Add pigs and expenses when you are ready to start tracking this cycle.</p>
        <button className="secondary-button" type="button"><Icon name="plus" />Add first record</button>
      </section>
    );
  }

  const metrics = [
    { label: "Total expenses", value: formatCurrency(totalExpenses), hint: "All recorded costs", icon: "receipt" as const },
    { label: "Total sales", value: formatCurrency(totalSales), hint: `${sales.length} pigs sold`, icon: "sales" as const, tone: "positive" as const },
    { label: "Net profit", value: formatCurrency(netProfit), hint: `${formatPercent(calculateRoi(netProfit, totalExpenses))} return on costs`, icon: "trend" as const, tone: netProfit >= 0 ? "positive" as const : "warning" as const },
    { label: "Amount received", value: formatCurrency(received), hint: `${formatPercent(totalSales === 0 ? 0 : received / totalSales * 100)} of sales collected`, icon: "wallet" as const },
    { label: "Outstanding", value: formatCurrency(outstanding), hint: outstanding > 0 ? "Payment still to collect" : "All payments collected", icon: "calendar" as const, tone: outstanding > 0 ? "warning" as const : "positive" as const },
  ];

  return (
    <div className="dashboard-stack">
      <section className="metrics-grid" aria-label="Financial summary">
        {metrics.map((metric) => <MetricCard key={metric.label} {...metric} />)}
      </section>

      <section className="operations-strip" aria-label="Batch operations summary">
        <div><span>Number of pigs</span><strong>{pigs.length}</strong></div>
        <div><span>Active pigs</span><strong>{activePigs}</strong></div>
        <div><span>Sold pigs</span><strong>{soldPigs}</strong></div>
        <button type="button" onClick={onOpenFeed}><span>Feed expenses</span><strong>{formatCurrency(feedExpenses)}</strong></button>
        <div><span>Average cost / pig</span><strong>{formatCurrency(calculateAverageCostPerPig(totalExpenses, pigs))}</strong></div>
      </section>

      <div className="dashboard-grid">
        <section className="panel expense-breakdown">
          <div className="panel-heading"><div><p className="eyebrow">Where the money went</p><h2>Expense breakdown</h2></div><button type="button" className="text-button" onClick={onOpenExpenses}>View expenses <Icon name="arrow" /></button></div>
          <div className="breakdown-content">
            <div className="donut" style={{ background: buildConicGradient(breakdown, totalExpenses) }}><div><strong>{formatCurrency(totalExpenses)}</strong><span>Total spent</span></div></div>
            <div className="legend-list">
              {breakdown.map(([category, amount]) => (
                <div className="legend-row" key={category}><span className="legend-dot" style={{ backgroundColor: categoryColors[category] ?? categoryColors.Other }} /><span>{category}</span><strong>{formatCurrency(amount)}</strong><small>{formatPercent(totalExpenses === 0 ? 0 : amount / totalExpenses * 100)}</small></div>
              ))}
            </div>
          </div>
        </section>

        <section className="panel batch-summary">
          <div className="panel-heading"><div><p className="eyebrow">Current cycle</p><h2>Batch summary</h2></div><span className="status-pill">{batch.status}</span></div>
          <dl>
            <div><dt>Started</dt><dd>{formatDate(batch.startDate)}</dd></div>
            <div><dt>Days in cycle</dt><dd>{calculateDaysInCycle(batch.startDate, batch.endDate)} days</dd></div>
            <div><dt>Average sale weight</dt><dd>{formatWeight(sales.length === 0 ? 0 : sales.reduce((sum, sale) => sum + calculateBillableWeight(sale), 0) / sales.length)}</dd></div>
            <div><dt>Average price / kg</dt><dd>{formatCurrency(sales.length === 0 ? 0 : sales.reduce((sum, sale) => sum + sale.pricePerKg, 0) / sales.length)}</dd></div>
          </dl>
          <div className="progress-block"><div><span>Sales progress</span><strong>{soldPigs} of {pigs.length}</strong></div><div className="progress-track"><span style={{ width: `${pigs.length === 0 ? 0 : soldPigs / pigs.length * 100}%` }} /></div></div>
        </section>
      </div>

      <div className="dashboard-grid lower-grid">
        <section className="panel activity-panel">
          <div className="panel-heading"><div><p className="eyebrow">Latest activity</p><h2>Recent expenses</h2></div><button type="button" className="text-button" onClick={onOpenExpenses}>See all <Icon name="arrow" /></button></div>
          <div className="activity-list">
            {[...expenses].sort((a, b) => b.expenseDate.localeCompare(a.expenseDate)).slice(0, 4).map((expense) => (
              <div className="activity-row" key={expense.id}><span className="activity-icon"><Icon name={expense.category === "Feed" ? "feed" : "receipt"} /></span><div><strong>{expense.description}</strong><span>{expense.category} · {formatDate(expense.expenseDate)}</span></div><b>{formatCurrency(calculateExpenseAmount(expense))}</b></div>
            ))}
          </div>
        </section>

        <section className="panel activity-panel">
          <div className="panel-heading"><div><p className="eyebrow">Collections</p><h2>Outstanding payments</h2></div><button type="button" className="text-button" onClick={onOpenSales}>See sales <Icon name="arrow" /></button></div>
          <div className="activity-list">
            {sales.filter((sale) => calculateOutstandingBalance(sale, payments) > 0).map((sale) => {
              const pig = pigs.find((item) => item.id === sale.pigId);
              const buyer = data.buyers.find((item) => item.id === sale.buyerId);
              return <div className="payment-row" key={sale.id}><div><span className="payment-status">{getPaymentStatus(sale, payments)}</span><strong>{buyer?.name ?? "Unknown buyer"}</strong><span>{pig?.tagNumber} · Due {formatDate(sale.paymentDueDate)}</span></div><div><strong>{formatCurrency(calculateOutstandingBalance(sale, payments))}</strong><span>of {formatCurrency(calculateSaleTotal(sale))}</span></div></div>;
            })}
            {outstanding === 0 && <div className="all-paid"><Icon name="wallet" /><div><strong>All caught up</strong><span>There are no outstanding payments.</span></div></div>}
          </div>
        </section>
      </div>
    </div>
  );
}

function buildConicGradient(entries: [ExpenseCategory, number][], total: number): string {
  if (total === 0) return "#ebe7df";
  let current = 0;
  const segments = entries.map(([category, amount]) => {
    const start = current;
    current += (amount / total) * 100;
    return `${categoryColors[category] ?? categoryColors.Other} ${start}% ${current}%`;
  });
  return `conic-gradient(${segments.join(", ")})`;
}
