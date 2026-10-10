# PiggyTrack architecture

For code-placement rules and feature-development examples, see the [Clean Architecture development guide](clean-architecture-guide.md).

## Clean Architecture structure

Dependencies point inward. Inner layers never import React, Supabase, browser APIs, or outer layers.

```text
app / components / features / hooks
                │
                ▼
          application
       use cases + ports
                │
                ▼
             domain
  entities + rules + projections

infrastructure ──implements──▶ application ports
       │
       └── wired only by infrastructure/composition-root.ts
```

- `domain/` — framework-independent entities, allowed values, calculations, and report projections.
- `application/` — business workflow orchestration and interfaces (ports) required from external systems.
- `infrastructure/` — Supabase, browser storage, local-demo repositories, generated database types, and the composition root.
- `presentation/` — Philippine formatting and form-boundary helpers.
- `app/`, `components/`, `features/`, `hooks/` — vinext/React presentation code.

`PiggyTrackApplication` is the use-case boundary used by React. It coordinates repository commands, workspace reloads, farm switching, invitation acceptance, and preferred-farm persistence through injected ports. React hooks manage only view state such as loading and error messages.

The local and Supabase repositories both implement the same application port. The composition root selects an adapter from environment configuration. ESLint rules prevent `domain/` and `application/` from importing outer layers.

## Proposed relational model

```text
batches 1 ─── * pigs 1 ─── 0..1 pig_sales * ─── 1 buyers
   │                         │
   └──── * expenses          └──── * payments
```

Every business table also belongs to a `farm`. Users access farms through `farm_members`, with an `Owner` or `Viewer` role. Owners manage membership and write operational records; Viewers can only read farm records and reports. Row Level Security enforces membership for reads and ownership for writes on every exposed business table. Sales, payment, and purchase-reconciliation functions also check ownership. Direct client membership writes are revoked.

Users may belong to multiple farms and keep an explicit preferred workspace in local browser state. Invitation codes are single-use and expire after seven days. Only a SHA-256 hash is persisted in `farm_invitations`; the raw code is returned once to the owner. Accepting a code adds a read-only `Viewer` relationship without modifying or deleting the user’s existing farms.

### Tables

- `batches`: one raising cycle and its lifecycle status.
- `pigs`: belongs to a batch. Purchase price and weight describe that pig at intake.
- `expenses`: belongs to a batch. `amount` is derived from quantity × unit price and is not persisted.
- `pig_sales`: belongs to one pig, batch, and buyer. Billable weight and total amount are derived.
- `payments`: belongs to a sale. Multiple rows allow deposits and partial payments.
- `buyers`: shared across sales and batches.

Feed is represented in `expenses` with `category = Feed` plus a nullable `feed_type`. A database constraint should require `feed_type` for feed rows and forbid it for non-feed rows. This keeps the financial ledger single-source while allowing a dedicated Feed page and reports.

The Feed feature is therefore a focused view over expense transactions rather than another persistence model. Its total cost, weighted price per sack, quantity, and cost per pig are calculated at runtime.

Reports are also projection-only. `domain/reports.ts` turns transaction records into a typed batch report without persisting totals. Average selling price is weighted (`total sales ÷ total billable kilograms`), while average selling weight is the mean billable weight across sales.

Each pig purchase creates one linked Piglets expense. Updating `Pig.purchasePrice` updates that transaction atomically; Dashboard and Reports sum the ledger and never add purchase prices a second time. Status changes retain purchase costs. Linked transactions and replaced legacy history cannot be edited or deleted through Expenses; pigs with linked purchase costs should be marked Removed instead of deleted. Purchase transactions default to the batch start date because pigs do not yet have a purchase-date field.

Existing batches with manual Piglets expenses require explicit reconciliation in Expenses. Their original totals remain in effect until review. The preview compares manual entries with recorded pig purchase prices; confirmation preserves manual entries with `superseded = true` and creates linked transactions. Superseded entries are excluded from financial totals and breakdowns. Move any ancillary costs from legacy Piglets entries to the appropriate category before confirming. Batches without manual Piglets entries are backfilled automatically. Purchase changes in a pending batch take effect in totals when reconciled; new pigs in a pending batch are included when review is confirmed, allowing missing legacy pig records to be filled in first. Supabase uses database triggers so purchase saves and reconciliation are atomic under RLS; local demo mode writes the complete operation in one localStorage update.

### Calculated values

The following should remain derived: expense amount, billable weight, sale total, amount paid, outstanding balance, payment status, batch totals, profit, averages, and ROI. If pricing rules later allow a sale to be renegotiated after invoicing, an immutable invoice snapshot may be justified; that decision is intentionally deferred.

### Integrity rules for Supabase phase

- Money uses PostgreSQL `numeric(12,2)`, never floating point.
- Weights use `numeric(8,2)` and must be non-negative.
- A pig can have at most one sale; a sale's `batch_id` must match its pig's batch.
- Payment amounts must be positive; application and database logic should prevent overpayment unless credits are explicitly supported.
- Use `timestamptz` for audit fields and `date` for business dates.
- Prefer archive/status transitions to hard deletion once a batch has financial records.

Sale writes use database functions so saving a sale and changing the pig to `Sold` happen in one transaction. Deleting a sale reactivates its pig. Payment writes also use a database function that rejects amounts above the derived outstanding balance, protecting the rule even when writes do not originate from the web UI.

## Runtime repository

The UI depends on `PiggyTrackRepository`, not directly on Supabase. With Supabase environment variables, the repository uses authenticated cloud tables. Without them, it uses browser storage and realistic demo records. This keeps components testable and makes the unconfigured development experience useful.

Workspace listings use only the signed-in user’s own membership. First-workspace creation is idempotent under a per-user transaction lock. Financial and membership changes produce protected Owner-readable audit entries. See [workspace permissions](workspace-permissions.md) for the role matrix, enforcement details, and rollout steps.
