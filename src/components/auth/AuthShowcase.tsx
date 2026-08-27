import { IntegrationMockup } from './IntegrationMockup';

/**
 * Right-hand marketing panel for the auth pages — reuses the landing-page hero
 * mockup (Safari-glass browser, integration animation) with a vertical layout
 * (sources on top, Synkazo in the middle, destination at the bottom), which
 * suits this panel's tall/narrow proportions better than the horizontal hero.
 * The grid + purple glow backdrop lives here only — the form side stays plain.
 */
export default function AuthShowcase() {
  return (
    <div className="bg-muted/30 relative isolate hidden overflow-hidden xl:flex xl:flex-col xl:items-center xl:justify-center xl:p-10">
      <div
        className="bg-grid pointer-events-none absolute inset-0 -z-20 mask-[radial-gradient(ellipse_80%_80%_at_50%_40%,black,transparent_85%)] opacity-70"
        aria-hidden="true"
      />
      <div
        className="bg-primary/25 pointer-events-none absolute top-1/4 -left-10 -z-10 size-80 animate-[pulse_6s_ease-in-out_infinite] rounded-full blur-3xl"
        aria-hidden="true"
      />
      <div
        className="bg-primary/20 pointer-events-none absolute -right-10 bottom-1/4 -z-10 size-72 animate-[pulse_7s_ease-in-out_infinite] rounded-full blur-3xl"
        aria-hidden="true"
      />

      <div className="animate-fade-in-up relative w-full">
        <IntegrationMockup variant="vertical" />
      </div>
    </div>
  );
}
