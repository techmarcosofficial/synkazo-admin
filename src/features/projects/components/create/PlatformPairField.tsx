// features/projects/components/create/PlatformPairField.tsx
//
// Source/destination platform pickers with the animated "rope" connector
// between them. Shared by CreateProjectForm and GeneralSettingsCard so the
// visualization behaves identically in create and edit.

import { CloudSync } from 'lucide-react';
import { useLayoutEffect, useRef, useState } from 'react';

import PlatformSelector, { type PlatformListItem } from './PlatformSelector';

import type { PlatformId } from '@/types/connection';

interface PlatformPairFieldProps {
  sourceValue: PlatformId | '';
  destValue: PlatformId | '';
  onSourceChange: (value: PlatformId) => void;
  onDestChange: (value: PlatformId) => void;
  platforms: PlatformListItem[];
  // Optional per-side overrides — when omitted, both sides fall back to
  // `platforms` filtered to exclude whatever is picked on the other side.
  // Both CreateProjectForm and GeneralSettingsCard pass these to restrict the
  // destination side to HubSpot only (many sources -> one destination).
  sourcePlatforms?: PlatformListItem[];
  destPlatforms?: PlatformListItem[];
  disabled?: boolean;
  // Per-side disable on top of `disabled` — used once a platform side has a
  // live connection and switching it would orphan that connection.
  sourceDisabled?: boolean;
  destDisabled?: boolean;
  sourceError?: string;
  destError?: string;
}

export default function PlatformPairField({
  sourceValue,
  destValue,
  onSourceChange,
  onDestChange,
  platforms,
  sourcePlatforms: sourcePlatformsOverride,
  destPlatforms: destPlatformsOverride,
  disabled = false,
  sourceDisabled = false,
  destDisabled = false,
  sourceError,
  destError,
}: PlatformPairFieldProps) {
  const connectorRef = useRef<HTMLDivElement | null>(null);
  const sourceRefs = useRef<Partial<Record<PlatformId, HTMLDivElement | null>>>(
    {},
  );
  const destRefs = useRef<Partial<Record<PlatformId, HTMLDivElement | null>>>(
    {},
  );

  // Any platform can be either side of the pair — a project just names two
  // fixed platforms; per-job sync direction (one-way, and which way, or
  // two-way) is chosen when creating a job, not here. The only constraint is
  // a platform can't be synced with itself.
  const sourcePlatforms =
    sourcePlatformsOverride ??
    platforms.filter((p) => p.platformId !== destValue);
  const destPlatforms =
    destPlatformsOverride ??
    platforms.filter((p) => p.platformId !== sourceValue);

  const [rope, setRope] = useState<{
    height: number;
    sourceY: number | null;
    destY: number | null;
  } | null>(null);

  useLayoutEffect(() => {
    const computeRope = () => {
      const container = connectorRef.current;
      if (!container) return;

      const containerRect = container.getBoundingClientRect();

      const getCenterY = (
        refs: React.MutableRefObject<
          Partial<Record<PlatformId, HTMLDivElement | null>>
        >,
        id: string,
      ) => {
        const el = refs.current[id as PlatformId];
        if (!el) return null;
        const rect = el.getBoundingClientRect();
        return rect.top - containerRect.top + rect.height / 2;
      };

      setRope({
        height: containerRect.height,
        sourceY: sourceValue ? getCenterY(sourceRefs, sourceValue) : null,
        destY: destValue ? getCenterY(destRefs, destValue) : null,
      });
    };

    computeRope();

    const resizeObserver = new ResizeObserver(computeRope);
    if (connectorRef.current) resizeObserver.observe(connectorRef.current);
    window.addEventListener('resize', computeRope);

    return () => {
      resizeObserver.disconnect();
      window.removeEventListener('resize', computeRope);
    };
  }, [sourceValue, destValue]);

  const iconY =
    rope == null
      ? null
      : rope.sourceY != null && rope.destY != null
        ? (rope.sourceY + rope.destY) / 2
        : rope.sourceY != null
          ? rope.sourceY
          : rope.destY != null
            ? rope.destY
            : rope.height / 2;

  return (
    <div className="relative grid grid-cols-[1fr_auto_1fr] items-stretch">
      <PlatformSelector
        label="Source Platform"
        description="Where records will be read from."
        value={sourceValue}
        platforms={sourcePlatforms}
        disabled={disabled || sourceDisabled}
        onChange={onSourceChange}
        registerItemRef={(platformId, el) => {
          sourceRefs.current[platformId] = el;
        }}
      />

      {/* Rope connector between source and destination */}
      <div className="flex">
        <div ref={connectorRef} className="relative h-full w-40">
          {rope &&
            rope.height > 0 &&
            (rope.destY != null || rope.sourceY != null) && (
              <svg
                className="text-primary/40 pointer-events-none absolute inset-0 h-full w-full"
                viewBox={`0 0 64 ${rope.height}`}
                preserveAspectRatio="none"
                fill="none"
              >
                {/* neutral state: nothing picked yet */}
                {rope.sourceY == null && rope.destY == null && (
                  <path
                    d={`M 32 0 L 32 ${rope.height}`}
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeDasharray="7 6"
                    strokeLinecap="round"
                    vectorEffect="non-scaling-stroke"
                  />
                )}

                {/* source -> icon */}
                {rope.sourceY != null && iconY != null && (
                  <path
                    d={`M 0 ${rope.sourceY} C 16 ${rope.sourceY}, 16 ${iconY}, 32 ${iconY}`}
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeDasharray="7 6"
                    strokeLinecap="round"
                    vectorEffect="non-scaling-stroke"
                  />
                )}

                {/* icon -> destination */}
                {rope.destY != null && iconY != null && (
                  <path
                    d={`M 32 ${iconY} C 48 ${iconY}, 48 ${rope.destY}, 64 ${rope.destY}`}
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeDasharray="7 6"
                    strokeLinecap="round"
                    vectorEffect="non-scaling-stroke"
                  />
                )}
              </svg>
            )}
          <div
            className="border-primary/30 bg-background absolute z-10 flex h-11 w-11 items-center justify-center rounded-full border-2 border-dashed shadow-sm"
            style={{
              top: iconY != null ? `${iconY}px` : '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
            }}
          >
            <CloudSync className="text-primary h-5 w-5" />
          </div>
        </div>
      </div>

      <PlatformSelector
        label="Destination Platform"
        description="Where records will be synced to."
        value={destValue}
        platforms={destPlatforms}
        disabled={disabled || destDisabled}
        centerItems={destPlatformsOverride != null}
        onChange={onDestChange}
        registerItemRef={(platformId, el) => {
          destRefs.current[platformId] = el;
        }}
      />

      {(sourceError || destError) && (
        <div className="col-span-3 mt-4 space-y-2">
          {sourceError && (
            <p className="text-destructive text-sm">{sourceError}</p>
          )}
          {destError && <p className="text-destructive text-sm">{destError}</p>}
        </div>
      )}
    </div>
  );
}
