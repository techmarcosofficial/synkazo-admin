import { ArrowLeft } from 'lucide-react';
import { type ReactNode } from 'react';

import AuthShowcase from './AuthShowcase';
import { SynkazoWordmark } from '@/components/branding/SynkazoMark';

interface SplitAuthLayoutProps {
  children: ReactNode;
}

/**
 * Form side stays plain (no grid/glow — that pattern is exclusive to the
 * AuthShowcase mockup side) so it reads as a clean, focused form; the split
 * into two columns only happens at `2xl` (1536px) — the reused hero mockup's
 * three fixed-width cards + connectors need ~594px minimum, which a half
 * column doesn't clear until this breakpoint, so showing it any earlier
 * would clip it.
 */
export default function SplitAuthLayout({ children }: SplitAuthLayoutProps) {
  return (
    <div className="grid min-h-svh xl:grid-cols-2">
      <div className="flex flex-col gap-4 overflow-y-auto px-6 py-8 md:px-10">
        <div className="flex items-center justify-between gap-4">
          <a
            href={import.meta.env.VITE_MARKETING_URL}
            aria-label="Synkazo — back to home"
            className="hover:opacity-80 transition-opacity"
          >
            <SynkazoWordmark className="h-6 w-auto" tone="light" />
          </a>
          <a
            href={import.meta.env.VITE_MARKETING_URL}
            className="text-muted-foreground hover:text-foreground inline-flex w-fit items-center gap-1.5 text-sm font-medium transition-colors"
          >
            <ArrowLeft className="size-3.5" />
            Back to Home
          </a>
        </div>

        <div className="flex flex-1 items-center justify-center py-8">
          <div className="animate-fade-in-up w-full max-w-[440px]">
            {children}
          </div>
        </div>
      </div>

      <AuthShowcase />
    </div>
  );
}
