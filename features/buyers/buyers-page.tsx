"use client";

import { useState } from "react";
import { Icon } from "@/components/ui/icon";
import { PageHeader } from "@/features/shared/page-header";
import { ConfirmDelete, Modal } from "@/features/shared/modal";
import { formString } from "@/presentation/form-utils";
import type { Buyer, PiggyTrackData } from "@/domain/entities";
import type { BuyerInput } from "@/application/ports/piggy-track-repository";

interface BuyersPageProps { data: PiggyTrackData; saving: boolean; onSave: (input: BuyerInput, id?: string) => Promise<void>; onDelete: (id: string) => Promise<void> }

export function BuyersPage({ data, saving, onSave, onDelete }: BuyersPageProps) {
  const [editing, setEditing] = useState<Buyer | "new" | null>(null);
  const [deleting, setDeleting] = useState<Buyer | null>(null);
  const [error, setError] = useState<string | null>(null);
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); setError(null); const form = new FormData(event.currentTarget);
    try { await onSave({ name: formString(form, "name"), contactInformation: formString(form, "contactInformation"), notes: formString(form, "notes") }, editing === "new" ? undefined : editing?.id); setEditing(null); }
    catch (cause) { setError(cause instanceof Error ? cause.message : "Unable to save buyer."); }
  }
  return <><PageHeader eyebrow="Customer records" title="Buyers" description="Keep buyer details connected to every pig sale." actionLabel="Add buyer" onAction={() => setEditing("new")} /><section className="record-grid buyer-grid">{data.buyers.map((buyer) => { const saleCount = data.sales.filter((sale) => sale.buyerId === buyer.id).length; return <article className="record-card buyer-card" key={buyer.id}><div className="record-card-top"><span className="buyer-icon"><Icon name="buyers" /></span><div className="row-actions"><button type="button" onClick={() => setEditing(buyer)}>Edit</button><button className="delete-link" type="button" onClick={() => setDeleting(buyer)}>Delete</button></div></div><h2>{buyer.name}</h2><p>{buyer.contactInformation || "No contact information"}</p><div className="buyer-footer"><span>{saleCount} {saleCount === 1 ? "sale" : "sales"}</span><span>{buyer.notes || "No notes"}</span></div></article>; })}{data.buyers.length === 0 && <div className="inline-empty"><Icon name="buyers" /><h2>No buyers yet</h2><p>Add a buyer before recording the first sale.</p></div>}</section>
    {editing && <Modal title={editing === "new" ? "Add buyer" : "Edit buyer"} description="Contact details are optional and visible only to farm members." onClose={() => setEditing(null)}><form className="record-form" onSubmit={submit}>{error && <div className="form-error">{error}</div>}<label>Buyer name<input name="name" required maxLength={120} defaultValue={editing === "new" ? "" : editing.name} placeholder="e.g. Noy Boboy Slaughter House" /></label><label>Contact information<input name="contactInformation" defaultValue={editing === "new" ? "" : editing.contactInformation} placeholder="Phone number, address, or contact person" /></label><label>Notes<textarea name="notes" rows={3} defaultValue={editing === "new" ? "" : editing.notes} placeholder="Buyer type or other details" /></label><div className="form-actions"><button className="secondary-button" type="button" onClick={() => setEditing(null)}>Cancel</button><button className="primary-button" disabled={saving}>{saving ? "Saving…" : "Save buyer"}</button></div></form></Modal>}
    {deleting && <ConfirmDelete itemName={deleting.name} saving={saving} onCancel={() => setDeleting(null)} onConfirm={async () => { try { await onDelete(deleting.id); setDeleting(null); } catch { return; } }} />}
  </>;
}
