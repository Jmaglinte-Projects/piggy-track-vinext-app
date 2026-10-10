"use client";

import { useEffect, useState } from "react";
import { Icon } from "@/components/ui/icon";
import { ConfirmDelete } from "@/features/shared/modal";
import { formatDate } from "@/presentation/formatters";
import type {
  FarmInvitation,
  FarmMember,
  WorkspaceSnapshot,
} from "@/application/ports/piggy-track-repository";

interface SettingsPageProps {
  workspace: WorkspaceSnapshot;
  cloudEnabled: boolean;
  saving: boolean;
  onSwitchFarm: (farmId: string) => Promise<void>;
  onRenameFarm: (name: string) => Promise<void>;
  onCreateInvitation: () => Promise<FarmInvitation>;
  onAcceptInvitation: (code: string) => Promise<void>;
  onRemoveMember: (userId: string) => Promise<void>;
}

export function SettingsPage({
  workspace,
  cloudEnabled,
  saving,
  onSwitchFarm,
  onRenameFarm,
  onCreateInvitation,
  onAcceptInvitation,
  onRemoveMember,
}: SettingsPageProps) {
  const [farmName, setFarmName] = useState(workspace.farmName);
  const [invitation, setInvitation] = useState<FarmInvitation | null>(null);
  const [removing, setRemoving] = useState<FarmMember | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const owner = workspace.farmRole === "Owner";

  useEffect(() => {
    setFarmName(workspace.farmName);
    setInvitation(null);
    setMessage(null);
    setError(null);
  }, [workspace.farmId, workspace.farmName]);

  async function renameFarm(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setMessage(null);
    try {
      await onRenameFarm(farmName.trim());
      setMessage("Farm name updated.");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to rename farm.");
    }
  }

  async function createInvitation() {
    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      setInvitation(await onCreateInvitation());
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to create invitation.");
    } finally {
      setBusy(false);
    }
  }

  async function joinFarm(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    setMessage(null);
    const form = new FormData(event.currentTarget);
    try {
      await onAcceptInvitation(String(form.get("inviteCode") ?? ""));
      setMessage("Invitation accepted. You are now viewing the shared farm.");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to accept invitation.");
    } finally {
      setBusy(false);
    }
  }

  async function copyCode() {
    if (!invitation) return;
    try {
      await navigator.clipboard.writeText(invitation.code);
      setMessage("Invitation code copied.");
    } catch {
      setError("Copy was blocked by the browser. Select and copy the code manually.");
    }
  }

  return (
    <div className="space-y-5">
      <header>
        <p className="mb-2 text-[10px] font-extrabold uppercase tracking-[0.14em] text-[#818b86]">
          Workspace administration
        </p>
        <h1 className="font-serif text-4xl tracking-[-0.035em] text-[#1f2d29] sm:text-[43px]">
          Settings
        </h1>
        <p className="mt-2 text-sm text-[#68746f]">
          Manage your farm profile, workspaces, and family access.
        </p>
      </header>

      {(message || error) && (
        <div
          role="status"
          className={`rounded-lg border px-4 py-3 text-sm ${error ? "border-[#e6c5ba] bg-[#f9eae5] text-[#813e2d]" : "border-[#bbd5c6] bg-[#e9f3ed] text-[#315c50]"}`}
        >
          {error ?? message}
        </div>
      )}

      <div className="grid gap-5 xl:grid-cols-[1fr_.9fr]">
        <div className="space-y-5">
          <section className="rounded-xl border border-[#deded7] bg-[#fffefa] p-5 shadow-sm sm:p-6">
            <SectionHeading
              icon="settings"
              eyebrow="Farm profile"
              title="Workspace details"
              description={
                owner
                  ? "Owners can update the farm name shown to every member."
                  : "Only a farm owner can change these details."
              }
            />
            <form className="mt-5 space-y-4" onSubmit={renameFarm}>
              <label className="block">
                <span className="mb-1.5 block text-[10px] font-bold text-[#4e5d57]">Farm name</span>
                <input
                  className="min-h-12 w-full rounded-lg border border-[#cfd2cb] bg-white px-3.5 text-sm text-[#1f2d29] outline-none focus:border-[#315c50] focus:ring-4 focus:ring-[#315c50]/10 disabled:bg-[#f0f0eb] disabled:text-[#7d8581]"
                  value={farmName}
                  onChange={(event) => setFarmName(event.target.value)}
                  minLength={2}
                  maxLength={100}
                  required
                  disabled={!owner}
                />
              </label>
              {owner && (
                <div className="flex justify-end">
                  <button
                    className="min-h-11 rounded-lg bg-[#315c50] px-5 text-sm font-bold !text-white shadow-sm hover:bg-[#25483f] disabled:opacity-60"
                    disabled={saving || farmName.trim() === workspace.farmName}
                  >
                    {saving ? "Saving…" : "Save farm name"}
                  </button>
                </div>
              )}
            </form>
          </section>

          <section className="rounded-xl border border-[#deded7] bg-[#fffefa] p-5 shadow-sm sm:p-6">
            <SectionHeading
              icon="batches"
              eyebrow="Your workspaces"
              title="Switch farms"
              description="Your account can safely belong to more than one family farm."
            />
            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              {workspace.farms.map((farm) => (
                <button
                  type="button"
                  onClick={() => void onSwitchFarm(farm.id)}
                  disabled={farm.id === workspace.farmId || saving}
                  className={`rounded-lg cursor-pointer border p-4 text-left transition ${farm.id === workspace.farmId ? "border-[#87a396] bg-[#e8f0eb]" : "border-[#deded7] bg-white hover:border-[#aebdb5]"}`}
                  key={farm.id}
                >
                  <span className="flex items-center justify-between gap-3">
                    <strong className="text-sm text-[#1f2d29]">{farm.name}</strong>
                    {farm.id === workspace.farmId && (
                      <small className="rounded-full bg-[#315c50] px-2 py-1 text-[8px] font-extrabold uppercase !text-white">
                        Current
                      </small>
                    )}
                  </span>
                  <small className="mt-2 block text-[10px] text-[#68746f]">{farm.role}</small>
                </button>
              ))}
            </div>
          </section>

          {owner && (
            <section className="rounded-xl border border-[#deded7] bg-[#fffefa] p-5 shadow-sm sm:p-6">
              <SectionHeading
                icon="buyers"
                eyebrow="Family access"
                title={`Members (${workspace.members.length})`}
                description="Owners can manage records and access. Viewers can read farm records and reports."
              />
              <div className="mt-5 divide-y divide-[#ebeae4]">
                {workspace.members.map((member) => (
                  <div className="flex items-center justify-between gap-4 py-3" key={member.userId}>
                    <div className="flex min-w-0 items-center gap-3">
                      <span className="grid h-9 w-9 flex-none place-items-center rounded-full bg-[#e5ece7] text-[10px] font-extrabold text-[#315c50]">
                        {initials(member.email)}
                      </span>
                      <span className="min-w-0">
                        <strong className="block truncate text-xs text-[#1f2d29]">
                          {member.email}
                        </strong>
                        <small className="mt-1 block text-[9px] text-[#87908c]">
                          Joined {formatDate(member.joinedAt.slice(0, 10))}
                        </small>
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span
                        className={`rounded-full px-2.5 py-1 text-[8px] font-extrabold uppercase ${member.role === "Owner" ? "bg-[#e8f0eb] text-[#315c50]" : "bg-[#f1eee6] text-[#75674f]"}`}
                      >
                        {member.role}
                      </span>
                      {owner && member.role === "Viewer" && (
                        <button
                          type="button"
                          className="min-h-9 rounded-md px-2 text-[9px] font-bold text-[#a1533d] hover:bg-[#f8e8e2]"
                          onClick={() => setRemoving(member)}
                        >
                          Remove
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}
        </div>

        <div className="space-y-5">
          {owner && (
            <section className="rounded-xl border border-[#deded7] bg-gradient-to-br from-[#fffefa] to-[#edf3ef] p-5 shadow-sm sm:p-6">
              <SectionHeading
                icon="plus"
                eyebrow="Invite family"
                title="Create invitation code"
                description="Codes are single-use, expire after seven days, and can be shared with one family member."
              />
              <button
                type="button"
                className="mt-5 min-h-11 w-full rounded-lg bg-[#315c50] px-4 text-sm font-bold !text-white shadow-sm hover:bg-[#25483f] disabled:opacity-60"
                disabled={busy}
                onClick={() => void createInvitation()}
              >
                {busy ? "Generating…" : "Generate invitation code"}
              </button>
              {invitation && (
                <div className="mt-4 rounded-lg border border-[#b8cbc1] bg-white p-4">
                  <span className="block text-[9px] font-extrabold uppercase tracking-wider text-[#68746f]">
                    Share this code once
                  </span>
                  <strong className="mt-2 block break-all font-mono text-xl tracking-[0.12em] text-[#1f2d29]">
                    {invitation.code}
                  </strong>
                  <div className="mt-3 flex items-center justify-between gap-3">
                    <small className="text-[9px] text-[#68746f]">
                      Expires {formatDate(invitation.expiresAt.slice(0, 10))}
                    </small>
                    <button
                      type="button"
                      className="min-h-9 rounded-md border border-[#deded7] bg-white px-3 text-[10px] font-bold text-[#315c50]"
                      onClick={() => void copyCode()}
                    >
                      Copy code
                    </button>
                  </div>
                </div>
              )}
              {!cloudEnabled && (
                <p className="mt-3 text-[10px] leading-relaxed text-[#8a7551]">
                  Demo codes are for interface testing only. Shared access requires Supabase.
                </p>
              )}
            </section>
          )}

          <section className="rounded-xl border border-[#deded7] bg-[#fffefa] p-5 shadow-sm sm:p-6">
            <SectionHeading
              icon="batches"
              eyebrow="Join another farm"
              title="Use invitation code"
              description="Join as a read-only Viewer using the single-use code provided by that farm’s owner."
            />
            <form className="mt-5 space-y-4" onSubmit={joinFarm}>
              <label className="block">
                <span className="mb-1.5 block text-[10px] font-bold text-[#4e5d57]">
                  Invitation code
                </span>
                <input
                  name="inviteCode"
                  className="min-h-12 w-full rounded-lg border border-[#cfd2cb] bg-white px-3.5 font-mono text-sm uppercase tracking-wider text-[#1f2d29] outline-none focus:border-[#315c50] focus:ring-4 focus:ring-[#315c50]/10 disabled:bg-[#f0f0eb]"
                  placeholder="Enter invitation code"
                  minLength={8}
                  required
                  disabled={!cloudEnabled || busy}
                />
              </label>
              <button
                className="min-h-11 w-full rounded-lg border border-[#315c50] bg-white px-4 text-sm font-bold text-[#315c50] hover:bg-[#edf3ef] disabled:cursor-not-allowed disabled:opacity-50"
                disabled={!cloudEnabled || busy}
              >
                {busy ? "Joining…" : "Join farm workspace"}
              </button>
            </form>
            {!cloudEnabled && (
              <p className="mt-3 text-[10px] leading-relaxed text-[#8a7551]">
                Connect Supabase and sign in to join a shared workspace.
              </p>
            )}
          </section>

          <section className="rounded-xl border border-[#deded7] bg-[#f4f1e8] p-5">
            <div className="flex gap-3">
              <span className="grid h-9 w-9 flex-none place-items-center rounded-lg bg-[#ded6c4] text-[#5f5747]">
                <Icon name="settings" className="!h-4 !w-4" />
              </span>
              <div>
                <strong className="text-xs text-[#1f2d29]">Access is protected</strong>
                <p className="mt-1.5 text-[10px] leading-relaxed text-[#68746f]">
                  Supabase Row Level Security lets Viewers read farm records and restricts changes
                  to Owners. Invitation codes are stored as one-way hashes and cannot be recovered
                  after creation.
                </p>
              </div>
            </div>
          </section>
        </div>
      </div>

      {removing && (
        <ConfirmDelete
          itemName={`${removing.email} from this farm`}
          saving={saving}
          onCancel={() => setRemoving(null)}
          onConfirm={async () => {
            try {
              await onRemoveMember(removing.userId);
              setRemoving(null);
              setMessage("Family member removed.");
            } catch (cause) {
              setError(cause instanceof Error ? cause.message : "Unable to remove member.");
            }
          }}
        />
      )}
    </div>
  );
}

function SectionHeading({
  icon,
  eyebrow,
  title,
  description,
}: {
  icon: "settings" | "batches" | "buyers" | "plus";
  eyebrow: string;
  title: string;
  description: string;
}) {
  return (
    <div className="flex items-start gap-3">
      <span className="grid h-10 w-10 flex-none place-items-center rounded-lg bg-[#e5ece7] text-[#315c50]">
        <Icon name={icon} className="!h-5 !w-5" />
      </span>
      <div>
        <p className="text-[9px] font-extrabold uppercase tracking-[0.12em] text-[#818b86]">
          {eyebrow}
        </p>
        <h2 className="mt-1 font-serif text-xl text-[#1f2d29]">{title}</h2>
        <p className="mt-1 text-[10px] leading-relaxed text-[#68746f]">{description}</p>
      </div>
    </div>
  );
}

function initials(email: string): string {
  return email.slice(0, 2).toUpperCase();
}
