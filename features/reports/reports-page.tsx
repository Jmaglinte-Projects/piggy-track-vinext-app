"use client";

import { Icon } from "@/components/ui/icon";
import { AppSelect } from "@/components/ui/select";
import { formatCurrency, formatDate, formatPercent, formatWeight } from "@/presentation/formatters";
import { buildAllBatchReports, buildBatchReport, type BatchReport } from "@/domain/reports";
import type { PiggyTrackData } from "@/domain/entities";

interface ReportsPageProps {
  data: PiggyTrackData;
  selectedBatchId: string;
  onBatchChange: (id: string) => void;
}

const categoryColors = ["bg-[#315c50]", "bg-[#c97445]", "bg-[#d7aa54]", "bg-[#789487]", "bg-[#9d7665]", "bg-[#a59c8c]"];

export function ReportsPage({ data, selectedBatchId, onBatchChange }: ReportsPageProps) {
  const report = buildBatchReport(data, selectedBatchId);
  const reports = buildAllBatchReports(data);

  if (!report) return <div className="rounded-xl border border-dashed border-[#cfd2ca] bg-white/40 px-6 py-20 text-center"><Icon name="reports" className="mx-auto !h-8 !w-8 text-[#315c50]" /><h1 className="mt-4 font-serif text-2xl text-[#1f2d29]">No batch reports yet</h1><p className="mt-2 text-sm text-[#68746f]">Create a batch to start building financial reports.</p></div>;

  const collectionRate = report.totalSales === 0 ? 0 : report.paymentsReceived / report.totalSales * 100;
  const maxExpense = Math.max(...report.expenseBreakdown.map((entry) => entry.amount), 1);
  const metrics = [
    { label: "Net profit", value: formatCurrency(report.netProfit), detail: `${formatPercent(report.roi)} ROI`, tone: report.netProfit >= 0 ? "positive" : "negative" },
    { label: "Total expenses", value: formatCurrency(report.totalExpenses), detail: `${formatCurrency(report.averageCostPerPig)} per pig` },
    { label: "Total sales", value: formatCurrency(report.totalSales), detail: `${report.soldPigCount} of ${report.pigCount} pigs sold` },
    { label: "Payments received", value: formatCurrency(report.paymentsReceived), detail: `${formatPercent(collectionRate)} collected`, tone: "positive" },
    { label: "Receivables", value: formatCurrency(report.receivables), detail: report.receivables > 0 ? "Still to collect" : "Fully collected", tone: report.receivables > 0 ? "warning" : "positive" },
    { label: "Feed cost / pig", value: formatCurrency(report.feedCostPerPig), detail: `${formatCurrency(report.feedCost)} total feed` },
    { label: "Average selling weight", value: formatWeight(report.averageSellingWeight), detail: "Billable weight" },
    { label: "Average selling price", value: `${formatCurrency(report.averageSellingPricePerKg)}/kg`, detail: "Weighted average" },
  ];

  return <div className="space-y-5">
    <header className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
      <div><p className="mb-2 text-[10px] font-extrabold uppercase tracking-[0.14em] text-[#818b86]">Financial intelligence</p><h1 className="font-serif text-4xl tracking-[-0.035em] text-[#1f2d29] sm:text-[43px]">Reports</h1><p className="mt-2 text-sm text-[#68746f]">Understand profitability, costs, sales performance, and collections.</p></div>
      <label className="block w-full lg:w-[390px]"><span className="mb-1.5 block text-[10px] font-extrabold uppercase tracking-[0.08em] text-[#777f7b]">Reporting batch</span><AppSelect ariaLabel="Reporting batch" triggerClassName="!h-12 !min-h-12 !border-[#deded7] !bg-[#fffefa] text-sm font-bold shadow-sm" value={selectedBatchId} onValueChange={onBatchChange} options={data.batches.map((batch) => ({ value: batch.id, label: batch.name }))} /></label>
    </header>

    <section className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[#deded7] bg-[#fffefa] px-4 py-3 shadow-sm">
      <div className="flex flex-wrap items-center gap-2"><span className="rounded-full bg-[#e8f0eb] px-2.5 py-1 text-[9px] font-extrabold uppercase tracking-wide text-[#315c50]">{report.batch.status}</span><span className="text-xs text-[#68746f]">Started {formatDate(report.batch.startDate)}</span>{report.batch.endDate && <span className="text-xs text-[#68746f]">· Ended {formatDate(report.batch.endDate)}</span>}</div>
      <span className="text-xs font-bold text-[#315c50]">{report.pigCount} pig{report.pigCount === 1 ? "" : "s"}</span>
    </section>

    <section className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4" aria-label="Batch report metrics">{metrics.map((metric) => <ReportMetric key={metric.label} {...metric} />)}</section>

    <div className="grid gap-4 xl:grid-cols-[1.15fr_.85fr]">
      <section className="rounded-xl border border-[#deded7] bg-[#fffefa] p-5 shadow-sm sm:p-6">
        <div className="flex items-start justify-between gap-4"><div><p className="text-[10px] font-extrabold uppercase tracking-[0.12em] text-[#818b86]">Cost structure</p><h2 className="mt-1 font-serif text-2xl text-[#1f2d29]">Expenses by category</h2></div><strong className="text-sm text-[#1f2d29]">{formatCurrency(report.totalExpenses)}</strong></div>
        <div className="mt-6 space-y-4">{report.expenseBreakdown.map((entry, index) => <div key={entry.category}><div className="mb-1.5 flex items-center justify-between gap-4 text-xs"><span className="font-semibold text-[#4d5a56]">{entry.category}</span><span><strong className="text-[#1f2d29]">{formatCurrency(entry.amount)}</strong> <small className="ml-1 text-[#87908c]">{formatPercent(report.totalExpenses === 0 ? 0 : entry.amount / report.totalExpenses * 100)}</small></span></div><div className="h-2 overflow-hidden rounded-full bg-[#e8e9e3]"><span className={`block h-full rounded-full ${categoryColors[index % categoryColors.length]}`} style={{ width: `${entry.amount / maxExpense * 100}%` }} /></div></div>)}{report.expenseBreakdown.length === 0 && <p className="py-12 text-center text-sm text-[#68746f]">No expenses recorded for this batch.</p>}</div>
      </section>

      <section className="rounded-xl border border-[#deded7] bg-[#fffefa] p-5 shadow-sm sm:p-6">
        <p className="text-[10px] font-extrabold uppercase tracking-[0.12em] text-[#818b86]">Profit and collections</p><h2 className="mt-1 font-serif text-2xl text-[#1f2d29]">Batch financial summary</h2>
        <dl className="mt-5 divide-y divide-[#ebeae4] text-sm"><ReportLine label="Sales revenue" value={formatCurrency(report.totalSales)} /><ReportLine label="Less: expenses" value={`− ${formatCurrency(report.totalExpenses)}`} /><ReportLine label="Net profit" value={formatCurrency(report.netProfit)} emphasized tone={report.netProfit >= 0 ? "positive" : "negative"} /></dl>
        <div className="mt-6 rounded-lg bg-[#eef0eb] p-4"><div className="flex justify-between text-xs"><span className="font-semibold text-[#5b6762]">Collection progress</span><strong className="text-[#1f2d29]">{formatPercent(collectionRate)}</strong></div><div className="mt-3 h-2 overflow-hidden rounded-full bg-[#d3dbd5]"><span className="block h-full rounded-full bg-[#315c50]" style={{ width: `${Math.min(100, collectionRate)}%` }} /></div><div className="mt-3 flex justify-between text-[10px] text-[#68746f]"><span>{formatCurrency(report.paymentsReceived)} received</span><span>{formatCurrency(report.receivables)} outstanding</span></div></div>
      </section>
    </div>

    <section className="overflow-hidden rounded-xl border border-[#deded7] bg-[#fffefa] shadow-sm">
      <div className="border-b border-[#deded7] px-5 py-4 sm:px-6"><p className="text-[10px] font-extrabold uppercase tracking-[0.12em] text-[#818b86]">Across raising cycles</p><h2 className="mt-1 font-serif text-2xl text-[#1f2d29]">Profit per batch</h2></div>
      <div className="overflow-x-auto"><table className="w-full min-w-[820px] border-collapse text-left"><thead className="bg-[#eff0eb] text-[9px] uppercase tracking-[0.06em] text-[#737e79]"><tr><th className="px-5 py-3 font-extrabold">Batch</th><th className="px-4 py-3 font-extrabold">Expenses</th><th className="px-4 py-3 font-extrabold">Feed</th><th className="px-4 py-3 font-extrabold">Sales</th><th className="px-4 py-3 font-extrabold">Received</th><th className="px-4 py-3 font-extrabold">Net profit</th><th className="px-5 py-3 font-extrabold">ROI</th></tr></thead><tbody className="divide-y divide-[#ebeae4]">{reports.map((item) => <BatchReportRow report={item} selected={item.batch.id === selectedBatchId} onSelect={() => onBatchChange(item.batch.id)} key={item.batch.id} />)}</tbody></table></div>
    </section>
  </div>;
}

function ReportMetric({ label, value, detail, tone = "neutral" }: { label: string; value: string; detail: string; tone?: string }) {
  const toneClass = tone === "positive" ? "bg-gradient-to-br from-[#fffefa] to-[#edf5f0]" : tone === "negative" ? "bg-gradient-to-br from-[#fffefa] to-[#fae9e2]" : tone === "warning" ? "bg-gradient-to-br from-[#fffefa] to-[#fbf0e1]" : "bg-[#fffefa]";
  return <article className={`rounded-xl border border-[#deded7] p-4 shadow-sm ${toneClass}`}><span className="text-[10px] font-bold text-[#737e79]">{label}</span><strong className="mt-4 block font-serif text-2xl tracking-tight text-[#1f2d29]">{value}</strong><small className="mt-1.5 block text-[10px] text-[#87908c]">{detail}</small></article>;
}

function ReportLine({ label, value, emphasized = false, tone = "neutral" }: { label: string; value: string; emphasized?: boolean; tone?: string }) {
  const valueColor = tone === "positive" ? "text-[#315c50]" : tone === "negative" ? "text-[#a1533d]" : "text-[#1f2d29]";
  return <div className={`flex items-center justify-between gap-4 py-3 ${emphasized ? "text-base" : ""}`}><dt className={emphasized ? "font-bold text-[#1f2d29]" : "text-[#68746f]"}>{label}</dt><dd className={`m-0 font-bold ${valueColor}`}>{value}</dd></div>;
}

function BatchReportRow({ report, selected, onSelect }: { report: BatchReport; selected: boolean; onSelect: () => void }) {
  return <tr className={selected ? "bg-[#edf3ef]" : "hover:bg-[#faf9f4]"}><td className="px-5 py-4"><button type="button" className="text-left" onClick={onSelect}><strong className="block text-xs text-[#1f2d29]">{report.batch.name}</strong><small className="mt-1 block text-[9px] text-[#87908c]">{report.batch.status} · {report.pigCount} pigs</small></button></td><td className="px-4 py-4 text-xs font-semibold text-[#1f2d29]">{formatCurrency(report.totalExpenses)}</td><td className="px-4 py-4 text-xs text-[#68746f]">{formatCurrency(report.feedCost)}</td><td className="px-4 py-4 text-xs font-semibold text-[#1f2d29]">{formatCurrency(report.totalSales)}</td><td className="px-4 py-4 text-xs text-[#68746f]">{formatCurrency(report.paymentsReceived)}</td><td className={`px-4 py-4 text-xs font-extrabold ${report.netProfit >= 0 ? "text-[#315c50]" : "text-[#a1533d]"}`}>{formatCurrency(report.netProfit)}</td><td className="px-5 py-4 text-xs font-bold text-[#1f2d29]">{formatPercent(report.roi)}</td></tr>;
}
