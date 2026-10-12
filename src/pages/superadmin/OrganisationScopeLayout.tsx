import { Building2, ChevronRight } from 'lucide-react';
import { Link, NavLink, Outlet, useParams } from 'react-router-dom';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useSuperAdminOrganisationQuery } from '@/queries/useSuperAdmin';
import { cn } from '@/lib/utils';

const SECTIONS = [
  { label: 'Overview', path: 'overview' },
  { label: 'Members', path: 'members' },
  { label: 'Projects', path: 'projects' },
  { label: 'Billing', path: 'billing' },
  { label: 'Activity', path: 'activity' },
  { label: 'Support', path: 'support' },
] as const;

/** Persistent target context for platform operations scoped to one organisation. */
export default function OrganisationScopeLayout() {
  const { organisationId } = useParams<{ organisationId: string }>();
  const organisation = useSuperAdminOrganisationQuery(organisationId);

  if (!organisationId) return null;

  return (
    <div className="flex flex-col gap-6">
      <section
        className="bg-card rounded-3xl border"
        aria-label="Selected organisation"
      >
        <div className="flex flex-wrap items-start justify-between gap-3 px-4 py-3 sm:px-5">
          <div className="min-w-0">
            <div className="text-muted-foreground flex items-center gap-1.5 text-xs">
              <Link
                className="hover:text-foreground"
                to="/super-admin/organisations"
              >
                Organisations
              </Link>
              <ChevronRight className="size-3" aria-hidden />
              <span>Selected organisation</span>
            </div>
            <div className="mt-1 flex flex-wrap items-center gap-2">
              <Building2 className="text-muted-foreground size-4" aria-hidden />
              <strong className="truncate text-sm">
                {organisation.data?.name ?? organisationId}
              </strong>
              {organisation.data && (
                <Badge variant="secondary">{organisation.data.status}</Badge>
              )}
              {organisation.isLoading && (
                <span className="text-muted-foreground text-xs">
                  Loading details…
                </span>
              )}
              {organisation.isError && (
                <span className="text-destructive text-xs">
                  Details unavailable
                </span>
              )}
            </div>
          </div>
          {organisation.isError && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => organisation.refetch()}
            >
              Retry
            </Button>
          )}
        </div>
        <nav className="border-t px-2" aria-label="Organisation sections">
          <div className="flex gap-1 overflow-x-auto">
            {SECTIONS.map((section) => (
              <NavLink
                key={section.path}
                to={`/super-admin/organisations/${organisationId}/${section.path}`}
                className={({ isActive }) =>
                  cn(
                    'text-muted-foreground hover:text-foreground min-h-10 shrink-0 border-b-2 border-transparent px-3 py-2.5 text-sm font-medium',
                    isActive && 'border-primary text-foreground',
                  )
                }
              >
                {section.label}
              </NavLink>
            ))}
          </div>
        </nav>
      </section>
      <Outlet />
    </div>
  );
}
