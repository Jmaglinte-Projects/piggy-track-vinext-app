"use client";

import { DatePicker } from "@/components/ui/date-picker";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { AppSelect } from "@/components/ui/select";
import { Dialog, DialogContent, DialogTrigger, DialogClose } from "@/components/ui/dialog";
import { InvestmentSummary } from "@/features/investments/investment-summary";
import { investmentCategories } from "@/domain/investments";
import { formNumber, formString } from "@/presentation/form-utils";
import { formatCurrency, formatDate } from "@/presentation/formatters";
import type { FarmInvestment, PiggyTrackData } from "@/domain/entities";
import type { InvestmentInput } from "@/application/ports/piggy-track-repository";

interface Props {
  canEdit: boolean;
  data: PiggyTrackData;
  saving: boolean;
  onSave: (input: InvestmentInput, id?: string) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
}

export function InvestmentsPage({ canEdit, data, saving, onSave, onDelete }: Props) {
  return (
    <>
      <div className="page-heading records-heading flex-wrap">
        <div>
          <p className="eyebrow">Farm setup and assets</p>
          <h1>Farm Investments</h1>
          <p>Record costs that serve the whole farm across many batches.</p>
        </div>
        {canEdit && <InvestmentEditor saving={saving} onSave={onSave} />}
      </div>
      <InvestmentSummary investments={data.investments} />
      <section className="grid gap-4 sm:grid-cols-2" aria-label="Investment records">
        {[...data.investments]
          .sort((a, b) => b.investmentDate.localeCompare(a.investmentDate))
          .map((item) => (
            <article className="record-card min-w-0" key={item.id}>
              <p className="eyebrow">{item.category}</p>
              <h2 className="break-words">{item.name}</h2>
              <strong className="mt-3 block text-2xl text-[#315c50]">
                {formatCurrency(item.amount)}
              </strong>
              <p className="mt-2 text-sm text-[#68746f]">{formatDate(item.investmentDate)}</p>
              {item.notes && (
                <p className="mt-3 whitespace-pre-wrap break-words text-sm">{item.notes}</p>
              )}
              {!canEdit && <p className="mt-4 text-sm text-[#68746f]">Read only</p>}
              {canEdit && (
                <div className="mt-4 flex gap-3">
                  <InvestmentEditor investment={item} saving={saving} onSave={onSave} />
                  <InvestmentDelete investment={item} saving={saving} onDelete={onDelete} />
                </div>
              )}
            </article>
          ))}
      </section>
    </>
  );
}

function InvestmentEditor({
  investment,
  saving,
  onSave,
}: {
  investment?: FarmInvestment;
  saving: boolean;
  onSave: Props["onSave"];
}) {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    const form = new FormData(event.currentTarget);
    try {
      await onSave(
        {
          name: formString(form, "name"),
          category: formString(form, "category") as FarmInvestment["category"],
          amount: formNumber(form, "amount"),
          investmentDate: formString(form, "investmentDate"),
          notes: formString(form, "notes"),
        },
        investment?.id,
      );
      setOpen(false);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to save investment.");
    }
  }
  return (
    <Dialog
      open={open}
      onOpenChange={(value) => {
        if (!saving) {
          setOpen(value);
          setError(null);
        }
      }}
    >
      <DialogTrigger asChild>
        <Button
          className={investment ? "secondary-button" : "primary-button"}
          disabled={saving}
          aria-label={investment ? `Edit ${investment.name}` : "Add investment"}
        >
          {investment ? "Edit" : "Add investment"}
        </Button>
      </DialogTrigger>
      <DialogContent
        busy={saving}
        title={investment ? "Edit investment" : "Add investment"}
        description="This cost belongs to the whole farm and is excluded from batch expenses."
      >
        <form className="record-form" onSubmit={submit}>
          {error && (
            <div className="form-error" role="alert">
              {error}
            </div>
          )}
          <fieldset disabled={saving} className="grid gap-4 border-0 p-0">
            <label>
              Investment name
              <Input
                name="name"
                required
                maxLength={120}
                defaultValue={investment?.name ?? ""}
                placeholder="e.g. Pigpen construction"
              />
            </label>
            <label htmlFor={investment ? `category-${investment.id}` : "new-investment-category"}>
              Category
            </label>
            <AppSelect
              id={investment ? `category-${investment.id}` : "new-investment-category"}
              name="category"
              ariaLabel="Investment category"
              required
              disabled={saving}
              defaultValue={investment?.category ?? "Construction"}
              options={investmentCategories.map((value) => ({ value }))}
            />
            <label>
              Amount (₱)
              <Input
                name="amount"
                type="number"
                required
                min="0.01"
                max="9999999999.99"
                step="0.01"
                defaultValue={investment?.amount}
              />
            </label>
            <label>
              Investment date
              <DatePicker
                name="investmentDate"
                ariaLabel="Investment date"
                required
                min="0001-01-01"
                max="9999-12-31"
                defaultValue={
                  investment?.investmentDate ??
                  new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Manila" })
                }
              />
            </label>
            <label>
              Notes (optional)
              <Textarea name="notes" rows={3} defaultValue={investment?.notes ?? ""} />
            </label>
          </fieldset>
          <div className="form-actions">
            <DialogClose asChild>
              <Button className="secondary-button" type="button" disabled={saving}>
                Cancel
              </Button>
            </DialogClose>
            <Button className="primary-button" type="submit" disabled={saving}>
              {saving ? "Saving…" : "Save investment"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function InvestmentDelete({
  investment,
  saving,
  onDelete,
}: {
  investment: FarmInvestment;
  saving: boolean;
  onDelete: Props["onDelete"];
}) {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  return (
    <Dialog
      open={open}
      onOpenChange={(value) => {
        if (!saving) {
          setOpen(value);
          setError(null);
        }
      }}
    >
      <DialogTrigger asChild>
        <Button
          className="secondary-button text-red-700"
          disabled={saving}
          aria-label={`Delete ${investment.name}`}
        >
          Delete
        </Button>
      </DialogTrigger>
      <DialogContent
        busy={saving}
        title="Delete investment?"
        description="This removes the record from your farm investment total. It cannot be undone."
      >
        <p className="break-words">
          {investment.name} · {formatCurrency(investment.amount)}
        </p>
        {error && (
          <div className="form-error" role="alert">
            {error}
          </div>
        )}
        <div className="form-actions">
          <DialogClose asChild>
            <Button className="secondary-button" disabled={saving}>
              Keep record
            </Button>
          </DialogClose>
          <Button
            className="danger-button"
            disabled={saving}
            onClick={async () => {
              try {
                await onDelete(investment.id);
                setOpen(false);
              } catch (cause) {
                setError(cause instanceof Error ? cause.message : "Unable to delete investment.");
              }
            }}
          >
            {saving ? "Deleting…" : "Delete investment"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
