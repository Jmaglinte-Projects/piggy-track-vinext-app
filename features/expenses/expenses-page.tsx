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

interface ExpensesPageProps {
  canEdit: boolean;
  data: PiggyTrackData;
  selectedBatchId: string;
  onBatchChange: (id: string) => void;
  saving: boolean;
  onSave: (input: ExpenseInput, id?: string) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  onReconcile: (batchId: string) => Promise<void>;
}

export function ExpensesPage({
  canEdit,
  data,
  selectedBatchId,
  onBatchChange,
  saving,
  onSave,
  onDelete,
  onReconcile,
}: ExpensesPageProps) {
  const [reviewing, setReviewing] = useState(false);
  const [reviewError, setReviewError] = useState<string | null>(null);
  const batch = data.batches.find((item) => item.id === selectedBatchId);
  const purchaseTotal = data.pigs
    .filter((pig) => pig.batchId === selectedBatchId)
    .reduce((sum, pig) => sum + pig.purchasePrice, 0);
  const legacyPurchases = data.expenses.filter(
    (expense) =>
      expense.batchId === selectedBatchId &&
      expense.category === "Piglets" &&
      !expense.pigId &&
      !expense.superseded,
  );
  const legacyTotal = calculateBatchExpenses(legacyPurchases);
  const [editing, setEditing] = useState<Expense | "new" | null>(null);
  const [deleting, setDeleting] = useState<Expense | null>(null);
  const [filter, setFilter] = useState<"All" | ExpenseCategory>("All");
  const allExpenses = useMemo(
    () => data.expenses.filter((expense) => expense.batchId === selectedBatchId),
    [data.expenses, selectedBatchId],
  );
  const expenses =
    filter === "All" ? allExpenses : allExpenses.filter((expense) => expense.category === filter);
  const usedCategories = expenseCategories.filter((category) =>
    allExpenses.some((expense) => expense.category === category),
  );

  return (
    <>
      <PageHeader
        canEdit={canEdit}
        eyebrow="Financial ledger"
        title="Expenses"
        description={
          batch?.purchaseCostsReconciled === false
            ? "Review manual purchase costs to enable automatic purchases. Add feed and other costs here."
            : "Pig purchases are recorded automatically. Add feed and other costs here."
        }
        actionLabel="Add expense"
        onAction={() => setEditing("new")}
      />
      <BatchSelector
        batches={data.batches}
        selectedBatchId={selectedBatchId}
        onChange={onBatchChange}
      />
      {batch?.purchaseCostsReconciled === false && (
        <div className="separation-note warning">
          <strong>Review existing pig purchase costs</strong>
          <p>
            This batch uses manual Piglets expenses. Review them before enabling automatic purchase
            costs.
          </p>
          {canEdit && (
            <button
              type="button"
              className="secondary-button"
              disabled={saving}
              onClick={() => {
                setReviewError(null);
                setReviewing(true);
              }}
            >
              Review purchase costs
            </button>
          )}
        </div>
      )}
      <div className="expense-overview">
        <div>
          <span>Batch expenses</span>
          <strong>{formatCurrency(calculateBatchExpenses(allExpenses))}</strong>
        </div>
        <div>
          <span>Transactions</span>
          <strong>{allExpenses.filter((expense) => !expense.superseded).length}</strong>
        </div>
        <div>
          <span>Feed expenses</span>
          <strong>
            {formatCurrency(
              calculateBatchExpenses(allExpenses.filter((expense) => expense.category === "Feed")),
            )}
          </strong>
        </div>
      </div>
      <div className="filter-bar scrollable" role="group" aria-label="Filter expenses by category">
        {["All", ...usedCategories].map((category) => (
          <button
            className={filter === category ? "active" : ""}
            type="button"
            key={category}
            onClick={() => setFilter(category as "All" | ExpenseCategory)}
          >
            {category}
          </button>
        ))}
      </div>
      <section className="table-panel">
        <div className="record-table expense-table">
          <div className="table-head">
            <span>Description</span>
            <span>Date</span>
            <span>Quantity</span>
            <span>Amount</span>
            <span>Actions</span>
          </div>
          {expenses.map((expense) => (
            <div className="table-row" key={expense.id}>
              <div data-label="Description">
                <strong>{expense.description}</strong>
                <small>
                  {expense.category}
                  {expense.pigId
                    ? " · Linked purchase"
                    : expense.superseded
                      ? " · Replaced — excluded from totals"
                      : ""}
                  {expense.feedType ? ` · ${expense.feedType}` : ""}
                </small>
              </div>
              <div data-label="Date">
                <strong>{formatDate(expense.expenseDate)}</strong>
                <small>{expense.notes || "No notes"}</small>
              </div>
              <div data-label="Quantity">
                <strong>
                  {expense.quantity} {expense.unit}
                </strong>
                <small>{formatCurrency(expense.unitPrice)} each</small>
              </div>
              <div data-label="Amount">
                <strong>{formatCurrency(calculateExpenseAmount(expense))}</strong>
              </div>
              {canEdit ? (
                <div className="row-actions" data-label="Actions">
                  {expense.pigId || expense.superseded ? (
                    <small>{expense.pigId ? "Edit purchase in Pigs" : "Purchase history"}</small>
                  ) : (
                    <>
                      <button type="button" onClick={() => setEditing(expense)}>
                        Edit
                      </button>
                      <button
                        type="button"
                        className="delete-link"
                        onClick={() => setDeleting(expense)}
                      >
                        Delete
                      </button>
                    </>
                  )}
                </div>
              ) : (
                <div className="row-actions" data-label="Actions">
                  <small>Read only</small>
                </div>
              )}
            </div>
          ))}
        </div>
        {expenses.length === 0 && (
          <div className="inline-empty compact">
            <h2>No expenses found</h2>
            <p>Add an expense or choose another category.</p>
          </div>
        )}
      </section>
      {canEdit && reviewing && batch && (
        <Modal
          title="Review purchase costs"
          description={`Reconcile ${batch.name}`}
          onClose={() => setReviewing(false)}
        >
          <div className="record-form">
            {reviewError && <div className="form-error">{reviewError}</div>}
            <p>
              Confirm each pig's purchase price in Pigs before continuing. Any transport or other
              extra costs in a manual Piglets entry should first be recorded in the correct expense
              category.
            </p>
            {legacyPurchases.map((expense) => (
              <p key={expense.id}>
                {expense.description}:{" "}
                <strong>{formatCurrency(calculateExpenseAmount(expense))}</strong>
              </p>
            ))}
            <div className="calculation-preview">
              <span>Manual Piglets entries being replaced</span>
              <strong>{formatCurrency(legacyTotal)}</strong>
            </div>
            <div className="calculation-preview">
              <span>Linked pig purchase costs</span>
              <strong>{formatCurrency(purchaseTotal)}</strong>
            </div>
            <div className="calculation-preview">
              <span>New batch total expenses</span>
              <strong>
                {formatCurrency(calculateBatchExpenses(allExpenses) - legacyTotal + purchaseTotal)}
              </strong>
            </div>
            <p>
              Old entries will stay as history and be excluded from totals. Future purchase price
              changes will update the linked expenses automatically. This change cannot be reversed.
            </p>
            <div className="form-actions">
              <button
                className="secondary-button"
                type="button"
                onClick={() => setReviewing(false)}
              >
                Cancel
              </button>
              <button
                className="primary-button"
                type="button"
                disabled={saving}
                onClick={async () => {
                  try {
                    await onReconcile(selectedBatchId);
                    setReviewing(false);
                  } catch (cause) {
                    setReviewError(
                      cause instanceof Error ? cause.message : "Unable to reconcile purchases.",
                    );
                  }
                }}
              >
                {saving ? "Saving…" : "Confirm purchase costs"}
              </button>
            </div>
          </div>
        </Modal>
      )}
      {canEdit && editing && (
        <ExpenseModal
          expense={editing}
          batches={data.batches}
          selectedBatchId={selectedBatchId}
          saving={saving}
          onClose={() => setEditing(null)}
          onSave={onSave}
        />
      )}
      {canEdit && deleting && (
        <ConfirmDelete
          itemName={deleting.description}
          saving={saving}
          onCancel={() => setDeleting(null)}
          onConfirm={async () => {
            try {
              await onDelete(deleting.id);
              setDeleting(null);
            } catch {
              return;
            }
          }}
        />
      )}
    </>
  );
}

function ExpenseModal({
  expense,
  batches,
  selectedBatchId,
  saving,
  onClose,
  onSave,
}: {
  expense: Expense | "new";
  batches: PiggyTrackData["batches"];
  selectedBatchId: string;
  saving: boolean;
  onClose: () => void;
  onSave: (input: ExpenseInput, id?: string) => Promise<void>;
}) {
  const [category, setCategory] = useState<ExpenseCategory>(
    expense === "new" ? "Feed" : expense.category,
  );
  const [formError, setFormError] = useState<string | null>(null);
  const [preview, setPreview] = useState(0);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError(null);
    const form = new FormData(event.currentTarget);
    try {
      const input: ExpenseInput = {
        batchId: formString(form, "batchId"),
        category,
        description: formString(form, "description"),
        quantity: formNumber(form, "quantity"),
        unit: formString(form, "unit"),
        unitPrice: formNumber(form, "unitPrice"),
        expenseDate: formString(form, "expenseDate"),
        notes: formString(form, "notes"),
        ...(category === "Feed" ? { feedType: formString(form, "feedType") as FeedType } : {}),
      };
      await onSave(input, expense === "new" ? undefined : expense.id);
      onClose();
    } catch (cause) {
      setFormError(cause instanceof Error ? cause.message : "Unable to save expense.");
    }
  }

  function updatePreview(event: React.FormEvent<HTMLFormElement>) {
    const form = new FormData(event.currentTarget);
    setPreview(Number(form.get("quantity") ?? 0) * Number(form.get("unitPrice") ?? 0));
  }

  const batchOptions = batches
    .filter((batch) => batch.status !== "Archived")
    .map((batch) => ({ value: batch.id, label: batch.name }));
  return (
    <Modal
      title={expense === "new" ? "Add expense" : "Edit expense"}
      description="The amount is calculated from quantity × unit price."
      onClose={onClose}
    >
      <form className="record-form" onSubmit={submit} onInput={updatePreview}>
        {formError && <div className="form-error">{formError}</div>}
        <div className="form-grid">
          <label>
            Batch
            <AppSelect
              ariaLabel="Batch"
              name="batchId"
              defaultValue={expense === "new" ? selectedBatchId : expense.batchId}
              required
              options={batchOptions}
            />
          </label>
          <label>
            Category
            <AppSelect
              ariaLabel="Category"
              name="category"
              value={category}
              onValueChange={(value) => setCategory(value as ExpenseCategory)}
              options={selectOptions(
                expenseCategories.filter(
                  (item) =>
                    item !== "Piglets" || (expense !== "new" && expense.category === "Piglets"),
                ),
              )}
            />
          </label>
        </div>
        {category === "Feed" && (
          <label>
            Feed type
            <AppSelect
              ariaLabel="Feed type"
              name="feedType"
              defaultValue={expense !== "new" ? expense.feedType : "Starter"}
              required
              options={selectOptions(feedTypes)}
            />
          </label>
        )}
        <label>
          Description
          <input
            name="description"
            required
            maxLength={160}
            defaultValue={expense === "new" ? "" : expense.description}
            placeholder="What was purchased or paid for?"
          />
        </label>
        <div className="form-grid three">
          <label>
            Quantity
            <input
              name="quantity"
              type="number"
              min="0.001"
              step="0.001"
              required
              defaultValue={expense === "new" ? 1 : expense.quantity}
            />
          </label>
          <label>
            Unit
            <input
              name="unit"
              required
              maxLength={30}
              defaultValue={
                expense === "new" ? (category === "Feed" ? "sack" : "item") : expense.unit
              }
            />
          </label>
          <label>
            Unit price (₱)
            <input
              name="unitPrice"
              type="number"
              min="0"
              step="0.01"
              required
              defaultValue={expense === "new" ? "" : expense.unitPrice}
            />
          </label>
        </div>
        <div className="calculation-preview">
          <span>Calculated amount</span>
          <strong>
            {formatCurrency(preview || (expense === "new" ? 0 : calculateExpenseAmount(expense)))}
          </strong>
        </div>
        <label>
          Expense date
          <input
            name="expenseDate"
            type="date"
            required
            defaultValue={
              expense === "new" ? new Date().toISOString().slice(0, 10) : expense.expenseDate
            }
          />
        </label>
        <label>
          Notes
          <textarea
            name="notes"
            rows={3}
            defaultValue={expense === "new" ? "" : expense.notes}
            placeholder="Optional supplier or payment details"
          />
        </label>
        {category === "Piglets" && (
          <div className="separation-note warning">
            This is a legacy purchase entry. Review purchase costs to replace it with linked pig
            purchases. Move any extra costs to their correct categories first.
          </div>
        )}
        <div className="form-actions">
          <button className="secondary-button" type="button" onClick={onClose}>
            Cancel
          </button>
          <button className="primary-button" disabled={saving}>
            {saving ? "Saving…" : "Save expense"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
