"use client";

import { useMemo, useState } from "react";
import { BatchSelector } from "@/components/batch-selector";
import { Icon } from "@/components/ui/icon";
import { AppSelect, selectOptions } from "@/components/ui/select";
import { ConfirmDelete, Modal } from "@/features/shared/modal";
import { PageHeader } from "@/features/shared/page-header";
import {
  calculateBillableWeight,
  calculateOutstandingBalance,
  calculateSaleTotal,
  getPaymentStatus,
} from "@/domain/calculations";
import { formatCurrency, formatDate, formatWeight } from "@/presentation/formatters";
import { formNumber, formString } from "@/presentation/form-utils";
import type { Payment, PigSale, PiggyTrackData } from "@/domain/entities";
import type { PaymentInput, SaleInput } from "@/application/ports/piggy-track-repository";

interface SalesPageProps {
  canEdit: boolean;
  data: PiggyTrackData;
  selectedBatchId: string;
  onBatchChange: (id: string) => void;
  saving: boolean;
  onSaveSale: (input: SaleInput, id?: string) => Promise<void>;
  onDeleteSale: (id: string) => Promise<void>;
  onSavePayment: (input: PaymentInput, id?: string) => Promise<void>;
  onDeletePayment: (id: string) => Promise<void>;
  onOpenBuyers: () => void;
}

export function SalesPage(props: SalesPageProps) {
  const {
    canEdit,
    data,
    selectedBatchId,
    onBatchChange,
    saving,
    onSaveSale,
    onDeleteSale,
    onSavePayment,
    onDeletePayment,
    onOpenBuyers,
  } = props;
  const [editingSale, setEditingSale] = useState<PigSale | "new" | null>(null);
  const [paymentSale, setPaymentSale] = useState<PigSale | null>(null);
  const [deletingSale, setDeletingSale] = useState<PigSale | null>(null);
  const sales = useMemo(
    () =>
      data.sales
        .filter((sale) => sale.batchId === selectedBatchId)
        .sort((a, b) => b.saleDate.localeCompare(a.saleDate)),
    [data.sales, selectedBatchId],
  );
  const outstanding = sales.reduce(
    (sum, sale) => sum + calculateOutstandingBalance(sale, data.payments),
    0,
  );
  return (
    <>
      <PageHeader
        canEdit={canEdit}
        eyebrow="Sales and collections"
        title="Sales"
        description="Record selling weights, buyers, due dates, and partial payments."
        actionLabel="Record sale"
        onAction={() => setEditingSale("new")}
      />
      <BatchSelector
        batches={data.batches}
        selectedBatchId={selectedBatchId}
        onChange={onBatchChange}
      />
      <div className="expense-overview sales-overview">
        <div>
          <span>Total sales</span>
          <strong>
            {formatCurrency(sales.reduce((sum, sale) => sum + calculateSaleTotal(sale), 0))}
          </strong>
        </div>
        <div>
          <span>Amount received</span>
          <strong>
            {formatCurrency(
              sales.reduce(
                (sum, sale) =>
                  sum + calculateSaleTotal(sale) - calculateOutstandingBalance(sale, data.payments),
                0,
              ),
            )}
          </strong>
        </div>
        <div>
          <span>Outstanding</span>
          <strong>{formatCurrency(outstanding)}</strong>
        </div>
      </div>
      <section className="sales-list">
        {sales.map((sale) => {
          const pig = data.pigs.find((item) => item.id === sale.pigId);
          const buyer = data.buyers.find((item) => item.id === sale.buyerId);
          const payments = data.payments
            .filter((item) => item.saleId === sale.id)
            .sort((a, b) => b.paymentDate.localeCompare(a.paymentDate));
          const balance = calculateOutstandingBalance(sale, data.payments);
          return (
            <article className="sale-card" key={sale.id}>
              <div className="sale-main">
                <div>
                  <span
                    className={`payment-badge payment-${getPaymentStatus(sale, data.payments).toLowerCase().replaceAll(" ", "-")}`}
                  >
                    {getPaymentStatus(sale, data.payments)}
                  </span>
                  <h2>{pig?.tagNumber ?? "Unknown pig"}</h2>
                  <p>
                    {buyer?.name ?? "Unknown buyer"} · Sold {formatDate(sale.saleDate)}
                  </p>
                </div>
                <div className="sale-total">
                  <strong>{formatCurrency(calculateSaleTotal(sale))}</strong>
                  <span>
                    {formatWeight(calculateBillableWeight(sale))} ×{" "}
                    {formatCurrency(sale.pricePerKg)}/kg
                  </span>
                </div>
              </div>
              <div className="sale-details">
                <span>
                  Actual: <strong>{formatWeight(sale.actualWeight)}</strong>
                </span>
                <span>
                  Deduction: <strong>{formatWeight(sale.weightDeduction)}</strong>
                </span>
                <span>
                  Due: <strong>{formatDate(sale.paymentDueDate)}</strong>
                </span>
                <span>
                  Balance: <strong>{formatCurrency(balance)}</strong>
                </span>
              </div>
              {canEdit ? (
                <div className="sale-actions">
                  <div className="row-actions">
                    <button type="button" onClick={() => setEditingSale(sale)}>
                      Edit sale
                    </button>
                    <button
                      className="delete-link"
                      type="button"
                      onClick={() => setDeletingSale(sale)}
                    >
                      Delete
                    </button>
                  </div>
                  {balance > 0 && (
                    <button
                      className="secondary-button small-button"
                      type="button"
                      onClick={() => setPaymentSale(sale)}
                    >
                      <Icon name="plus" />
                      Add payment
                    </button>
                  )}
                </div>
              ) : (
                <div className="row-actions" data-label="Actions">
                  <small>Read only</small>
                </div>
              )}
              {payments.length > 0 && (
                <div className="payment-list">
                  <h3>Payments</h3>
                  {payments.map((payment) => (
                    <div className="payment-item" key={payment.id}>
                      <span>
                        <strong>{formatCurrency(payment.amount)}</strong>
                        <small>
                          {formatDate(payment.paymentDate)} · {payment.paymentMethod}
                        </small>
                      </span>
                      {canEdit && (
                        <button
                          type="button"
                          onClick={() => void onDeletePayment(payment.id)}
                          disabled={saving}
                        >
                          Remove
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </article>
          );
        })}
        {sales.length === 0 && (
          <div className="inline-empty">
            <Icon name="sales" />
            <h2>No sales in this batch</h2>
            <p>Record a sale when a pig is sold.</p>
          </div>
        )}
      </section>
      {canEdit && editingSale && (
        <SaleModal
          sale={editingSale}
          data={data}
          selectedBatchId={selectedBatchId}
          saving={saving}
          onClose={() => setEditingSale(null)}
          onSave={onSaveSale}
          onOpenBuyers={onOpenBuyers}
        />
      )}
      {canEdit && paymentSale && (
        <PaymentModal
          sale={paymentSale}
          outstanding={calculateOutstandingBalance(paymentSale, data.payments)}
          saving={saving}
          onClose={() => setPaymentSale(null)}
          onSave={onSavePayment}
        />
      )}
      {canEdit && deletingSale && (
        <ConfirmDelete
          itemName={`sale for ${data.pigs.find((pig) => pig.id === deletingSale.pigId)?.tagNumber ?? "pig"}`}
          saving={saving}
          onCancel={() => setDeletingSale(null)}
          onConfirm={async () => {
            try {
              await onDeleteSale(deletingSale.id);
              setDeletingSale(null);
            } catch {
              return;
            }
          }}
        />
      )}
    </>
  );
}

function SaleModal({
  sale,
  data,
  selectedBatchId,
  saving,
  onClose,
  onSave,
  onOpenBuyers,
}: {
  sale: PigSale | "new";
  data: PiggyTrackData;
  selectedBatchId: string;
  saving: boolean;
  onClose: () => void;
  onSave: (input: SaleInput, id?: string) => Promise<void>;
  onOpenBuyers: () => void;
}) {
  const existing = sale === "new" ? null : sale;
  const [actual, setActual] = useState(existing?.actualWeight ?? 0);
  const [deduction, setDeduction] = useState(existing?.weightDeduction ?? 1);
  const [price, setPrice] = useState(existing?.pricePerKg ?? 190);
  const [error, setError] = useState<string | null>(null);
  const pigs = data.pigs.filter(
    (pig) =>
      pig.batchId === selectedBatchId && (pig.status === "Active" || pig.id === existing?.pigId),
  );
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    const form = new FormData(event.currentTarget);
    try {
      await onSave(
        {
          batchId: selectedBatchId,
          pigId: formString(form, "pigId"),
          buyerId: formString(form, "buyerId"),
          actualWeight: formNumber(form, "actualWeight"),
          weightDeduction: formNumber(form, "weightDeduction"),
          pricePerKg: formNumber(form, "pricePerKg"),
          saleDate: formString(form, "saleDate"),
          paymentDueDate: formString(form, "paymentDueDate"),
          notes: formString(form, "notes"),
        },
        existing?.id,
      );
      onClose();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to save sale.");
    }
  }
  if (data.buyers.length === 0)
    return (
      <Modal title="Add a buyer first" onClose={onClose}>
        <div className="inline-empty compact">
          <Icon name="buyers" />
          <p>Every sale must belong to a buyer.</p>
          <button
            className="primary-button"
            type="button"
            onClick={() => {
              onClose();
              onOpenBuyers();
            }}
          >
            Go to buyers
          </button>
        </div>
      </Modal>
    );
  return (
    <Modal
      title={existing ? "Edit sale" : "Record pig sale"}
      description="Billable weight and total are calculated automatically."
      onClose={onClose}
    >
      <form className="record-form" onSubmit={submit}>
        {error && <div className="form-error">{error}</div>}
        <div className="form-grid">
          <label>
            Pig
            <AppSelect
              ariaLabel="Pig"
              name="pigId"
              required
              defaultValue={existing?.pigId ?? pigs[0]?.id}
              options={pigs.map((pig) => ({ value: pig.id, label: pig.tagNumber }))}
            />
          </label>
          <label>
            Buyer
            <AppSelect
              ariaLabel="Buyer"
              name="buyerId"
              required
              defaultValue={existing?.buyerId ?? data.buyers[0]?.id}
              options={data.buyers.map((buyer) => ({ value: buyer.id, label: buyer.name }))}
            />
          </label>
        </div>
        <div className="form-grid three">
          <label>
            Actual weight (kg)
            <input
              name="actualWeight"
              type="number"
              min="0"
              step="0.1"
              required
              value={actual || ""}
              onChange={(event) => setActual(Number(event.target.value))}
            />
          </label>
          <label>
            Deduction (kg)
            <input
              name="weightDeduction"
              type="number"
              min="0"
              step="0.1"
              required
              value={deduction}
              onChange={(event) => setDeduction(Number(event.target.value))}
            />
          </label>
          <label>
            Price per kg (₱)
            <input
              name="pricePerKg"
              type="number"
              min="0"
              step="0.01"
              required
              value={price}
              onChange={(event) => setPrice(Number(event.target.value))}
            />
          </label>
        </div>
        <div className="sale-preview">
          <div>
            <span>Billable weight</span>
            <strong>{formatWeight(Math.max(0, actual - deduction))}</strong>
          </div>
          <div>
            <span>Sale total</span>
            <strong>{formatCurrency(Math.max(0, actual - deduction) * price)}</strong>
          </div>
        </div>
        <div className="form-grid">
          <label>
            Sale date
            <input
              name="saleDate"
              type="date"
              required
              defaultValue={existing?.saleDate ?? new Date().toISOString().slice(0, 10)}
            />
          </label>
          <label>
            Payment due date
            <input
              name="paymentDueDate"
              type="date"
              required
              defaultValue={existing?.paymentDueDate ?? new Date().toISOString().slice(0, 10)}
            />
          </label>
        </div>
        <label>
          Notes
          <textarea name="notes" rows={3} defaultValue={existing?.notes ?? ""} />
        </label>
        <div className="form-actions">
          <button className="secondary-button" type="button" onClick={onClose}>
            Cancel
          </button>
          <button className="primary-button" disabled={saving || pigs.length === 0}>
            {saving ? "Saving…" : "Save sale"}
          </button>
        </div>
      </form>
    </Modal>
  );
}

function PaymentModal({
  sale,
  outstanding,
  saving,
  onClose,
  onSave,
}: {
  sale: PigSale;
  outstanding: number;
  saving: boolean;
  onClose: () => void;
  onSave: (input: PaymentInput, id?: string) => Promise<void>;
}) {
  const [error, setError] = useState<string | null>(null);
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    const form = new FormData(event.currentTarget);
    try {
      await onSave({
        saleId: sale.id,
        amount: formNumber(form, "amount"),
        paymentDate: formString(form, "paymentDate"),
        paymentMethod: formString(form, "paymentMethod") as Payment["paymentMethod"],
        notes: formString(form, "notes"),
      });
      onClose();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to save payment.");
    }
  }
  return (
    <Modal
      title="Record payment"
      description={`Outstanding balance: ${formatCurrency(outstanding)}`}
      onClose={onClose}
    >
      <form className="record-form" onSubmit={submit}>
        {error && <div className="form-error">{error}</div>}
        <label>
          Amount received (₱)
          <input
            name="amount"
            type="number"
            min="0.01"
            max={outstanding}
            step="0.01"
            required
            defaultValue={outstanding}
          />
        </label>
        <div className="form-grid">
          <label>
            Payment date
            <input
              name="paymentDate"
              type="date"
              required
              defaultValue={new Date().toISOString().slice(0, 10)}
            />
          </label>
          <label>
            Method
            <AppSelect
              ariaLabel="Payment method"
              name="paymentMethod"
              defaultValue="Cash"
              options={selectOptions(["Cash", "Bank Transfer", "GCash", "Other"])}
            />
          </label>
        </div>
        <label>
          Notes
          <textarea name="notes" rows={3} />
        </label>
        <div className="form-actions">
          <button className="secondary-button" type="button" onClick={onClose}>
            Cancel
          </button>
          <button className="primary-button" disabled={saving}>
            {saving ? "Saving…" : "Save payment"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
