# Clean Architecture development guide

This guide explains where PiggyTrack code belongs and how the layers may depend on one another. Use it when adding a feature, moving code, or reviewing a pull request.

## Core rule

Dependencies point toward the business rules:

```text
React presentation ──▶ application ──▶ domain
                              ▲
                              │ implements ports
                       infrastructure
```

Inner layers must not know which UI framework, database, browser API, or deployment platform the application uses.

| Layer | May import | Must not import |
| --- | --- | --- |
| `domain/` | Other domain modules | React, vinext, Supabase, browser APIs, application, infrastructure, presentation |
| `application/` | Domain and application ports | React, vinext, Supabase, browser APIs, infrastructure, presentation |
| `infrastructure/` | Domain, application, third-party SDKs | React components and feature pages |
| Presentation code | Domain, application contracts, composition root, presentation utilities | Supabase clients and repository implementations directly |

ESLint enforces the most important domain and application restrictions.

## `domain/`: business meaning and rules

The domain is the stable center of PiggyTrack. Code here should work in a browser, server, command-line tool, or unit test without modification.

Put these here:

- Business entities and value types, such as `Pig`, `Batch`, `Expense`, and `PigSale`.
- Allowed business values, such as pig statuses and expense categories.
- Pure calculations, such as billable weight, sale total, outstanding balance, profit, and ROI.
- Pure report projections built from domain records.
- Business validation that does not require a database or UI.

Current examples:

- `domain/entities.ts`
- `domain/constants.ts`
- `domain/calculations.ts`
- `domain/reports.ts`

Do not put these here:

- React components or hooks.
- `FormData`, DOM events, `window`, or `localStorage` access.
- Supabase rows, queries, RPC calls, or generated database types.
- Currency/date display formatting.
- Network or persistence operations.

A domain function should normally be deterministic:

```ts
export function calculateBillableWeight(sale: PigSale): number {
  return Math.max(0, sale.actualWeight - sale.weightDeduction);
}
```

It receives all required data as arguments and produces a result without changing external state.

## `application/`: use cases and ports

The application layer describes what PiggyTrack can do. It coordinates domain operations and external capabilities without knowing how those capabilities are implemented.

Put these here:

- Use cases and workflow orchestration.
- Input types for commands such as saving a pig or recording a payment.
- Ports (TypeScript interfaces) for persistence, authentication, preferences, notifications, or other external systems.
- Cross-entity workflow decisions that do not belong to one entity.

Current examples:

- `application/piggy-track-application.ts` coordinates workspace loading, mutations, reloads, farm switching, and invitations.
- `application/ports/piggy-track-repository.ts` defines the persistence operations PiggyTrack needs.
- `application/ports/auth-gateway.ts` defines authentication without exposing Supabase types.
- `application/ports/farm-preference-store.ts` defines preferred-farm persistence without exposing `localStorage`.

Do not put these here:

- Supabase imports or SQL details.
- React state or JSX.
- Calls to `window`, `document`, or browser storage.
- CSS, user-facing formatting, or form parsing.

When application code needs an external capability, define a small port instead of importing an implementation:

```ts
export interface FarmPreferenceStore {
  getPreferredFarmId(): string | undefined;
  setPreferredFarmId(farmId: string): void;
}
```

## `infrastructure/`: external implementations

Infrastructure contains replaceable technical details. These modules implement application ports and translate external data into domain entities.

Put these here:

- Supabase clients, queries, RPC calls, and row-to-domain mapping.
- Repository implementations.
- Browser storage adapters.
- Local demo storage and fixtures.
- Generated database types.
- The composition root that chooses and wires implementations.

Current structure:

```text
infrastructure/
├── auth/             Supabase authentication adapter
├── local/            Local demo fixtures
├── repositories/     Local and Supabase repository implementations
├── storage/          Browser storage adapters
├── supabase/         Client configuration and generated database types
└── composition-root.ts
```

Do not put these here:

- JSX or page-specific behavior.
- Business totals duplicated from `domain/calculations.ts`.
- View formatting or modal state.

The composition root is the only place that decides which concrete adapters to use:

```ts
const repository = isSupabaseConfigured
  ? new SupabasePiggyTrackRepository()
  : new LocalPiggyTrackRepository();
```

SQL migrations remain in `supabase/migrations/`. That location is required by the Supabase CLI and is considered deployment infrastructure, even though it is outside the TypeScript `infrastructure/` directory.

## Presentation code

PiggyTrack separates reusable presentation utilities from React UI folders.

### `presentation/`

Put framework-light UI boundary helpers here:

- Philippine currency, weight, percentage, and date formatting.
- Parsing values at the form boundary.
- Other display-only transformations shared by multiple features.

Do not put business totals here. For example, format a sale total here, but calculate it in `domain/calculations.ts`.

### `features/`

Put feature screens, forms, and feature-specific UI state here. Examples include Expenses, Feed, Sales, and Settings.

A feature may:

- Render domain records.
- Call callbacks supplied by the application-facing hook.
- Keep temporary form, modal, filter, and selection state.
- Format values with `presentation/` utilities.

A feature must not:

- Import the Supabase client or repository implementation.
- Reimplement shared business formulas.
- Persist data directly.

### `components/`

Put reusable UI shared across features here, including the application shell, dashboard widgets, batch selector, and UI primitives.

### `hooks/`

Hooks adapt application behavior to React state. They may manage loading, saving, and error states, but application workflows belong in `application/`.

### `app/`

Keep vinext routes, route handlers, the root layout, and global styles here. Route handlers should call application use cases rather than embedding domain rules.

## How a request flows

Recording an expense follows this path:

```text
Expense form
  → usePiggyTrack.saveExpense()
  → PiggyTrackApplication.saveExpense()
  → PiggyTrackRepository.saveExpense()
  → Supabase or local repository
  → domain-shaped Expense / refreshed WorkspaceSnapshot
  → React renders the updated workspace
```

The feature does not know whether data came from Supabase or browser storage. The application does not know how either implementation stores it.

## Where should new code go?

| New code | Location |
| --- | --- |
| Add a field to `Pig` | `domain/entities.ts`, then update adapters and UI |
| Add a profit calculation | `domain/calculations.ts` |
| Add a report projection | `domain/reports.ts` |
| Add a user workflow spanning repositories | `application/` |
| Define an email or file-storage capability | `application/ports/` |
| Implement that capability with a vendor SDK | `infrastructure/` |
| Add a Supabase query or row mapper | `infrastructure/repositories/` |
| Add or change a table | `supabase/migrations/` |
| Add PHP/date display formatting | `presentation/formatters.ts` |
| Parse a form value | `presentation/form-utils.ts` |
| Add a feature page or modal | `features/<feature>/` |
| Add a reusable button or selector | `components/ui/` |

## Adding a feature

Use this order so dependencies continue to point inward:

1. Model new business concepts in `domain/`.
2. Add or update pure domain rules and tests.
3. Define the application input and required port operations.
4. Add the use-case workflow to the application layer.
5. Implement or update the local adapter.
6. Add the Supabase migration and repository implementation when persistence changes.
7. Expose the workflow through the React hook.
8. Build the feature UI.
9. Run the architecture and production checks.

```bash
pnpm typecheck
pnpm lint
pnpm build
```

## Review checklist

Before merging a change, verify:

- Business formulas exist once in the domain layer.
- Domain and application files do not import framework or infrastructure modules.
- UI code does not call Supabase directly.
- Supabase rows are mapped to domain entities inside infrastructure.
- External services are accessed through an application port.
- Calculated totals are not persisted unless a documented business requirement requires a snapshot.
- Pig purchase records and Piglets expense transactions remain separate.
- New behavior works with both the local and Supabase repository implementations where applicable.
- TypeScript, lint, and production build pass.

## Avoid unnecessary abstraction

Clean Architecture is a dependency rule, not a requirement to create a class for every function. Keep pure calculations as functions, group closely related workflows when that improves readability, and introduce a port only when code crosses an external boundary or needs a replaceable implementation.
