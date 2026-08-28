// Intl.supportedValuesOf is widely supported at runtime but not yet in this
// project's configured TS lib target — accessed via a loosely-typed alias
// rather than bumping the lib target for one call site.
const intlWithTimezones = Intl as unknown as {
  supportedValuesOf?: (key: string) => string[];
};

export const TIMEZONES: string[] =
  typeof intlWithTimezones.supportedValuesOf === 'function'
    ? intlWithTimezones.supportedValuesOf('timeZone')
    : ['UTC'];

export const BROWSER_TIMEZONE =
  Intl.DateTimeFormat().resolvedOptions().timeZone;
