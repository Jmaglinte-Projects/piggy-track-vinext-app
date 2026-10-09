"use client";

import { useState } from "react";
import { Icon } from "@/components/ui/icon";
import { AppSelect, selectOptions } from "@/components/ui/select";
import { PageHeader } from "@/features/shared/page-header";
import { ConfirmDelete, Modal } from "@/features/shared/modal";
import { batchStatuses, formString } from "@/lib/options";
import { formatDate } from "@/lib/formatters";
import type { Batch, BatchStatus, PiggyTrackData } from "@/types/domain";
import type { BatchInput } from "@/services/piggy-track-repository";

interface BatchesPageProps { data: PiggyTrackData; saving: boolean; onSave: (input: BatchInput, id?: string) => Promise<void>; onDelete: (id: string) => Promise<void> }

export function BatchesPage({ data, saving, onSave, onDelete }: BatchesPageProps) {
  const [editing, setEditing] = useState<Batch | "new" | null>(null);
  const [deleting, setDeleting] = useState<Batch | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); setFormError(null);
    const form = new FormData(event.currentTarget);
    try {
      await onSave({ name: formString(form, "name"), startDate: formString(form, "startDate"), endDate: formString(form, "endDate") || null, status: formString(form, "status") as BatchStatus, notes: formString(form, "notes") }, editing === "new" ? undefined : editing?.id);
      setEditing(null);
    } catch (cause) { setFormError(cause instanceof Error ? cause.message : "Unable to save batch."); }
  }

  return <><PageHeader eyebrow="Raising cycles" title="Batches" description="Organize pigs and transactions by raising cycle." actionLabel="New batch" onAction={() => setEditing("new")} />
    <section className="record-grid batch-grid">
      {data.batches.map((batch) => {
        const pigs = data.pigs.filter((pig) => pig.batchId === batch.id);
        const expenses = data.expenses.filter((expense) => expense.batchId === batch.id).length;
        return <article className="record-card" key={batch.id}><div className="record-card-top"><span className={`status-pill status-${batch.status.toLowerCase()}`}>{batch.status}</span><div className="row-actions"><button type="button" onClick={() => setEditing(batch)} aria-label={`Edit ${batch.name}`}>Edit</button><button type="button" className="delete-link" onClick={() => setDeleting(batch)} aria-label={`Delete ${batch.name}`}>Delete</button></div></div><h2>{batch.name}</h2><p>{batch.notes || "No notes added."}</p><div className="batch-dates"><span><Icon name="calendar" />{formatDate(batch.startDate)}</span><span>{batch.endDate ? `Ended ${formatDate(batch.endDate)}` : "Ongoing"}</span></div><div className="record-stats"><div><strong>{pigs.length}</strong><span>Pigs</span></div><div><strong>{pigs.filter((pig) => pig.status === "Active").length}</strong><span>Active</span></div><div><strong>{expenses}</strong><span>Expenses</span></div></div></article>;
      })}
      {data.batches.length === 0 && <div className="inline-empty"><Icon name="batches" /><h2>No batches yet</h2><p>Create a batch to start recording pigs and expenses.</p></div>}
    </section>
    {editing && <Modal title={editing === "new" ? "Create batch" : "Edit batch"} description="A batch represents one complete pig-raising cycle." onClose={() => setEditing(null)}><form className="record-form" onSubmit={submit}>{formError && <div className="form-error">{formError}</div>}<label>Batch name<input name="name" required maxLength={120} defaultValue={editing === "new" ? "" : editing.name} placeholder="e.g. Piggy Bank — Tabeki 2027" /></label><div className="form-grid"><label>Start date<input name="startDate" type="date" required defaultValue={editing === "new" ? new Date().toISOString().slice(0, 10) : editing.startDate} /></label><label>End date<input name="endDate" type="date" defaultValue={editing === "new" ? "" : editing.endDate ?? ""} /></label></div><label>Status<AppSelect ariaLabel="Batch status" name="status" defaultValue={editing === "new" ? "Active" : editing.status} options={selectOptions(batchStatuses)} /></label><label>Notes<textarea name="notes" rows={3} defaultValue={editing === "new" ? "" : editing.notes} placeholder="Optional details about this cycle" /></label><div className="form-actions"><button className="secondary-button" type="button" onClick={() => setEditing(null)}>Cancel</button><button className="primary-button" disabled={saving}>{saving ? "Saving…" : "Save batch"}</button></div></form></Modal>}
    {deleting && <ConfirmDelete itemName={deleting.name} saving={saving} onCancel={() => setDeleting(null)} onConfirm={async () => { try { await onDelete(deleting.id); setDeleting(null); } catch { return; } }} />}
  </>;
}
