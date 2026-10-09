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
pnpm typecheck
pnpm lint
pnpm build
```

## Current scope

Phase 6 includes email/password authentication, multi-farm workspaces, hashed single-use family invitations, member management, Supabase RLS, repository-backed operational workflows, dedicated Feed management, and batch financial Reports. Reports cover profit, expenses, feed cost, cost per pig, selling weight, weighted price per kilogram, receivables, payments received, and ROI. New Reports and Settings UI use Tailwind CSS utilities. All financial metrics are derived from their underlying transactions. Local demo mode remains available when Supabase is not configured.

See [docs/architecture.md](docs/architecture.md) for the proposed data model and layering.
