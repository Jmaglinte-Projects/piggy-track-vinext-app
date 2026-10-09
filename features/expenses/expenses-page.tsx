"use client";

import { useMemo, useState } from "react";
import { BatchSelector } from "@/components/batch-selector";
import { AppSelect, selectOptions } from "@/components/ui/select";
import { PageHeader } from "@/features/shared/page-header";
import { ConfirmDelete, Modal } from "@/features/shared/modal";
import { calculateBatchExpenses, calculateExpenseAmount } from "@/domain/calculations";
import { formatCurrency, formatDate } from "@/presentation/formatters";
import { expenseCategories, feedTypes } from "@/domain/constants";
import { formNumber, formString } from "@/presentation/form-utils";
import type { Expense, ExpenseCategory, FeedType, PiggyTrackData } from "@/domain/entities";
import type { ExpenseInput } from "@/application/ports/piggy-track-repository";

interface ExpensesPageProps { data: PiggyTrackData; selectedBatchId: string; onBatchChange: (id: string) => void; saving: boolean; onSave: (input: ExpenseInput, id?: string) => Promise<void>; onDelete: (id: string) => Promise<void> }

export function ExpensesPage({ data, selectedBatchId, onBatchChange, saving, onSave, onDelete }: ExpensesPageProps) {
  const [editing, setEditing] = useState<Expense | "new" | null>(null);
  const [deleting, setDeleting] = useState<Expense | null>(null);
  const [filter, setFilter] = useState<"All" | ExpenseCategory>("All");
  const allExpenses = useMemo(() => data.expenses.filter((expense) => expense.batchId === selectedBatchId), [data.expenses, selectedBatchId]);
  const expenses = filter === "All" ? allExpenses : allExpenses.filter((expense) => expense.category === filter);
  const usedCategories = expenseCategories.filter((category) => allExpenses.some((expense) => expense.category === category));

  return <><PageHeader eyebrow="Financial ledger" title="Expenses" description="Record every cost as a transaction—totals are calculated automatically." actionLabel="Add expense" onAction={() => setEditing("new")} /><BatchSelector batches={data.batches} selectedBatchId={selectedBatchId} onChange={onBatchChange} />
    <div className="expense-overview"><div><span>Batch expenses</span><strong>{formatCurrency(calculateBatchExpenses(allExpenses))}</strong></div><div><span>Transactions</span><strong>{allExpenses.length}</strong></div><div><span>Feed share</span><strong>{formatCurrency(calculateBatchExpenses(allExpenses.filter((expense) => expense.category === "Feed")))}</strong></div></div>
    <div className="filter-bar scrollable" role="group" aria-label="Filter expenses by category">{["All", ...usedCategories].map((category) => <button className={filter === category ? "active" : ""} type="button" key={category} onClick={() => setFilter(category as "All" | ExpenseCategory)}>{category}</button>)}</div>
    <section className="table-panel"><div className="record-table expense-table"><div className="table-head"><span>Description</span><span>Date</span><span>Quantity</span><span>Amount</span><span>Actions</span></div>{expenses.map((expense) => <div className="table-row" key={expense.id}><div data-label="Description"><strong>{expense.description}</strong><small>{expense.category}{expense.feedType ? ` · ${expense.feedType}` : ""}</small></div><div data-label="Date"><strong>{formatDate(expense.expenseDate)}</strong><small>{expense.notes || "No notes"}</small></div><div data-label="Quantity"><strong>{expense.quantity} {expense.unit}</strong><small>{formatCurrency(expense.unitPrice)} each</small></div><div data-label="Amount"><strong>{formatCurrency(calculateExpenseAmount(expense))}</strong></div><div className="row-actions" data-label="Actions"><button type="button" onClick={() => setEditing(expense)}>Edit</button><button type="button" className="delete-link" onClick={() => setDeleting(expense)}>Delete</button></div></div>)}</div>{expenses.length === 0 && <div className="inline-empty compact"><h2>No expenses found</h2><p>Add an expense or choose another category.</p></div>}</section>
    {editing && <ExpenseModal expense={editing} batches={data.batches} selectedBatchId={selectedBatchId} saving={saving} onClose={() => setEditing(null)} onSave={onSave} />}
    {deleting && <ConfirmDelete itemName={deleting.description} saving={saving} onCancel={() => setDeleting(null)} onConfirm={async () => { try { await onDelete(deleting.id); setDeleting(null); } catch { return; } }} />}
  </>;
}

function ExpenseModal({ expense, batches, selectedBatchId, saving, onClose, onSave }: { expense: Expense | "new"; batches: PiggyTrackData["batches"]; selectedBatchId: string; saving: boolean; onClose: () => void; onSave: (input: ExpenseInput, id?: string) => Promise<void> }) {
  const [category, setCategory] = useState<ExpenseCategory>(expense === "new" ? "Feed" : expense.category);
  const [formError, setFormError] = useState<string | null>(null);
  const [preview, setPreview] = useState(0);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); setFormError(null);
    const form = new FormData(event.currentTarget);
    try {
      const input: ExpenseInput = { batchId: formString(form, "batchId"), category, description: formString(form, "description"), quantity: formNumber(form, "quantity"), unit: formString(form, "unit"), unitPrice: formNumber(form, "unitPrice"), expenseDate: formString(form, "expenseDate"), notes: formString(form, "notes"), ...(category === "Feed" ? { feedType: formString(form, "feedType") as FeedType } : {}) };
      await onSave(input, expense === "new" ? undefined : expense.id); onClose();
    } catch (cause) { setFormError(cause instanceof Error ? cause.message : "Unable to save expense."); }
  }

  function updatePreview(event: React.FormEvent<HTMLFormElement>) {
    const form = new FormData(event.currentTarget);
    setPreview(Number(form.get("quantity") ?? 0) * Number(form.get("unitPrice") ?? 0));
  }

  const batchOptions = batches.filter((batch) => batch.status !== "Archived").map((batch) => ({ value: batch.id, label: batch.name }));
  return <Modal title={expense === "new" ? "Add expense" : "Edit expense"} description="The amount is calculated from quantity × unit price." onClose={onClose}><form className="record-form" onSubmit={submit} onInput={updatePreview}>{formError && <div className="form-error">{formError}</div>}<div className="form-grid"><label>Batch<AppSelect ariaLabel="Batch" name="batchId" defaultValue={expense === "new" ? selectedBatchId : expense.batchId} required options={batchOptions} /></label><label>Category<AppSelect ariaLabel="Category" name="category" value={category} onValueChange={(value) => setCategory(value as ExpenseCategory)} options={selectOptions(expenseCategories)} /></label></div>{category === "Feed" && <label>Feed type<AppSelect ariaLabel="Feed type" name="feedType" defaultValue={expense !== "new" ? expense.feedType : "Starter"} required options={selectOptions(feedTypes)} /></label>}<label>Description<input name="description" required maxLength={160} defaultValue={expense === "new" ? "" : expense.description} placeholder="What was purchased or paid for?" /></label><div className="form-grid three"><label>Quantity<input name="quantity" type="number" min="0.001" step="0.001" required defaultValue={expense === "new" ? 1 : expense.quantity} /></label><label>Unit<input name="unit" required maxLength={30} defaultValue={expense === "new" ? category === "Feed" ? "sack" : "item" : expense.unit} /></label><label>Unit price (₱)<input name="unitPrice" type="number" min="0" step="0.01" required defaultValue={expense === "new" ? "" : expense.unitPrice} /></label></div><div className="calculation-preview"><span>Calculated amount</span><strong>{formatCurrency(preview || (expense === "new" ? 0 : calculateExpenseAmount(expense)))}</strong></div><label>Expense date<input name="expenseDate" type="date" required defaultValue={expense === "new" ? new Date().toISOString().slice(0, 10) : expense.expenseDate} /></label><label>Notes<textarea name="notes" rows={3} defaultValue={expense === "new" ? "" : expense.notes} placeholder="Optional supplier or payment details" /></label>{category === "Piglets" && <div className="separation-note warning">Pig records and Piglets expenses are separate. Check that this cost has not already been entered as another expense.</div>}<div className="form-actions"><button className="secondary-button" type="button" onClick={onClose}>Cancel</button><button className="primary-button" disabled={saving}>{saving ? "Saving…" : "Save expense"}</button></div></form></Modal>;
}
