import type { ReactNode } from 'react';

import InfoTip from '@/components/shared/InfoTip';
import { cn } from '@/lib/utils';

/**
 * One "Label — control — hint" row, as in the settings mockups: labels sit in
 * a fixed column so every control lines up. Stacks on narrow screens.
 */
export function SettingRow({
  label,
  htmlFor,
  info,
  hint,
  children,
  className,
}: {
  label: string;
  htmlFor?: string;
  info?: ReactNode;
  /** Short muted text shown right after the control. */
  hint?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        'grid gap-2 py-3 sm:grid-cols-[11rem_minmax(0,1fr)] sm:items-center sm:gap-4',
        className,
      )}
    >
      <div className="flex min-w-0 items-center gap-1.5">
        <label
          htmlFor={htmlFor}
          className="text-foreground text-[13px] font-semibold"
        >
          {label}
        </label>
        {info && <InfoTip label={`About ${label}`}>{info}</InfoTip>}
      </div>
      <div className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1">
        {children}
        {hint && (
          <span className="text-muted-foreground text-[13px]">{hint}</span>
        )}
      </div>
    </div>
  );
}

/** Heading + subtitle at the top of each tab. */
export function TabIntro({
  title,
  subtitle,
}: {
  title: string;
  subtitle: string;
}) {
  return (
    <div className="space-y-0.5 pb-1">
      <h3 className="text-foreground text-[15px] font-semibold">{title}</h3>
      <p className="text-muted-foreground text-[13px]">{subtitle}</p>
    </div>
  );
}

/** Groups rows with dividers between them. */
export function SettingRows({ children }: { children: ReactNode }) {
  return <div className="divide-border/70 divide-y">{children}</div>;
}
