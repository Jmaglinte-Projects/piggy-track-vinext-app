"use client";

import { useMemo, useState } from "react";
import { BatchSelector } from "@/components/batch-selector";
import { AppSelect, selectOptions } from "@/components/ui/select";
import { PageHeader } from "@/features/shared/page-header";
import { ConfirmDelete, Modal } from "@/features/shared/modal";
import { formNumber, formString, pigStatuses } from "@/lib/options";
import { formatCurrency, formatWeight } from "@/lib/formatters";
import type { Pig, PigStatus, PiggyTrackData } from "@/types/domain";
import type { PigInput } from "@/services/piggy-track-repository";

interface PigsPageProps { data: PiggyTrackData; selectedBatchId: string; onBatchChange: (id: string) => void; saving: boolean; onSave: (input: PigInput, id?: string) => Promise<void>; onDelete: (id: string) => Promise<void> }

export function PigsPage({ data, selectedBatchId, onBatchChange, saving, onSave, onDelete }: PigsPageProps) {
  const [editing, setEditing] = useState<Pig | "new" | null>(null);
  const [deleting, setDeleting] = useState<Pig | null>(null);
  const [filter, setFilter] = useState<"All" | PigStatus>("All");
  const [formError, setFormError] = useState<string | null>(null);
  const pigs = useMemo(() => data.pigs.filter((pig) => pig.batchId === selectedBatchId && (filter === "All" || pig.status === filter)), [data.pigs, filter, selectedBatchId]);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); setFormError(null);
    const form = new FormData(event.currentTarget);
    try {
      await onSave({ batchId: formString(form, "batchId"), tagNumber: formString(form, "tagNumber"), purchasePrice: formNumber(form, "purchasePrice"), purchaseWeight: formNumber(form, "purchaseWeight"), currentWeight: formNumber(form, "currentWeight"), status: formString(form, "status") as PigStatus, notes: formString(form, "notes") }, editing === "new" ? undefined : editing?.id);
      setEditing(null);
    } catch (cause) { setFormError(cause instanceof Error ? cause.message : "Unable to save pig."); }
  }

  return <><PageHeader eyebrow="Herd records" title="Pigs" description="Track each pig from purchase through sale." actionLabel="Add pig" onAction={() => setEditing("new")} /><BatchSelector batches={data.batches} selectedBatchId={selectedBatchId} onChange={onBatchChange} />
    <div className="filter-bar" role="group" aria-label="Filter pigs by status">{["All", ...pigStatuses].map((status) => <button className={filter === status ? "active" : ""} type="button" key={status} onClick={() => setFilter(status as "All" | PigStatus)}>{status}<span>{status === "All" ? data.pigs.filter((pig) => pig.batchId === selectedBatchId).length : data.pigs.filter((pig) => pig.batchId === selectedBatchId && pig.status === status).length}</span></button>)}</div>
    <section className="table-panel"><div className="record-table pig-table"><div className="table-head"><span>Identifier</span><span>Purchase</span><span>Weight</span><span>Status</span><span>Actions</span></div>{pigs.map((pig) => <div className="table-row" key={pig.id}><div data-label="Identifier"><strong>{pig.tagNumber}</strong><small>{pig.notes || "No notes"}</small></div><div data-label="Purchase"><strong>{formatCurrency(pig.purchasePrice)}</strong><small>{formatWeight(pig.purchaseWeight)} at intake</small></div><div data-label="Weight"><strong>{formatWeight(pig.currentWeight)}</strong><small>Current weight</small></div><div data-label="Status"><span className={`status-pill status-${pig.status.toLowerCase()}`}>{pig.status}</span></div><div className="row-actions" data-label="Actions"><button type="button" onClick={() => setEditing(pig)}>Edit</button><button type="button" className="delete-link" onClick={() => setDeleting(pig)}>Delete</button></div></div>)}</div>{pigs.length === 0 && <div className="inline-empty compact"><h2>No pigs found</h2><p>Add a pig or choose a different status filter.</p></div>}</section>
    {editing && <Modal title={editing === "new" ? "Add pig" : `Edit ${editing.tagNumber}`} description="Purchase details stay separate from expense transactions." onClose={() => setEditing(null)}><form className="record-form" onSubmit={submit}>{formError && <div className="form-error">{formError}</div>}<label>Batch<AppSelect ariaLabel="Batch" name="batchId" defaultValue={editing === "new" ? selectedBatchId : editing.batchId} required options={data.batches.filter((batch) => batch.status !== "Archived").map((batch) => ({ value: batch.id, label: batch.name }))} /></label><label>Tag number or identifier<input name="tagNumber" required maxLength={60} defaultValue={editing === "new" ? "" : editing.tagNumber} placeholder="e.g. TBK-07" /></label><div className="form-grid"><label>Purchase price (₱)<input name="purchasePrice" type="number" min="0" step="0.01" required defaultValue={editing === "new" ? "" : editing.purchasePrice} /></label><label>Purchase weight (kg)<input name="purchaseWeight" type="number" min="0" step="0.1" required defaultValue={editing === "new" ? "" : editing.purchaseWeight} /></label></div><div className="form-grid"><label>Current weight (kg)<input name="currentWeight" type="number" min="0" step="0.1" required defaultValue={editing === "new" ? "" : editing.currentWeight} /></label><label>Status<AppSelect ariaLabel="Pig status" name="status" defaultValue={editing === "new" ? "Active" : editing.status} options={selectOptions(pigStatuses)} /></label></div><label>Notes<textarea name="notes" rows={3} defaultValue={editing === "new" ? "" : editing.notes} placeholder="Optional health or identification notes" /></label><div className="separation-note">Pig purchase details do not affect expense totals. Record a separate Piglets expense when needed.</div><div className="form-actions"><button className="secondary-button" type="button" onClick={() => setEditing(null)}>Cancel</button><button className="primary-button" disabled={saving}>{saving ? "Saving…" : "Save pig"}</button></div></form></Modal>}
    {deleting && <ConfirmDelete itemName={deleting.tagNumber} saving={saving} onCancel={() => setDeleting(null)} onConfirm={async () => { try { await onDelete(deleting.id); setDeleting(null); } catch { return; } }} />}
  </>;
}
