# PiggyTrack

PiggyTrack is a mobile-first farm records application for managing pig batches, expenses, sales, and payment collections. It uses vinext, React, TypeScript, Tailwind CSS, and Supabase.

## Run locally

```bash
pnpm install
pnpm dev
```

Open the local URL printed by Vite.

Without environment variables, PiggyTrack runs in local demo mode and persists changes in browser storage.

## Connect Supabase

1. Create a Supabase project.
2. Run the SQL files in `supabase/migrations/` in filename order using the Supabase SQL Editor or CLI.
3. Copy `.env.example` to `.env.local`.
4. Add the project URL and publishable key.
5. Restart the development server and create your first account.

The first signed-in account automatically creates a farm workspace and becomes its Owner. RLS prevents non-members from accessing that workspace.

## Quality checks

```bash
pnpm test
pnpm typecheck
pnpm lint
pnpm format:check
pnpm build
```

Run `pnpm format` to format supported source and configuration files with Biome.
Biome respects `.gitignore`; ESLint continues to enforce code quality and architecture rules.

In VS Code, install the recommended **Biome** extension (`biomejs.biome`). The
workspace settings enable format on save for JavaScript, TypeScript, JSX, TSX,
JSON, JSONC, and CSS files using the project's Biome configuration.

## Current scope

Phase 6 includes email/password authentication, multi-farm workspaces, hashed single-use family invitations, member management, Supabase RLS, repository-backed operational workflows, dedicated Feed management, and batch financial Reports. Reports cover profit, expenses, feed cost, cost per pig, selling weight, weighted price per kilogram, receivables, payments received, and ROI. New Reports and Settings UI use Tailwind CSS utilities. All financial metrics are derived from their underlying transactions. Local demo mode remains available when Supabase is not configured.

See [docs/architecture.md](docs/architecture.md) for the system design and [docs/clean-architecture-guide.md](docs/clean-architecture-guide.md) for layer responsibilities and code-placement guidance.

## Pig purchase costs

Apply `supabase/migrations/202610100001_link_pig_purchase_expenses.sql` before using this version with Supabase. Saving a pig automatically records one purchase expense; editing its purchase price updates that expense. Dashboard and Reports include these costs for the selected batch.

For existing batches with manual Piglets entries, open **Expenses → Review purchase costs**. Check pig purchase prices and move any ancillary costs to their appropriate categories before confirming. Original entries remain as excluded history. Until review, existing manual costs remain in totals; new pigs and purchase price edits enter totals when the review is confirmed. Purchase expense dates default to batch start dates. Mark pigs **Removed** rather than deleting them to preserve purchase costs.

`pnpm test` verifies local accounting and runs the purchase migration in an isolated PostgreSQL WASM database; it does not connect to your Supabase project.
