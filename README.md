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
2. Link your project and apply pending migrations with the commands below. If you previously used the SQL Editor, follow the migration history instructions first.
3. Copy `.env.example` to `.env.local`.
4. Add the project URL and publishable key.
5. Restart the development server and create your first account.

The first signed-in account automatically creates a farm workspace and becomes its Owner. Owners can manage farm data and access. Invited users join as read-only Viewers. RLS prevents non-members from accessing that workspace and blocks Viewer writes.

```bash
# First-time setup on this computer
pnpm supabase:login
pnpm supabase:link --project-ref YOUR_PROJECT_REF

# Review migration history and preview before applying
pnpm db:migrations
pnpm db:migrate:preview
pnpm db:migrate
```

Replace `YOUR_PROJECT_REF` with the project reference from your Supabase dashboard. These commands target the linked remote database. See [docs/database-migrations.md](docs/database-migrations.md) for setup, existing SQL Editor migration history, and deployment instructions.

## Quality checks

For future features, use shared shadcn/ui primitives in `components/ui/` and add or update unit tests for domain rules and important logic, especially financial calculations, permissions, validation, and critical application workflows. See [AGENTS.md](AGENTS.md) and the [development guide](docs/clean-architecture-guide.md) for the full standards and review checklist.

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

On mobile, the workspace sidebar slides in and out with a fading backdrop. The menu buttons animate between menu and close icons using Tailwind transitions. Escape and backdrop taps close the drawer, keyboard focus stays inside while open, and background scrolling is locked. Reduced-motion preferences disable these transitions.

Phase 6 includes email/password authentication, multi-farm workspaces, hashed single-use family invitations, member management, Supabase RLS, repository-backed operational workflows, dedicated Feed management, and batch financial Reports. Reports cover profit, expenses, feed cost, cost per pig, selling weight, weighted price per kilogram, receivables, payments received, and ROI. New Reports and Settings UI use Tailwind CSS utilities. All financial metrics are derived from their underlying transactions. Local demo mode remains available when Supabase is not configured.

See [docs/workspace-permissions.md](docs/workspace-permissions.md) for Owner/Viewer permissions and the required `202610100002_workspace_permissions.sql` migration.

See [docs/architecture.md](docs/architecture.md) for the system design and [docs/clean-architecture-guide.md](docs/clean-architecture-guide.md) for layer responsibilities and code-placement guidance.

## Pig purchase costs

Apply `supabase/migrations/202610100001_link_pig_purchase_expenses.sql` before using this version with Supabase. Saving a pig automatically records one purchase expense; editing its purchase price updates that expense. Dashboard and Reports include these costs for the selected batch.

For existing batches with manual Piglets entries, open **Expenses → Review purchase costs**. Check pig purchase prices and move any ancillary costs to their appropriate categories before confirming. Original entries remain as excluded history. Until review, existing manual costs remain in totals; new pigs and purchase price edits enter totals when the review is confirmed. Purchase expense dates default to batch start dates. Mark pigs **Removed** rather than deleting them to preserve purchase costs.

`pnpm test` verifies local accounting and runs the purchase migration in an isolated PostgreSQL WASM database; it does not connect to your Supabase project.
