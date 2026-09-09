import { ArrowLeft } from 'lucide-react';
import { type ReactNode } from 'react';

import AuthShowcase from './AuthShowcase';
import BrandMark from './BrandMark';

import './auth-login.css';

interface SplitAuthLayoutProps {
  children: ReactNode;
  variant?: 'default' | 'immersive';
}

/**
 * The immersive layout is shared by the primary sign-in, registration, and
 * account-recovery flows. Secondary auth routes retain the compact layout.
 */
export default function SplitAuthLayout({
  children,
  variant = 'default',
}: SplitAuthLayoutProps) {
  if (variant === 'immersive') {
    return (
      <main className="synkazo-login-page">
        <section className="synkazo-login-form-panel">
          <header className="synkazo-login-form-header">
            <BrandMark inverse className="synkazo-login-brand" />
            <div className="synkazo-login-mobile-actions">
              <a
                href={import.meta.env.VITE_FRONTEND_URL}
                className="synkazo-login-mobile-back"
              >
                <ArrowLeft />
                Back to Home
              </a>
            </div>
          </header>

          <div className="synkazo-login-form-scroll">
            <div className="synkazo-login-form-content">{children}</div>
          </div>
        </section>

        <AuthShowcase />
      </main>
    );
  }

  return (
    <div className="grid min-h-svh xl:grid-cols-2">
      <div className="flex flex-col gap-4 overflow-y-auto px-6 py-8 md:px-10">
        <a
          href={import.meta.env.VITE_FRONTEND_URL}
          className="text-muted-foreground hover:text-foreground inline-flex w-fit items-center gap-1.5 text-sm font-medium transition-colors"
        >
          <ArrowLeft className="size-3.5" />
          Back to Home
        </a>

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
