import { ArrowLeft } from 'lucide-react';

import { SynkazoMark } from '@/components/branding/SynkazoMark';

const integrations = [
  {
    name: 'ServiceTitan',
    description: 'Field Operations',
    logo: '/servicetitan-logo.svg',
    className: 'is-servicetitan',
  },
  {
    name: 'Dataforma',
    description: 'Back Office',
    logo: '/dataforma-logo.svg',
    className: 'is-dataforma',
  },
  {
    name: 'Texada',
    description: 'Equipment Data',
    logo: '/texada-logo.svg',
    className: 'is-texada',
  },
];

function IntegrationCardFace({
  name,
  description,
  logo,
  className,
}: (typeof integrations)[number]) {
  return (
    <div className={`synkazo-sync-source-face ${className}`}>
      <span className="synkazo-sync-tool-logo">
        <img src={logo} alt="" />
      </span>
      <span className="synkazo-sync-tool-copy">
        <strong>{name}</strong>
        <small>{description}</small>
        <span className="synkazo-sync-state">
          <i /> Connected
        </span>
      </span>
    </div>
  );
}

export default function AuthShowcase() {
  return (
    <aside
      className="synkazo-login-showcase"
      aria-label="Synkazo platform overview"
    >
      <div className="synkazo-showcase-grid" aria-hidden="true" />
      <div className="synkazo-showcase-glow" aria-hidden="true" />
      <div className="synkazo-showcase-horizon" aria-hidden="true" />

      <header className="synkazo-showcase-header">
        <a href={import.meta.env.VITE_FRONTEND_URL}>
          <ArrowLeft />
          Back to Home
        </a>
      </header>

      <div className="synkazo-showcase-content">
        <div className="synkazo-showcase-intro">
          <p className="synkazo-login-eyebrow">ALL YOUR DATA. IN SYNC.</p>
          <h2 className="synkazo-showcase-message">
            <span className="sr-only">
              Your source data flows into HubSpot.
            </span>
            <span className="synkazo-showcase-message-copy" aria-hidden="true">
              Data flowing into <em>HubSpot</em>
              <br /> from{' '}
              <span className="synkazo-showcase-source-name">
                {integrations.map(({ name }) => (
                  <strong key={name}>{name}</strong>
                ))}
              </span>
              <span>.</span>
            </span>
          </h2>
          <p>
            Synkazo securely syncs your data across the tools you love,
            <br className="synkazo-wide-only" /> so your teams always work with
            the latest information.
          </p>
        </div>

        <div className="synkazo-sync-stage" aria-hidden="true">
          <svg
            className="synkazo-sync-lines"
            viewBox="0 0 760 300"
            preserveAspectRatio="none"
            aria-hidden="true"
          >
            <defs>
              <filter
                id="sync-line-glow"
                x="-40%"
                y="-40%"
                width="180%"
                height="180%"
              >
                <feGaussianBlur stdDeviation="4" result="blur" />
                <feMerge>
                  <feMergeNode in="blur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
            </defs>
            <g className="synkazo-sync-line-base">
              <path
                className="synkazo-sync-source-rope"
                d="M262 42 C312 42 275 150 340 150"
              />
              <path d="M472 150 C537 150 500 258 550 258" />
            </g>
            <g className="synkazo-sync-line-flow" filter="url(#sync-line-glow)">
              <path
                className="synkazo-sync-source-rope"
                d="M262 42 C312 42 275 150 340 150"
              />
              <path d="M472 150 C537 150 500 258 550 258" />
            </g>
            <g className="synkazo-sync-points">
              <circle cx="262" cy="42" r="4" />
              <circle cx="340" cy="150" r="5" />
              <circle cx="472" cy="150" r="5" />
              <circle cx="550" cy="258" r="5" />
            </g>
          </svg>

          <div className="synkazo-sync-sources">
            <div className="synkazo-sync-tool synkazo-sync-source-card bg-background">
              {integrations.map((integration) => (
                <IntegrationCardFace key={integration.name} {...integration} />
              ))}
            </div>
          </div>

          <div className="synkazo-sync-core bg-background">
            <SynkazoMark className="synkazo-sync-core-mark" />
            <strong>synkazo</strong>
            <span>Middleware</span>
          </div>

          <div className="synkazo-sync-tool synkazo-sync-destination is-hubspot bg-background">
            <span className="synkazo-sync-tool-logo">
              <img src="/hubspot-logo.svg" alt="" />
            </span>
            <span className="synkazo-sync-tool-copy">
              <strong>HubSpot</strong>
              <small>CRM &amp; Marketing</small>
              <span className="synkazo-sync-state">
                <i /> Synced
              </span>
            </span>
          </div>
        </div>

        <footer className="synkazo-showcase-footer">
          <blockquote>
            “Synkazo eliminated data silos for our team.
            <br /> Everything just works.”
            <cite>— Operations Leader, Growth Equipment Co.</cite>
          </blockquote>

          <div className="synkazo-showcase-metrics">
            <div>
              <strong>50+</strong>
              <span>Integrations</span>
            </div>
            <div>
              <strong>99.9%</strong>
              <span>Uptime</span>
            </div>
            <div>
              <strong>10x</strong>
              <span>More productive teams</span>
            </div>
          </div>
        </footer>
      </div>
    </aside>
  );
}
