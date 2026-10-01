// SA-908 — browser-side idempotency key helper. Generates a RFC-4122 v4
// UUID using the Crypto API (available in every target browser). The
// caller holds the string for the lifetime of one operator intent —
// typically a dialog session — and passes it to the matching API
// wrapper, which forwards it as the `Idempotency-Key` header. React
// Query retries of the same `mutate()` call reuse the same key because
// variables are stable within a call; a new user-initiated mutate()
// generates a fresh key.

export function createIdempotencyKey(): string {
  // crypto.randomUUID is available in every evergreen browser we
  // support. No `uuid` dependency needed.
  return crypto.randomUUID();
}
