/** A full-page navigation keeps provider consent and its return in the same tab. */
export function redirectToOAuth(url: string): void {
  window.location.assign(url);
}
