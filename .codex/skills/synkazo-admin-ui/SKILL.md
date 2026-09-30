---
name: synkazo-admin-ui
description: Audit or refine the signed-in Synkazo tenant admin visual system, especially dashboard, projects, jobs, and shared shadcn components. Use for visual consistency work; exclude auth and Super Admin unless explicitly requested.
---

# Synkazo tenant admin UI

Work from the `synkazo-admin` repository, with `synkazo-docs` beside it. Read the relevant parts of `../synkazo-docs/UI_Standards.md`, `../synkazo-docs/UI_Component_Standards.md`, and `../synkazo-docs/docs/admin-ui-visual-system-audit-2026-09-29.md`. Use the images in `../synkazo-docs/design-ref/` when a request refers to them. Current code and the user's latest instruction take precedence over historical audit notes.

## Scope

- Focus on signed-in tenant routes under `AppLayout`: dashboard, projects, jobs, and their related settings and dialogs.
- Leave login, registration, and other unauthenticated screens alone unless requested. Defer Super Admin work unless requested; if the task touches its behavior, follow `AGENTS.md` and `../synkazo-docs/SUPER_ADMIN_WORKFLOW.md`.
- Preserve business logic, navigation, responsive behavior, keyboard/focus behavior, and accessible names.
- Inspect the worktree and callers of a shared component before editing it. Keep existing unrelated changes.

## Visual system

- Use `HeadingPair`, `TextPair`, and `headingStyles` for title/subtitle hierarchy. Tenant page titles are 18/28 px bold; sections 16/24 px semibold; card titles 14/20 px semibold; item titles 13/18 px semibold. Pairs use `gap-1`. A `PageHeader` with a back link retains its earlier 24 px title and layout. Project listing card names use the 16/24 px section title level. Project and job setup journeys use card-level headings and a 10/16 px uppercase label.
- Derive radius from `--radius`: outer cards and dialogs use 4xl, nested cards 3xl, inset panels 2xl, standard form controls 2xl. Badges and dedicated collapse buttons are pills; collapse buttons use outline. The sticky detail back tab uses 4xl top corners and extends beneath its card.
- Tenant line tabs have a 4 px active underline flush with the list edge. Confirmation dialogs use primary confirm and outline cancel buttons; context remains in the icon and message. Form dialogs use a flush outer container with padding in their header, body, and footer.
- Prefer existing feature/shared components, then `src/components/ui/` variants and semantic Tailwind tokens. Fix repeated patterns centrally. Avoid arbitrary page overrides, color literals, and `!important`.

## Workflow

1. Trace the requested screen to its shared components and other callers. Compare the relevant reference image and existing UI rules before changing classes.
2. Make the smallest shared or feature-level adjustment that preserves hierarchy. Use an explicit variant or documented exception when a component serves distinct contexts.
3. Check the affected routes at narrow and desktop widths when visual behavior matters. Run `pnpm typecheck`, focused `pnpm exec vitest run <test-file>`, and `pnpm build` when the change affects shared styles or layout.
4. Update the audit document if a design rule or intentional exception changes. Report the scope, verification, and any visual check that could not be performed.
