import {
  RefreshCw,
  Map,
  Filter,
  ShieldCheck,
  Database,
  Clock,
  BarChart3,
} from 'lucide-react';
import {
  forwardRef,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
  type RefObject,
} from 'react';

import { BrowserMockup } from './BrowserMockup';

import { getPlatform } from '@/components/platform/platform';
import { PlatformIcon } from '@/components/platform/PlatformIcon';
import { cn } from '@/lib/utils';

export type IntegrationMockupVariant = 'horizontal' | 'vertical';

/**
 * SMIL (<animateMotion>) isn't controllable via the CSS `animation` property, so
 * `prefers-reduced-motion` can't disable it from a stylesheet alone. This hook drives
 * that decision from React instead — connectors skip rendering their moving dots when
 * reduced motion is requested, while the CSS keyframes below handle the rest.
 */
function usePrefersReducedMotion() {
  const [reduced, setReduced] = useState(
    () =>
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches,
  );
  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const handler = (e: MediaQueryListEvent) => setReduced(e.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);
  return reduced;
}

const SOURCE_PLATFORM_IDS = ['servicetitan', 'dataforma', 'texada'];
const DESTINATION_PLATFORM_ID = 'hubspot';

/** Constant visual rhythm for every connector, regardless of how long its path ends up being. */
const DOT_SPACING_PX = 42;
const DOT_SPEED_PX_PER_SEC = 90;
const MIN_DURATION_S = 0.5;

const MIDDLEWARE_FEATURES: { label: string; icon: ReactNode }[] = [
  { label: 'Field Mapping', icon: <Map className="size-3.5" /> },
  { label: 'Data Transformation', icon: <Filter className="size-3.5" /> },
  { label: 'Validation & Rules', icon: <ShieldCheck className="size-3.5" /> },
  { label: 'Queue & Retry', icon: <Database className="size-3.5" /> },
  { label: 'Scheduling', icon: <Clock className="size-3.5" /> },
  { label: 'Monitoring & Logs', icon: <BarChart3 className="size-3.5" /> },
];

const PlatformCard = forwardRef<
  HTMLDivElement,
  { platformId: string; subtitle?: string; className?: string }
>(function PlatformCard({ platformId, subtitle, className = '' }, ref) {
  const platform = getPlatform(platformId);
  return (
    <div
      ref={ref}
      className={`bg-card flex w-full max-w-[168px] items-center gap-2.5 rounded-lg border px-3 py-2 ${className}`}
    >
      <PlatformIcon platformId={platformId} variant="avatar" size={'xl'} />
      <div className="min-w-0">
        <p className="truncate text-[12px] leading-tight font-semibold">
          {platform?.name ?? platformId}
        </p>
        {subtitle ? (
          <p className="text-muted-foreground truncate text-[10px] leading-tight">
            {subtitle}
          </p>
        ) : null}
      </div>
    </div>
  );
});

/**
 * Compact by default — only the app mark, name, and "Middleware" label.
 * Capabilities live in a floating panel that reveals on hover/focus so the
 * default view stays focused on the Sources → Synkazo → Destination flow.
 */
const MiddlewareCard = forwardRef<HTMLDivElement>(
  function MiddlewareCard(_props, ref) {
    return (
      <div
        ref={ref}
        tabIndex={0}
        aria-label="Synkazo middleware — hover to see capabilities"
        className="middleware-card group/mw bg-card focus-visible:ring-primary/50 relative w-full max-w-[168px] shrink-0 rounded-lg border p-2.5 outline-none focus-visible:ring-2 focus-visible:ring-offset-2"
      >
        <div className="flex items-center gap-2">
          <div className="bg-primary text-primary-foreground flex size-7 shrink-0 items-center justify-center rounded-md">
            <RefreshCw className="size-3.5" />
          </div>
          <div className="min-w-0">
            <p className="truncate text-[13px] leading-tight font-semibold">
              Synkazo
            </p>
            <p className="text-muted-foreground truncate text-[10px] leading-tight">
              Middleware
            </p>
          </div>
        </div>

        {/* Floating capability panel — absolutely positioned so it never shifts the
         surrounding source/destination cards or connector lines. */}
        <div className="pointer-events-none absolute top-[calc(100%+10px)] left-1/2 z-20 w-64 -translate-x-1/2 -translate-y-1 opacity-0 transition-[opacity,transform] duration-200 ease-out group-focus-within/mw:pointer-events-auto group-focus-within/mw:translate-y-0 group-focus-within/mw:opacity-100 group-hover/mw:pointer-events-auto group-hover/mw:translate-y-0 group-hover/mw:opacity-100">
          <div className="bg-card grid grid-cols-2 gap-1.5 rounded-lg border p-2.5 shadow-lg">
            {MIDDLEWARE_FEATURES.map((f, i) => (
              <div
                key={f.label}
                style={{ transitionDelay: `${i * 40}ms` }}
                className="bg-muted/60 text-foreground flex translate-y-1 items-center gap-1.5 rounded-md px-1.5 py-1.5 opacity-0 transition-[opacity,transform] duration-200 ease-out group-focus-within/mw:translate-y-0 group-focus-within/mw:opacity-100 group-hover/mw:translate-y-0 group-hover/mw:opacity-100"
              >
                <span className="text-muted-foreground shrink-0">{f.icon}</span>
                <span className="truncate text-[10px] leading-tight font-medium">
                  {f.label}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  },
);

/**
 * Renders a dashed path plus a stream of dots that travel along that exact path (via
 * SMIL `animateMotion`, following the real `d`, not a scaled copy of it). The dot count,
 * their spacing, and the loop duration are all derived from the path's actual measured
 * length (`getTotalLength`), so density and speed stay constant however long the path is.
 *
 * This is the single animation implementation shared by every connector, in both
 * variants — only the `d` passed in changes.
 */
function AnimatedPath({
  d,
  reduceMotion,
}: {
  d: string;
  reduceMotion: boolean;
}) {
  const pathRef = useRef<SVGPathElement>(null);
  const [length, setLength] = useState(0);

  useLayoutEffect(() => {
    setLength(pathRef.current?.getTotalLength() ?? 0);
  }, [d]);

  const duration = Math.max(length / DOT_SPEED_PX_PER_SEC, MIN_DURATION_S);
  const dotCount =
    length > 0 ? Math.max(1, Math.round(length / DOT_SPACING_PX)) : 0;

  return (
    <>
      <path
        d={d}
        ref={pathRef}
        stroke="var(--border)"
        strokeWidth="1.5"
        strokeDasharray="3 4"
        strokeLinecap="round"
        fill="none"
      />
      {!reduceMotion &&
        Array.from({ length: dotCount }, (_, i) => (
          <circle key={i} r="2.5" fill="var(--primary)">
            <animateMotion
              dur={`${duration}s`}
              begin={`${(i * duration) / dotCount}s`}
              repeatCount="indefinite"
              path={d}
            />
            <animate
              attributeName="opacity"
              values="0;1;1;0"
              keyTimes="0;0.08;0.92;1"
              dur={`${duration}s`}
              begin={`${(i * duration) / dotCount}s`}
              repeatCount="indefinite"
            />
          </circle>
        ))}
    </>
  );
}

interface Point {
  x: number;
  y: number;
}

interface ConnectorAnchors {
  sources: Point[];
  middlewareIn: Point;
  middlewareOut: Point;
  destination: Point;
}

/**
 * Measures the real, rendered positions of the source cards, the middleware card, and
 * the destination card (all relative to their shared container) and derives the anchor
 * point each connector should draw from/to. Which edges of each card are used —
 * center-right → center-left for `horizontal`, bottom-center → top-center for
 * `vertical` — is the *only* thing that changes between variants; the measuring and
 * path-drawing code below is shared.
 */
function useConnectorAnchors(
  containerRef: RefObject<HTMLDivElement | null>,
  sourceRefs: RefObject<HTMLDivElement | null>[],
  middlewareRef: RefObject<HTMLDivElement | null>,
  destinationRef: RefObject<HTMLDivElement | null>,
  variant: IntegrationMockupVariant,
) {
  const [state, setState] = useState<{
    anchors: ConnectorAnchors | null;
    width: number;
    height: number;
  }>({
    anchors: null,
    width: 0,
    height: 0,
  });

  useLayoutEffect(() => {
    let rafId = 0;
    let ro: ResizeObserver | null = null;

    // Refs can lag a frame behind this effect in some mount timings (e.g. dev-mode
    // double-invoke); poll via rAF until every card is actually attached instead of
    // assuming they're ready on the first pass.
    const trySetup = () => {
      const container = containerRef.current;
      const middleware = middlewareRef.current;
      const destination = destinationRef.current;
      const sources = sourceRefs.map((r) => r.current);
      if (
        !container ||
        !middleware ||
        !destination ||
        sources.some((s) => !s)
      ) {
        rafId = requestAnimationFrame(trySetup);
        return;
      }

      const measure = () => {
        const containerBox = container.getBoundingClientRect();
        const relative = (box: DOMRect) => ({
          left: box.left - containerBox.left,
          top: box.top - containerBox.top,
          width: box.width,
          height: box.height,
        });

        const mwBox = relative(middleware.getBoundingClientRect());
        const destBox = relative(destination.getBoundingClientRect());
        const sourceBoxes = sources.map((s) =>
          relative(s!.getBoundingClientRect()),
        );

        const anchors: ConnectorAnchors =
          variant === 'horizontal'
            ? {
                sources: sourceBoxes.map((b) => ({
                  x: b.left + b.width,
                  y: b.top + b.height / 2,
                })),
                middlewareIn: {
                  x: mwBox.left,
                  y: mwBox.top + mwBox.height / 2,
                },
                middlewareOut: {
                  x: mwBox.left + mwBox.width,
                  y: mwBox.top + mwBox.height / 2,
                },
                destination: {
                  x: destBox.left,
                  y: destBox.top + destBox.height / 2,
                },
              }
            : {
                sources: sourceBoxes.map((b) => ({
                  x: b.left + b.width / 2,
                  y: b.top + b.height,
                })),
                middlewareIn: { x: mwBox.left + mwBox.width / 2, y: mwBox.top },
                middlewareOut: {
                  x: mwBox.left + mwBox.width / 2,
                  y: mwBox.top + mwBox.height,
                },
                destination: {
                  x: destBox.left + destBox.width / 2,
                  y: destBox.top,
                },
              };

        setState({
          anchors,
          width: containerBox.width,
          height: containerBox.height,
        });
      };

      measure();
      ro = new ResizeObserver(measure);
      ro.observe(container);
      [middleware, destination, ...sources].forEach((el) => ro!.observe(el!));
    };

    trySetup();
    return () => {
      cancelAnimationFrame(rafId);
      ro?.disconnect();
    };
  }, [containerRef, sourceRefs, middlewareRef, destinationRef, variant]);

  return state;
}

/** Smooth bezier between two points, curved along whichever axis carries the flow for this variant. */
function curvePath(from: Point, to: Point, axis: 'x' | 'y'): string {
  if (axis === 'x') {
    if (Math.abs(from.y - to.y) < 1)
      return `M${from.x} ${from.y} L ${to.x} ${to.y}`;
    const midX = (from.x + to.x) / 2;
    return `M${from.x} ${from.y} C ${midX} ${from.y}, ${midX} ${to.y}, ${to.x} ${to.y}`;
  }
  if (Math.abs(from.x - to.x) < 1)
    return `M${from.x} ${from.y} L ${to.x} ${to.y}`;
  const midY = (from.y + to.y) / 2;
  return `M${from.x} ${from.y} C ${from.x} ${midY}, ${to.x} ${midY}, ${to.x} ${to.y}`;
}

/**
 * The one SVG connector system for both variants. It merges the source cards into the
 * middleware's "in" anchor, then draws a single lane from the middleware's "out" anchor
 * to the destination — same as before — but the anchors themselves come from
 * `useConnectorAnchors`, so the whole thing re-derives itself from the DOM whenever the
 * variant (or a resize) changes, instead of branching between two hand-built layouts.
 */
function ConnectorOverlay({
  variant,
  reduceMotion,
  containerRef,
  sourceRefs,
  middlewareRef,
  destinationRef,
}: {
  variant: IntegrationMockupVariant;
  reduceMotion: boolean;
  containerRef: RefObject<HTMLDivElement | null>;
  sourceRefs: RefObject<HTMLDivElement | null>[];
  middlewareRef: RefObject<HTMLDivElement | null>;
  destinationRef: RefObject<HTMLDivElement | null>;
}) {
  const { anchors, width, height } = useConnectorAnchors(
    containerRef,
    sourceRefs,
    middlewareRef,
    destinationRef,
    variant,
  );
  if (!anchors || width < 1 || height < 1) return null;

  const axis = variant === 'horizontal' ? 'x' : 'y';
  const mergePaths = anchors.sources.map((p) =>
    curvePath(p, anchors.middlewareIn, axis),
  );
  const outputPath = curvePath(
    anchors.middlewareOut,
    anchors.destination,
    axis,
  );

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      fill="none"
      className="pointer-events-none absolute inset-0 overflow-visible"
      aria-hidden="true"
    >
      {mergePaths.map((d, i) => (
        <AnimatedPath key={i} d={d} reduceMotion={reduceMotion} />
      ))}
      <circle
        cx={anchors.middlewareIn.x}
        cy={anchors.middlewareIn.y}
        r="3"
        fill="var(--card)"
        stroke="var(--primary)"
        strokeWidth="1.5"
        className={reduceMotion ? undefined : 'animate-pulse'}
      />

      <circle
        cx={anchors.middlewareOut.x}
        cy={anchors.middlewareOut.y}
        r="3"
        fill="var(--card)"
        stroke="var(--primary)"
        strokeWidth="1.5"
        className={reduceMotion ? undefined : 'animate-pulse'}
      />
      <AnimatedPath d={outputPath} reduceMotion={reduceMotion} />
      <circle
        cx={anchors.destination.x}
        cy={anchors.destination.y}
        r="3"
        fill="var(--card)"
        stroke="var(--primary)"
        strokeWidth="1.5"
        className={reduceMotion ? undefined : 'hub-node animate-pulse'}
      />
    </svg>
  );
}

export interface IntegrationMockupProps {
  /**
   * `horizontal` — sources stacked vertically, Synkazo centered, destination on the
   * right (the original layout). `vertical` — sources in a row on top, Synkazo
   * centered below, destination centered at the bottom. Defaults to `horizontal`.
   */
  variant?: IntegrationMockupVariant;
}

/**
 * Sources → Synkazo → Destination integration animation used on the marketing hero
 * and reused verbatim (via `variant="vertical"`) on the auth pages. The parent decides
 * the layout by passing `variant`; the connector geometry and the dot animation adapt
 * automatically from the rendered card positions — there is no per-variant SVG or
 * animation code to keep in sync.
 */
export function IntegrationMockup({
  variant = 'horizontal',
}: IntegrationMockupProps) {
  const reduceMotion = usePrefersReducedMotion();
  const containerRef = useRef<HTMLDivElement>(null);
  const middlewareRef = useRef<HTMLDivElement>(null);
  const destinationRef = useRef<HTMLDivElement>(null);
  const sourceRef0 = useRef<HTMLDivElement>(null);
  const sourceRef1 = useRef<HTMLDivElement>(null);
  const sourceRef2 = useRef<HTMLDivElement>(null);
  const sourceRefs = useMemo(() => [sourceRef0, sourceRef1, sourceRef2], []);

  const isHorizontal = variant === 'horizontal';

  return (
    <div
      className={cn(
        'mx-auto w-full select-none',
        variant === 'vertical' && 'max-w-[450px]',
        reduceMotion && 'reduce-motion',
      )}
      aria-hidden="true"
    >
      {/* Brief arrival highlights, timed to each connector's own loop — kept out of the
         global stylesheet since they're specific to this visual. Gated by .reduce-motion
         rather than a bare prefers-reduced-motion query, so it stays in sync with the
         same JS check that governs the <animateMotion> dots above. */}
      <style>{`
        .middleware-card { animation: middlewareArrival 2.6s ease-in-out infinite; }
        @keyframes middlewareArrival {
          0%, 88%, 100% { border-color: var(--border); box-shadow: none; }
          94% { border-color: var(--primary); }
        }
        .hub-node { animation: hubArrival 1.6s ease-out infinite; }
        @keyframes hubArrival {
          0%, 65%, 100% { r: 3; opacity: 1; }
          80% { r: 7; opacity: 0; }
        }
        .reduce-motion .middleware-card,
        .reduce-motion .hub-node,
        .reduce-motion .animate-pulse,
        .reduce-motion .animate-ping {
          animation: none !important;
        }
      `}</style>

      <BrowserMockup>
        <div
          ref={containerRef}
          className={
            isHorizontal
              ? 'relative flex items-center justify-between gap-10 lg:gap-14'
              : 'relative flex flex-col items-center gap-25'
          }
        >
          <div
            className={
              isHorizontal
                ? 'flex flex-col items-stretch gap-4'
                : 'flex flex-row items-center gap-4'
            }
          >
            {SOURCE_PLATFORM_IDS.map((platformId, i) => (
              <PlatformCard
                key={platformId}
                ref={sourceRefs[i]}
                platformId={platformId}
                className={
                  variant === 'vertical'
                    ? 'min-w-[100px] flex-col justify-center'
                    : ''
                }
              />
            ))}
          </div>

          <MiddlewareCard ref={middlewareRef} />
          <PlatformCard
            ref={destinationRef}
            platformId={DESTINATION_PLATFORM_ID}
            subtitle="Single Instance"
          />

          <ConnectorOverlay
            variant={variant}
            reduceMotion={reduceMotion}
            containerRef={containerRef}
            sourceRefs={sourceRefs}
            middlewareRef={middlewareRef}
            destinationRef={destinationRef}
          />
        </div>

        <div className="bg-card text-muted-foreground relative mx-auto mt-2 flex w-fit items-center gap-2 rounded-full border px-3 py-1.5 text-[11px] font-medium">
          <span className="relative flex size-2">
            <span className="bg-success absolute inline-flex size-full animate-ping rounded-full opacity-75" />
            <span className="bg-success relative inline-flex size-2 rounded-full" />
          </span>
          Synced 2 seconds ago
        </div>
      </BrowserMockup>
    </div>
  );
}
