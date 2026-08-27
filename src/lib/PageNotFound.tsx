import { Home } from 'lucide-react';
import { useLocation } from 'react-router-dom';

import { Button } from '@/components/ui/button';
import { useSynkazoAuth } from '@/lib/synkazoAuth';

export default function PageNotFound() {
  const location = useLocation();
  const pageName = location.pathname.substring(1);
  const { currentUser } = useSynkazoAuth();
  const isAdmin =
    currentUser?.role === 'super_admin' || currentUser?.role === 'org_admin';

  return (
    <div className="bg-background flex min-h-screen items-center justify-center p-6">
      <div className="w-full max-w-md">
        <div className="space-y-6 text-center">
          <div className="space-y-2">
            <h1 className="text-muted-foreground/40 text-7xl font-light">
              404
            </h1>
            <div className="bg-border mx-auto h-0.5 w-16"></div>
          </div>
          <div className="space-y-3">
            <h2 className="text-foreground text-2xl font-medium tracking-tight">
              Page Not Found
            </h2>
            <p className="text-muted-foreground leading-relaxed">
              The page{' '}
              <span className="text-foreground font-medium">"{pageName}"</span>{' '}
              could not be found.
            </p>
          </div>
          {isAdmin && (
            <div className="bg-muted ring-border mt-8 rounded-lg p-4 ring-1">
              <div className="flex items-start space-x-3">
                <div className="bg-warning/10 mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full">
                  <div className="bg-warning h-2 w-2 rounded-full"></div>
                </div>
                <div className="space-y-1 text-left">
                  <p className="text-foreground text-sm font-medium">
                    Admin Note
                  </p>
                  <p className="text-muted-foreground text-sm leading-relaxed">
                    This page may not be implemented yet.
                  </p>
                </div>
              </div>
            </div>
          )}
          <div className="pt-6">
            <Button
              variant="outline"
              onClick={() => {
                window.location.href = '/';
              }}
            >
              <Home className="mr-2 h-4 w-4" />
              Go Home
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
