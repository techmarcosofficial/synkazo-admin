import { Lock, LockOpen } from 'lucide-react';
import { useEffect, useState } from 'react';

import ErrorState from '@/components/shared/ErrorState';
import SkeletonList from '@/components/shared/skeletons/SkeletonList';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Spinner } from '@/components/ui/spinner';
import { showToast } from '@/lib/toast';
import {
  useAuthPagesSettingsQuery,
  useEnableAuthPageMutation,
  useDisableAuthPageMutation,
} from '@/queries/useAuthPagesSettings';

// Super-admin "Manage Auth Pages" — enable/disable login and registration pages.
export default function ManageAuthPagesCard() {
  const query = useAuthPagesSettingsQuery();
  const enableMutation = useEnableAuthPageMutation();
  const disableMutation = useDisableAuthPageMutation();

  // The switch state is intentionally the disabled state:
  // unchecked = enabled, checked = disabled.
  const [pageDisabled, setPageDisabled] = useState<Record<string, boolean>>({
    login: false,
    register: false,
  });
  const [pending, setPending] = useState<string | null>(null);

  // Initialize with data from server
  useEffect(() => {
    if (!query.data) return;
    setPageDisabled({
      login: !query.data.login,
      register: !query.data.register,
    });
  }, [query.data]);

  const togglePage = async (page: 'login' | 'register', isDisabled: boolean) => {
    setPending(page);
    try {
      // Optimistically update UI
      setPageDisabled((prev) => ({ ...prev, [page]: isDisabled }));

      if (isDisabled) {
        await disableMutation.mutateAsync(page);
        showToast.success(`${page} page disabled.`);
      } else {
        await enableMutation.mutateAsync(page);
        showToast.success(`${page} page enabled.`);
      }
    } catch (err) {
      // Revert on error
      setPageDisabled((prev) => ({ ...prev, [page]: !isDisabled }));
      showToast.error(`Failed to update ${page} page. Please try again.`);
    } finally {
      setPending(null);
    }
  };

  const pages: {
    id: 'login' | 'register';
    label: string;
    description: string;
  }[] = [
    {
      id: 'login',
      label: 'Login Page',
      description: 'Users can sign in to their accounts',
    },
    {
      id: 'register',
      label: 'Registration Page',
      description: 'New users can create accounts and sign up',
    },
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 font-semibold">
          <Lock className="size-4" />
          Manage Auth Pages
        </CardTitle>
        <p className="text-muted-foreground text-sm">
          Enable or disable authentication pages. When disabled, users cannot access
          these pages and attempts to visit will redirect to login.
          <br />
          <span className="text-xs">Toggle OFF = Enabled | Toggle ON = Disabled</span>
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        {query.isLoading ? (
          <SkeletonList count={2} />
        ) : query.isError ? (
          <ErrorState onRetry={() => query.refetch()} />
        ) : (
          <div className="space-y-3">
            {pages.map((page) => {
              const isDisabled = pageDisabled[page.id] ?? false;
              const isEnabled = !isDisabled;
              const busy = pending === page.id;

              return (
                <div
                  key={page.id}
                  className="bg-card flex items-center justify-between gap-4 rounded-4xl border p-4"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className="font-medium text-sm">{page.label}</h3>
                      <Badge
                        className={
                          isEnabled
                            ? 'bg-success/10 text-success gap-1.5'
                            : 'bg-warning/10 text-warning gap-1.5'
                        }
                      >
                        {isEnabled ? (
                          <>
                            <LockOpen className="size-3" /> Enabled
                          </>
                        ) : (
                          <>
                            <Lock className="size-3" /> Disabled
                          </>
                        )}
                      </Badge>
                    </div>
                    <p className="text-muted-foreground text-xs mt-1">
                      {page.description}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {busy && <Spinner className="size-4" />}
                    <Switch
                      checked={isDisabled}
                      onCheckedChange={(value) => togglePage(page.id, value)}
                      disabled={busy}
                      aria-label={`Toggle ${page.label}`}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
