import {
  AlertTriangle,
  Building2,
  ClipboardList,
  FolderOpen,
  Gauge,
  Megaphone,
  Percent,
  Settings2,
  Tag,
  Users,
} from 'lucide-react';

import type { NavGroup } from '@/components/layout/nav-main';

// Single source of truth for the Super Admin workspace navigation. Sidebar,
// breadcrumbs, page titles, and route protection all read from this. Adding a
// new area is one edit here — never spread across sidebar + header + route file.
//
// Super Admin is a single-role surface. Every entry uses `minRole: 'super_admin'`
// so the shared NavMain filter still runs cleanly; the actual gate is the
// ExactRoleGuard wrapping the /super-admin route tree.
export const SUPER_ADMIN_NAV: NavGroup[] = [
  {
    label: 'Platform',
    items: [
      {
        title: 'Overview',
        url: '/super-admin/overview',
        icon: Gauge,
        minRole: 'super_admin',
      },
      {
        title: 'Organisations',
        url: '/super-admin/organisations',
        icon: Building2,
        minRole: 'super_admin',
      },
      {
        title: 'Users',
        url: '/super-admin/users',
        icon: Users,
        minRole: 'super_admin',
      },
      {
        title: 'Projects',
        url: '/super-admin/projects',
        icon: FolderOpen,
        minRole: 'super_admin',
      },
    ],
  },
  {
    label: 'Billing',
    items: [
      {
        title: 'Plans',
        url: '/super-admin/plans',
        icon: Tag,
        minRole: 'super_admin',
      },
      {
        title: 'Discounts',
        url: '/super-admin/discounts',
        icon: Percent,
        minRole: 'super_admin',
      },
      {
        title: 'Failed payments',
        url: '/super-admin/failed-payments',
        icon: AlertTriangle,
        minRole: 'super_admin',
      },
    ],
  },
  {
    label: 'Configuration',
    items: [
      {
        title: 'Marketing',
        url: '/super-admin/marketing',
        icon: Megaphone,
        minRole: 'super_admin',
      },
      {
        title: 'System',
        url: '/super-admin/system',
        icon: Settings2,
        minRole: 'super_admin',
      },
      {
        title: 'Audit log',
        url: '/super-admin/audit-log',
        icon: ClipboardList,
        minRole: 'super_admin',
      },
    ],
  },
];

export function findSuperAdminNavItem(pathname: string) {
  for (const group of SUPER_ADMIN_NAV) {
    for (const item of group.items) {
      if (pathname === item.url || pathname.startsWith(item.url + '/')) {
        return { group, item };
      }
    }
  }
  return null;
}
