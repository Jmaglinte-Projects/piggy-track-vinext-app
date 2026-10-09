# PiggyTrack architecture

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

Every business table also belongs to a `farm`. Users access farms through `farm_members`, with an `Owner` or `Member` role. Owners manage membership; both roles can maintain operational records. Row Level Security checks farm membership on every exposed table.

Users may belong to multiple farms and keep an explicit preferred workspace in local browser state. Invitation codes are single-use and expire after seven days. Only a SHA-256 hash is persisted in `farm_invitations`; the raw code is returned once to the owner. Accepting a code adds a `Member` relationship without modifying or deleting the user’s existing farms.

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

Pig purchases and Piglets expense entries remain separate records by business decision. Creating a pig will not automatically create an expense. The purchase workflow should clearly offer an optional, explicit Piglets expense entry and warn about likely duplicates. Financial reports will count only expense transactions; `Pig.purchasePrice` remains operational purchase information and must not be added to expenses again when calculating batch totals.

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
