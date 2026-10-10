# Workspace permissions

PiggyTrack supports two roles per farm: **Owner** and **Viewer**. A user's role in one farm does not grant permissions in another farm. The optional Editor role is deferred; it is not part of this release.

| Capability | Owner | Viewer |
| --- | --- | --- |
| View batches, pigs, expenses, feed, buyers, sales, payments, and reports | Yes | Yes |
| Add, edit, or delete operational records | Yes | No |
| Reconcile legacy pig purchase expenses | Yes | No |
| Rename the farm | Yes | No |
| Create invitations and remove Viewers | Yes | No |
| View the member email directory and change history | Yes | No |
| Switch to another farm they belong to or accept an invitation | Yes | Yes |

New invitations grant Viewer access. Accepting an invitation never promotes an existing Viewer or demotes an existing Owner. Owners cannot remove themselves or another Owner through the member-removal workflow. There is no self-service role promotion or ownership-transfer feature; adding one later requires a separate checked workflow.

## Duplicate workspace cards

The old loader fetched every visible membership and built one card per membership. An Owner could see both their own Owner row and another user's Member row, producing two cards for the same farm with different roles.

`list_my_farms()` selects memberships where `user_id = auth.uid()`, joins farm names, and returns the caller's role. The database primary key `(farm_id, user_id)` guarantees one membership per caller/farm, and the repository also deduplicates by farm ID. Explicitly switching to an inaccessible farm fails rather than silently choosing another farm. If access to a previously saved preferred farm has been revoked, initial loading falls back to an available workspace and updates that preference.

Farm names are not unique identifiers. Different farm IDs with the same name remain separate workspaces. This change does not delete, merge, or rename existing farms. `ensure_farm_workspace()` uses a per-user transaction advisory lock and rechecks membership before creating the user's first personal farm, preventing duplicate creation during concurrent initial loads. Users who already have a membership are not given another personal farm automatically.

## Enforcement

- Database RLS grants all farm members SELECT access to operational records, while INSERT, UPDATE, and DELETE policies require `private.is_farm_owner(farm_id)`.
- Membership tables cannot be modified directly by authenticated clients. Checked invitation/removal functions manage membership. Viewer reads of the membership table are limited to their own rows; only Owners can read the member directory, including emails.
- Sales, payment, sale deletion, and purchase reconciliation RPCs explicitly check ownership. Privileged invitation and membership functions check the authenticated caller and restrict execution to authenticated clients. No browser service-role key is used.
- The application boundary rejects mutations when the loaded workspace is not owned by the caller. The UI hides record mutation actions and dialogs for Viewers and displays a read-only notice. This improves usability; database policies remain the security boundary even if UI checks are bypassed.
- Repository updates and deletions are scoped to the selected farm. Deletions require a returned record so a denied or missing deletion is reported rather than appearing successful.
- Permission checks use database membership, not client-editable metadata or cached JWT role claims. Removing a Viewer blocks their subsequent database requests immediately. Information they have already viewed or copied cannot be recalled.

The local demo is a single-user Owner workspace and does not provide shared authentication or database authorization. Shared access requires Supabase.

## Change history

`farm_audit_log` captures actor user ID, timestamp, operation, table, record ID, and before/after JSON for operational changes, farm creation/rename, and membership changes. Automatically synchronized purchase expenses are logged under the actor making the pig change. The authenticated actor is derived from `auth.uid()`; administrative changes without a signed-in actor have a null actor ID.

Only Owners of the associated farm can read history. Authenticated clients, including Owners, cannot insert, edit, or delete audit entries. Elevated database administrators and service credentials remain trusted and can bypass these controls. History starts when this migration is applied; it does not reconstruct earlier changes. There is no audit viewer UI in this release. Owners can query the table through the database/API with their authenticated session; administrative review is also available in Supabase.

## Rollout

Use `pnpm db:migrate:preview` followed by `pnpm db:migrate` after linking the intended Supabase project. See [database-migrations.md](database-migrations.md) for first-time setup and migration history reconciliation if you previously ran SQL manually.

1. Apply all preceding migrations, including `202610100001_link_pig_purchase_expenses.sql`.
2. Apply `supabase/migrations/202610100002_workspace_permissions.sql` to the intended Supabase environment.
3. Deploy the matching application code and reload signed-in sessions. The application requires the new `list_my_farms` and `ensure_farm_workspace` RPCs.
4. Verify that each user sees one card per farm ID and their own role, and that existing Owners can write while former Members now have Viewer access.
5. Verify purchase reconciliation and sales/payment flows as an Owner and denied writes as a Viewer before production rollout.

The migration converts existing `Member` memberships to `Viewer`, retaining every farm, membership, and operational record. Existing Owners remain Owners. Review current Owners before rollout if ownership has previously been assigned manually. There is no automatic cleanup of genuinely separate farms.

Apply the migration before deploying the new app. Older app versions may still display mutation controls or the wrong role, but database policies deny unauthorized writes once the migration is applied. Roll out the app promptly to present accurate roles and controls.

## Verification

Run `pnpm test`, `pnpm typecheck`, `pnpm lint`, `pnpm format:check`, and `pnpm build`.

The isolated PostgreSQL tests apply all migrations with pgcrypto and cover the conversion of Members, correct workspace roles, idempotent bootstrap, direct table reads/writes, ownership checks on RPCs, invitation defaults, removal, cross-farm isolation, anonymous denial, and protected audit history. Application/UI tests cover denied mutations and read-only action visibility. These tests use a local WASM database and never connect to a live Supabase project.
