import { Link } from 'react-router-dom';

import { SUPER_ADMIN_NAV } from '@/lib/superAdminNav';

// Placeholder for the Phase 3 platform overview. Keeps /super-admin/overview
// deep-linkable so the shell has a real index destination while the Phase 3
// metrics build lands separately.
export default function OverviewPage() {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold">Platform overview</h1>
        <p className="text-muted-foreground text-sm">
          Health metrics, running work, and recent platform events land here in
          Phase 3. Use the sidebar to reach any specific area for now.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {SUPER_ADMIN_NAV.flatMap((group) =>
          group.items
            .filter((item) => item.url !== '/super-admin/overview')
            .map((item) => (
              <Link
                key={item.url}
                to={item.url}
                className="bg-card hover:border-primary rounded-lg border p-4 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <item.icon className="text-muted-foreground size-5" />
                  <div>
                    <div className="font-medium">{item.title}</div>
                    <div className="text-muted-foreground text-xs">
                      {group.label}
                    </div>
                  </div>
                </div>
              </Link>
            )),
        )}
      </div>
    </div>
  );
}
