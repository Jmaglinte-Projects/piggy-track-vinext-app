"use client";

import { useMemo, useState } from "react";
import { BatchSelector } from "@/components/batch-selector";
import { Icon } from "@/components/ui/icon";
import { AppSelect, selectOptions } from "@/components/ui/select";
import { ConfirmDelete, Modal } from "@/features/shared/modal";
import { PageHeader } from "@/features/shared/page-header";
import { calculateAverageFeedPrice, calculateBatchExpenses, calculateExpenseAmount, calculateFeedCostPerPig } from "@/lib/calculations";
import { formatCurrency, formatDate } from "@/lib/formatters";
import { feedTypes, formNumber, formString } from "@/lib/options";
import type { Expense, FeedType, PiggyTrackData } from "@/types/domain";
import type { ExpenseInput } from "@/services/piggy-track-repository";

interface FeedPageProps {
  data: PiggyTrackData;
  selectedBatchId: string;
  onBatchChange: (id: string) => void;
  saving: boolean;
  onSave: (input: ExpenseInput, id?: string) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
}

export function FeedPage({ data, selectedBatchId, onBatchChange, saving, onSave, onDelete }: FeedPageProps) {
  const [editing, setEditing] = useState<Expense | "new" | null>(null);
  const [deleting, setDeleting] = useState<Expense | null>(null);
  const [filter, setFilter] = useState<"All" | FeedType>("All");
  const feed = useMemo(() => data.expenses.filter((expense) => expense.batchId === selectedBatchId && expense.category === "Feed").sort((a, b) => b.expenseDate.localeCompare(a.expenseDate)), [data.expenses, selectedBatchId]);
  const pigs = data.pigs.filter((pig) => pig.batchId === selectedBatchId);
  const shownFeed = filter === "All" ? feed : feed.filter((expense) => expense.feedType === filter);
  const totalQuantity = feed.reduce((sum, expense) => sum + expense.quantity, 0);
  const totalCost = calculateBatchExpenses(feed);

  return <>
    <PageHeader eyebrow="Feed ledger" title="Feed" description="Track every sack purchased and understand feed cost for this batch." actionLabel="Add feed purchase" onAction={() => setEditing("new")} />
    <BatchSelector batches={data.batches} selectedBatchId={selectedBatchId} onChange={onBatchChange} />
    <section className="feed-metrics" aria-label="Feed summary">
      <div><span>Total feed cost</span><strong>{formatCurrency(totalCost)}</strong><small>{feed.length} purchase{feed.length === 1 ? "" : "s"}</small></div>
      <div><span>Total quantity</span><strong>{formatSacks(totalQuantity)}</strong><small>Includes partial sacks</small></div>
      <div><span>Feed cost / pig</span><strong>{formatCurrency(calculateFeedCostPerPig(feed, pigs))}</strong><small>Across {pigs.length} pig{pigs.length === 1 ? "" : "s"}</small></div>
      <div><span>Average price / sack</span><strong>{formatCurrency(calculateAverageFeedPrice(feed))}</strong><small>Weighted average</small></div>
    </section>

    <section className="feed-breakdown" aria-label="Feed cost by type">
      {feedTypes.map((type) => {
        const entries = feed.filter((expense) => expense.feedType === type);
        const amount = calculateBatchExpenses(entries);
        const quantity = entries.reduce((sum, expense) => sum + expense.quantity, 0);
        return <button type="button" className={filter === type ? "active" : ""} key={type} onClick={() => setFilter(filter === type ? "All" : type)}><span className="feed-type-icon"><Icon name="feed" /></span><span><strong>{type}</strong><small>{formatSacks(quantity)}</small></span><b>{formatCurrency(amount)}</b></button>;
      })}
    </section>

    <div className="filter-bar feed-filter" role="group" aria-label="Filter feed purchases"><button className={filter === "All" ? "active" : ""} type="button" onClick={() => setFilter("All")}>All purchases <span>{feed.length}</span></button>{filter !== "All" && <button className="active" type="button" onClick={() => setFilter("All")}>{filter} <span>{shownFeed.length}</span></button>}</div>
    <section className="table-panel"><div className="record-table feed-table"><div className="table-head"><span>Feed type</span><span>Purchase date</span><span>Quantity</span><span>Price / sack</span><span>Total</span><span>Actions</span></div>{shownFeed.map((expense) => <div className="table-row" key={expense.id}><div data-label="Feed type"><strong>{expense.feedType}</strong><small>{expense.description}</small></div><div data-label="Purchase date"><strong>{formatDate(expense.expenseDate)}</strong><small>{expense.notes || "No notes"}</small></div><div data-label="Quantity"><strong>{formatSacks(expense.quantity)}</strong></div><div data-label="Price / sack"><strong>{formatCurrency(expense.unitPrice)}</strong></div><div data-label="Total"><strong>{formatCurrency(calculateExpenseAmount(expense))}</strong></div><div className="row-actions" data-label="Actions"><button type="button" onClick={() => setEditing(expense)}>Edit</button><button className="delete-link" type="button" onClick={() => setDeleting(expense)}>Delete</button></div></div>)}</div>{shownFeed.length === 0 && <div className="inline-empty compact"><Icon name="feed" /><h2>{filter === "All" ? "No feed purchases yet" : `No ${filter} purchases`}</h2><p>Add a feed purchase or select another feed type.</p></div>}</section>

    {editing && <FeedModal expense={editing} batches={data.batches} selectedBatchId={selectedBatchId} saving={saving} onClose={() => setEditing(null)} onSave={onSave} />}
    {deleting && <ConfirmDelete itemName={`${deleting.feedType ?? "Feed"} purchase from ${formatDate(deleting.expenseDate)}`} saving={saving} onCancel={() => setDeleting(null)} onConfirm={async () => { try { await onDelete(deleting.id); setDeleting(null); } catch { return; } }} />}
  </>;
}

function FeedModal({ expense, batches, selectedBatchId, saving, onClose, onSave }: { expense: Expense | "new"; batches: PiggyTrackData["batches"]; selectedBatchId: string; saving: boolean; onClose: () => void; onSave: (input: ExpenseInput, id?: string) => Promise<void> }) {
  const existing = expense === "new" ? null : expense;
  const [feedType, setFeedType] = useState<FeedType>(existing?.feedType ?? "Starter");
  const [quantity, setQuantity] = useState(existing?.quantity ?? 1);
  const [unitPrice, setUnitPrice] = useState(existing?.unitPrice ?? 0);
  const [error, setError] = useState<string | null>(null);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); setError(null); const form = new FormData(event.currentTarget);
    try {
      await onSave({ batchId: formString(form, "batchId"), category: "Feed", feedType, description: `${feedType} feed`, quantity: formNumber(form, "quantity"), unit: "sack", unitPrice: formNumber(form, "unitPrice"), expenseDate: formString(form, "expenseDate"), notes: formString(form, "notes") }, existing?.id);
      onClose();
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Unable to save feed purchase."); }
  }

  const batchOptions = batches.filter((batch) => batch.status !== "Archived").map((batch) => ({ value: batch.id, label: batch.name }));
  return <Modal title={existing ? "Edit feed purchase" : "Add feed purchase"} description="The total is calculated automatically from sacks × price per sack." onClose={onClose}><form className="record-form" onSubmit={submit}>{error && <div className="form-error">{error}</div>}<div className="form-grid"><label>Batch<AppSelect ariaLabel="Batch" name="batchId" required defaultValue={existing?.batchId ?? selectedBatchId} options={batchOptions} /></label><label>Feed type<AppSelect ariaLabel="Feed type" name="feedType" value={feedType} onValueChange={(value) => setFeedType(value as FeedType)} options={selectOptions(feedTypes)} /></label></div><div className="form-grid"><label>Quantity (sacks)<input name="quantity" type="number" min="0.001" step="0.001" required value={quantity} onChange={(event) => setQuantity(Number(event.target.value))} /></label><label>Price per sack (₱)<input name="unitPrice" type="number" min="0" step="0.01" required value={unitPrice || ""} onChange={(event) => setUnitPrice(Number(event.target.value))} /></label></div><div className="calculation-preview"><span>Calculated total</span><strong>{formatCurrency(quantity * unitPrice)}</strong></div><label>Purchase date<input name="expenseDate" type="date" required defaultValue={existing?.expenseDate ?? new Date().toISOString().slice(0, 10)} /></label><label>Notes<textarea name="notes" rows={3} defaultValue={existing?.notes ?? ""} placeholder="Optional supplier, receipt, or delivery details" /></label><div className="separation-note">This purchase is also included automatically in Expenses and dashboard totals.</div><div className="form-actions"><button className="secondary-button" type="button" onClick={onClose}>Cancel</button><button className="primary-button" disabled={saving}>{saving ? "Saving…" : "Save feed purchase"}</button></div></form></Modal>;
}

function formatSacks(value: number): string {
  return `${new Intl.NumberFormat("en-PH", { maximumFractionDigits: 3 }).format(value)} ${value === 1 ? "sack" : "sacks"}`;
}
