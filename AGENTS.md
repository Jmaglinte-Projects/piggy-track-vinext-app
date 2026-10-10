# Development standards

Read `docs/clean-architecture-guide.md` before adding or changing features and follow its layer boundaries.

## UI components

- Use shadcn/ui as the default for new shared UI primitives and interactive controls.
- Check `components/ui/` first and reuse or extend existing components before adding another implementation.
- Keep shared shadcn/ui component source in `components/ui/` and compose it into screens in `features/`. Keep domain rules and application workflows out of UI primitives.
- Match the existing design tokens, Tailwind styling, and mobile layout. Preserve labels, keyboard navigation, focus management, and accessible error states when adapting components.
- If a suitable component is missing, add the relevant shadcn/ui component and required setup or dependencies as part of that feature. Avoid rebuilding a supported primitive from scratch.
- Custom UI is appropriate for farm-specific views, charts, and layouts or when shadcn/ui does not meet the requirement. Explain material exceptions in the change description.
- Apply this standard to new work and components being substantially changed; migrating all existing UI is not a prerequisite.

## Tests

- Add or update unit tests when introducing or changing domain business rules, financial calculations, validation, permission decisions, or other functions whose failure could affect money, access, or data integrity.
- Test important application workflows through their ports using small fakes or stubs. Keep pure domain tests independent of React, browser storage, and Supabase.
- Cover expected behavior, relevant boundaries, and failure cases. Bug fixes in these areas need a regression test that demonstrates the bug.
- Assert observable behavior and business outcomes, not private implementation details. Do not require tests for trivial wrappers or styling-only edits.
- Follow the existing `node:test` and `node:assert/strict` setup. Place tests in `tests/*.test.ts` so `pnpm test` discovers them; no additional test framework is required.
- Use integration tests for repository, migration, and database permission behavior when unit tests cannot verify the boundary. Keep automated checks isolated from live Supabase data.

## Verification

Run the checks appropriate to the change. Feature and logic changes must pass `pnpm test`, `pnpm typecheck`, `pnpm lint`, `pnpm format:check`, and `pnpm build`. Inspect interactive UI changes for mobile layout and keyboard behavior. Report any checks that could not be completed.
