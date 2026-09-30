# Agent Instructions: Synkazo Admin UI (`synkazo-admin`)

This repository contains the administrative interface for Synkazo across two primary operational domains:
1. **Tenant Experience (Org Admin & Editor)** — The core user onboarding journey, project & job configuration, field mapping canvas, sync lifecycle, and organization management. (Merged to `dev`).
2. **Super Admin Platform Console** — Internal platform administration, multi-tenant lifecycle, plans, discounts, billing operations, and system health. (Managed on `feature/super-admin`).

---

## 1. Team Ownership & Operational Boundaries

- **Org Admin & Tenant Journey**: Active development on `dev`. Primary user flow involves the 16-state journey machine (`src/features/journey/`), entity onboarding (`src/features/onboarding/`), sync execution (`src/components/sync/`), and compact visual density.
- **Super Admin Platform Console**: Maintained on `feature/super-admin`. Focuses on `CAP-001` through `CAP-121` and `SA-nnn` roadmap items.
- **Rule**: Never overwrite, simplify, or mix context between these two domains. When touching one area, ensure the other remains intact and fully functional.

---

## 2. Tenant Experience Guidelines (Org Admin & Editor)

### A. Journey State Machine & Next Action
- The 16-state user journey (`S01`–`S16`) is driven by `src/features/journey/journeySelectors.ts` and `useJourneyState.ts`.
- Any changes to project or connection status must preserve deterministic next action resolution (`resolveNextAction()`).
- Incomplete sync flow setup must preserve session draft persistence via `draftSyncJob.ts` and present resumption via `DraftResumptionBanner`.
- Always respect role capabilities: If an Editor lacks permission to execute a step (e.g. project creation or mapping changes), render action controls disabled with `Lock` icon and informative `ActionTooltip`.

### B. Entity Onboarding & Journey Cards
- Use `SetupJourneyCard` for ambient progress indication on Project Detail and Job Detail pages.
- Project onboarding uses the **Compact 3-Zone Horizontal Layout** (`isCompact={true}`).
- Job onboarding uses the **Multi-Step Grid Layout**.
- State transitions are managed by pure selectors in `src/features/onboarding/entityOnboardingState.ts`.

### C. Compact Design & Visual Density Laws
- Follow the density standards defined in `synkazo-docs/AGENT_UX_ARCHITECTURE_GUIDELINES.md`:
  - Outer cards use `rounded-3xl` or `rounded-4xl` with semantic borders.
  - Compact padding across cards (`p-3 sm:p-4`) and list rows (`h-12 sm:h-14`).
  - Standardized typography using `HeadingPair` with semantic level hierarchy.
  - Interactive status badges with inline lowercase fix links (e.g. `fix` opening `CredentialsModal`).

### D. Dialog & Drawer Standards
- Modals must strictly follow the **Three-Tier Fixed Layout** (Fixed Header + Scrollable Body + Fixed Footer). Never use negative margin hacks inside scroll containers.
- When running a sync or test from a modal, auto-close the modal upon trigger so `SyncRunProgress` on the page can handle live updates.
- Triage and recovery drawers must be 400px–600px wide, focus directly on affected records, and provide 1-click contextual fix buttons.

### E. Auth Layout vs App Shell
- Auth pages (`src/pages/auth/`) must use `SplitAuthLayout` with `variant="immersive"` (Login/Register) or `variant="default"` (secondary).
- Auth styles use the `synkazo-login-*` token architecture and `AuthShowcase`. Never share shell navigation or header state with unauthenticated auth views.

---

## 3. Super Admin Platform Console Guidelines

Whenever a task touches `/super-admin/*` routes or components:

1. Read `../synkazo-docs/SUPER_ADMIN_WORKFLOW.md` completely before editing code.
2. Select the relevant `CAP-nnn` capability rows and `SA-nnn` roadmap tasks, then update the chunk in `../synkazo-docs/todo/super-admin-delivery-tracker.md`.
3. Work on `feature/super-admin`, after merging the latest `dev` into it. Accepted work must be merged and pushed to `dev`.
4. Inspect the real API method, URL, request DTO, response envelope, pagination, errors, and authorization before wiring screens.
5. If required data or an action contract is missing, record an `API gap` in the tracker. Never use `any`, guessed optional fields, or tenant endpoints as workarounds.
6. Use `ExactRoleGuard` with `super_admin` role. All Super Admin views must handle loading, empty, error, and success states.

---

## 4. Verification & Testing

Before completing any task:
1. Typecheck: `pnpm typecheck`
2. Run affected unit/component tests: `pnpm test`
3. Run linter: `pnpm lint`
4. Build verification: `pnpm build`
