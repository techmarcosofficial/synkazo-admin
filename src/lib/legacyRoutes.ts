/**
 * Maps the pre-refactor URLs onto the nested routes that replaced them.
 *
 * Settings used to hold both personal and tenant concerns in one page, switching
 * on `?section=` with a second `?tab=` inside Billing. Those are now real routes
 * under /settings and /organization, so every old bookmark, email link and
 * Stripe return URL has to be forwarded.
 *
 * `section` and `tab` are deliberately dropped from the result — the path now
 * expresses them. Everything in PRESERVED_PARAMS is carried across, because the
 * destination still reads it.
 */

/** Old billing `?tab=` value → new /organization/billing/<segment>. */
const BILLING_TAB_TO_SEGMENT: Record<string, string> = {
  overview: 'overview',
  subscription: 'subscription',
  // Renamed for clarity now that it is a URL segment rather than a tab key.
  payment: 'payment-methods',
  'payment-methods': 'payment-methods',
  invoices: 'invoices',
  // The standalone "History" tab was folded into Payment History, which shows
  // the same events plus amount, payment id and failure reason.
  history: 'payment-history',
  'payment-history': 'payment-history',
};

const SECTION_TO_PATH: Record<string, string> = {
  settings: '/settings/preferences',
  preferences: '/settings/preferences',
  profile: '/settings/profile',
  security: '/settings/security',
};

/**
 * Params the new URL must still carry: the Stripe checkout-return handshake
 * consumed by BillingSectionShell, and the same-origin redirect the paywall
 * threads through checkout.
 */
const PRESERVED_PARAMS = ['checkout', 'first_checkout', 'redirect'] as const;

/**
 * Returns the replacement location, or null when the caller's own fallback
 * should apply (bare `/settings` with no section).
 */
export function resolveLegacyLocation(
  pathname: string,
  search: string,
): string | null {
  const params = new URLSearchParams(search);
  const section = params.get('section');
  const tab = params.get('tab');

  const keep = new URLSearchParams();
  for (const key of PRESERVED_PARAMS) {
    const value = params.get(key);
    if (value !== null) keep.set(key, value);
  }
  const qs = keep.toString() ? `?${keep.toString()}` : '';

  const billing = () => {
    const segment = BILLING_TAB_TO_SEGMENT[tab ?? 'overview'] ?? 'overview';
    return `/organization/billing/${segment}${qs}`;
  };

  switch (pathname) {
    case '/profile':
      return `/settings/profile${qs}`;
    case '/settings/billing':
      return billing();
    case '/invitations':
      return `/organization/invitations${qs}`;
    case '/team':
      return `/organization/general${qs}`;
    case '/settings':
      if (section === 'billing') return billing();
      if (section)
        return `${SECTION_TO_PATH[section] ?? '/settings/preferences'}${qs}`;
      return null;
    default:
      return null;
  }
}
