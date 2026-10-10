# Database migrations

The repository pins the Supabase CLI as a development dependency. Run commands from the repository root after `pnpm install`. Migration files live in `supabase/migrations/`; the CLI applies pending files in version order and records successful versions in `supabase_migrations.schema_migrations`.

## Connect your Supabase project

```bash
pnpm supabase:login
pnpm supabase:link --project-ref YOUR_PROJECT_REF
pnpm db:migrations
```

Replace `YOUR_PROJECT_REF` with the project reference from the Supabase dashboard (the reference appears in the dashboard URL after `/project/`). Login authenticates the CLI with your Supabase account. Supply the database password when prompted. The browser publishable key in `.env.local` does not authorize migrations.

Linking selects the remote project for subsequent migration commands. Check that it is the intended environment before applying changes. To switch environments, run the link command again with that environment's project reference. Linking is local to your checkout; collaborators link their own checkouts.

`supabase/config.toml` contains local development configuration, not remote credentials. Linked project state under `supabase/.temp/` is ignored by Git. Keep access tokens and database passwords out of source control. These remote migration commands do not require starting the local Docker stack.

## Existing databases updated through the SQL Editor

SQL Editor execution does not automatically record a file in the CLI migration history. If the database already contains PiggyTrack tables but `pnpm db:migrations` shows the initial migration as pending, stop before pushing: rerunning it would attempt to recreate existing tables.

Compare migration files with your actual database and previous SQL Editor executions. For each migration whose complete changes have already been applied, record that version as applied:

```bash
# Example only: use this version only after verifying it was fully applied.
pnpm exec supabase migration repair 202609290001 --status applied --linked
```

Repair updates history only; it does not execute the SQL or verify the schema. Record only verified migrations, leaving unapplied migrations pending. If a file was only partly applied or the schema differs, resolve those differences before marking it applied. Do not mark the new workspace permission migration as applied unless its SQL has actually run.

Then run `pnpm db:migrations` again. Previously applied versions should appear in both the Local and Remote columns, while new migrations should appear only in Local. The next preview should list only genuinely pending changes. Preserve existing filenames and versions after deployment.

## Apply pending migrations

```bash
pnpm db:migrate:preview
pnpm db:migrate
pnpm db:migrations
```

The preview prints which migrations would run without applying them. It does not execute or validate their SQL against the remote database. Review the list, then run `pnpm db:migrate` and confirm the CLI prompt. The final history command confirms recorded versions. Later runs apply only newly pending migrations.

Both push scripts explicitly use `--linked` and `--skip-vault` to target the selected remote database and avoid updating Vault secrets from configuration. They do not include seeds or custom roles, reset the database, or automatically answer confirmation prompts.

For this release, apply pending migrations through `202610100003_farm_investments.sql` before deploying the matching application. This includes pig purchase accounting when it is still pending. Verify Owner writes, Viewer read-only access, unique workspace cards, and financial totals afterward; see [workspace-permissions.md](workspace-permissions.md).

The Farm Investments migration adds a separate farm-owned ledger, Owner-only writes, member reads, and audit history. Apply it before deploying this application version: workspace loading now reads `farm_investments`. It does not move existing Pig House Repair expenses or change batch totals. Record new setup and equipment costs through Farm Investments; existing batch records remain unchanged. Verify adding an investment before the first batch, editing its amount, and viewing the separate dashboard and Reports totals.

If a push fails, inspect the error and current migration history before retrying. Do not use migration repair to hide a failed or partly applied change. Applying a migration changes the live database; reverting application code does not reverse the SQL. Use your environment's backup/recovery process or a reviewed follow-up migration if a database correction is required.

## Command reference

| Command | Purpose |
| --- | --- |
| `pnpm supabase:login` | Authenticate the CLI |
| `pnpm supabase:link --project-ref YOUR_PROJECT_REF` | Select the remote project |
| `pnpm db:migrations` | Compare local files with remote migration history |
| `pnpm db:migrate:preview` | List pending migrations without applying them |
| `pnpm db:migrate` | Apply pending migrations to the linked database |

`pnpm test` runs isolated database tests and never applies migrations to Supabase. See the official [Supabase CLI workflow](https://supabase.com/docs/guides/local-development/cli-workflows) and [migration repair reference](https://supabase.com/docs/reference/cli/supabase-migration-repair) for additional details.
