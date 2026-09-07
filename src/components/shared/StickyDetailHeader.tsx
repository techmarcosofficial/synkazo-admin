import { ChevronLeft } from 'lucide-react';
import { type ReactNode, useLayoutEffect, useRef } from 'react';
import { Link } from 'react-router-dom';

import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface StickyDetailHeaderProps {
  backLabel: string;
  backTo: string;
  children: ReactNode;
  className?: string;
  header: ReactNode;
}

/**
 * Two independently sticky rows for detail pages. The header overlaps the
 * back action slightly so its card surface remains visually in front.
 */
export default function StickyDetailHeader({
  backLabel,
  backTo,
  children,
  className,
  header,
}: StickyDetailHeaderProps) {
  const rootRef = useRef<HTMLElement>(null);

  useLayoutEffect(() => {
    const root = rootRef.current;
    const backRow = root?.querySelector<HTMLElement>(
      '[data-slot="sticky-detail-back"]',
    );
    if (!root || !backRow) return;

    let stickyTop = 0;

    const updateStuckState = () => {
      const isStuck =
        window.scrollY > 0 &&
        root.getBoundingClientRect().top <= stickyTop + 0.5;
      backRow.dataset.stuck = String(isStuck);
    };

    const measureNaturalTop = () => {
      stickyTop = root.getBoundingClientRect().top + window.scrollY;
      root.style.setProperty('--detail-sticky-top', `${stickyTop}px`);
      updateStuckState();
    };

    measureNaturalTop();
    window.addEventListener('scroll', updateStuckState, { passive: true });
    window.addEventListener('resize', measureNaturalTop);

    const resizeObserver =
      typeof ResizeObserver === 'undefined'
        ? null
        : new ResizeObserver(measureNaturalTop);
    const pageContent = root.closest('main');
    if (pageContent) resizeObserver?.observe(pageContent);

    return () => {
      window.removeEventListener('scroll', updateStuckState);
      window.removeEventListener('resize', measureNaturalTop);
      resizeObserver?.disconnect();
    };
  }, []);

  return (
    <section
      ref={rootRef}
      className={cn(
        'relative isolate [--detail-back-row-height:--spacing(11)] [--detail-header-overlap:--spacing(2)] [--detail-sticky-top:var(--app-shell-header-height)]',
        className,
      )}
    >
      <div
        data-slot="sticky-detail-back"
        className="bg-background before:bg-background sticky top-(--detail-sticky-top) z-20 flex h-(--detail-back-row-height) items-start before:pointer-events-none before:absolute before:inset-x-0 before:bottom-full before:hidden before:h-[calc(var(--detail-sticky-top)-var(--app-shell-header-height))] before:content-[''] data-[stuck=true]:before:block"
      >
        <Button
          asChild
          variant="secondary"
          className="h-(--detail-back-row-height) rounded-t-3xl rounded-b-none bg-border pb-(--detail-header-overlap)"
        >
          <Link to={backTo}>
            <ChevronLeft aria-hidden="true" data-icon="inline-start" />
            {backLabel}
          </Link>
        </Button>
      </div>

      <div
        data-slot="sticky-detail-header"
        className="sticky top-[calc(var(--detail-sticky-top)+var(--detail-back-row-height)-var(--detail-header-overlap))] z-30 -mt-(--detail-header-overlap)"
      >
        {header}
      </div>

      <div className="space-y-6 pt-6">{children}</div>
    </section>
  );
}
