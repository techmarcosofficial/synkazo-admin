// User-facing wording for a connection/project environment.
//
// The stored/API value stays 'sandbox' | 'production'; only the words a
// person reads change. We say "Test" and "Live" because non-technical users
// understand those immediately, whereas "Sandbox"/"Production" are developer
// terms. Keep sentence copy away from the phrase "live data" so it never
// collides with the "Live" environment name — say "real customer data".

type EnvironmentValue = 'production' | 'sandbox' | string | null | undefined;

/** Short label for an environment, e.g. for badges and toggles. */
export function environmentLabel(env: EnvironmentValue): string {
  return env === 'sandbox' ? 'Test' : 'Live';
}

/** One-line plain-language explanation of what the environment means. */
export function environmentDescription(env: EnvironmentValue): string {
  return env === 'sandbox'
    ? 'Test mode — a safe place to try your sync. Your real customer data is never changed.'
    : 'Live mode — your sync writes to your real customer data.';
}
