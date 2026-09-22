# Agent Instructions: Super Admin Admin UI

These instructions apply whenever a task touches Super Admin behavior in this
repository.

1. Read `../synkazo-docs/SUPER_ADMIN_WORKFLOW.md` completely before editing code.
2. Select the relevant `CAP-nnn` capability rows and `SA-nnn` roadmap tasks, then
   create or update the chunk in
   `../synkazo-docs/todo/super-admin-delivery-tracker.md`.
3. Work on `feature/super-admin`, after merging the latest `dev` into it. Accepted
   work must be merged and pushed to `dev`; a feature-branch commit alone is not done.
4. Think in user workflows first, then inspect the real API method, URL, request DTO,
   response envelope, pagination, errors, and authorization before designing or
   wiring the screen. Do not infer fields from mockups or old docs.
5. If required data or an action contract is missing, stop that part of the UI and
   record an `API gap` in the tracker. Do not use `any`, guessed optional fields,
   hardcoded data, client authority flags, or tenant endpoints as a workaround.
6. Follow `../synkazo-docs/UI_Standards.md` and
   `../synkazo-docs/UI_Component_Standards.md`. Reuse an existing feature/shared
   component first, then `src/components/ui/`, then an installed shadcn primitive.
   Create a custom primitive only when no suitable existing option exists.
7. Use typed API modules and query hooks. Include `organisationId` and nested IDs in
   scoped query keys, and invalidate every affected overview/list/detail/billing/
   activity query after mutations.
8. Every view must handle loading, empty, error, and success states. Preserve
   responsive behavior, accessibility, focus/keyboard behavior, semantic tokens,
   clear confirmations, understandable errors, and exact Super Admin role boundaries.
9. Run typecheck, focused tests, the relevant full suite, and the production build
   before integration. Mark roadmap tasks complete only after acceptance criteria are
   verified and the required API/admin commits are on `dev`.
