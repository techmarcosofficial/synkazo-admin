import * as React from 'react';
import { cn } from '@/lib/utils';

export interface BorderBeamProps {
  className?: string;
  duration?: number;
  borderWidth?: number;
  color?: string;
  glowColor?: string;
  rx?: number;
  beamLength?: number;
}

export function BorderBeam({
  className,
  duration = 2.8,
  borderWidth = 1,
  color = 'var(--primary)',
  glowColor = 'var(--primary)',
  rx,
  beamLength = 20,
}: BorderBeamProps) {
  const svgRef = React.useRef<SVGSVGElement>(null);
  const [detectedRx, setDetectedRx] = React.useState<number>(rx ?? 24);

  React.useLayoutEffect(() => {
    if (rx !== undefined) {
      setDetectedRx(rx);
      return;
    }

    const parent = svgRef.current?.parentElement;
    if (!parent) return;

    const measure = () => {
      try {
        const style = window.getComputedStyle(parent);
        const tl = parseFloat(style.borderTopLeftRadius);
        const br = parseFloat(style.borderRadius);
        const parsed =
          (tl > 0 ? tl : br > 0 ? br : 0) ||
          parseFloat(parent.style.borderRadius) ||
          parseFloat(parent.style.borderTopLeftRadius) ||
          0;
        if (parsed > 0) {
          setDetectedRx(parsed);
        }
      } catch {
        /* ignore */
      }
    };

    measure();

    if (typeof ResizeObserver !== 'undefined') {
      const ro = new ResizeObserver(measure);
      ro.observe(parent);
      return () => ro.disconnect();
    }
  }, [rx]);

  const effectiveRx = rx ?? detectedRx;
  const gap = 100 - beamLength;
  const insetOffset = borderWidth / 2;

  return (
    <svg
      ref={svgRef}
      aria-hidden="true"
      data-slot="border-beam"
      className={cn(
        'pointer-events-none absolute inset-0 size-full overflow-visible rounded-[inherit]',
        className,
      )}
    >
      {/* Subtle outer glow on the 1px edge */}
      {glowColor && (
        <rect
          x={insetOffset}
          y={insetOffset}
          width={`calc(100% - ${borderWidth}px)`}
          height={`calc(100% - ${borderWidth}px)`}
          rx={effectiveRx}
          fill="none"
          stroke={glowColor}
          strokeWidth={borderWidth + 1}
          strokeLinecap="round"
          pathLength="100"
          strokeDasharray={`${beamLength} ${gap}`}
          style={{
            animation: `border-beam-dash ${duration}s linear infinite`,
            opacity: 0.35,
          }}
        />
      )}

      {/* Crisp 1px primary core traveling precisely along the connector card border edge */}
      <rect
        x={insetOffset}
        y={insetOffset}
        width={`calc(100% - ${borderWidth}px)`}
        height={`calc(100% - ${borderWidth}px)`}
        rx={effectiveRx}
        fill="none"
        stroke={color}
        strokeWidth={borderWidth}
        strokeLinecap="round"
        pathLength="100"
        strokeDasharray={`${beamLength} ${gap}`}
        style={{
          animation: `border-beam-dash ${duration}s linear infinite`,
        }}
      />
    </svg>
  );
}
