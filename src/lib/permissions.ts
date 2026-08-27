import type { UserRole, Permission } from '@/types';

export const ROLE_HIERARCHY: UserRole[] = [
  'editor',
  'org_admin',
  'super_admin',
];

export const ALL_PERMISSIONS: Permission[] = [
  'project.view',
  'project.create',
  'project.edit',
  'project.delete',
  'job.view',
  'job.create',
  'job.edit',
  'job.delete',
  'job.run',
  'connection.view',
  'connection.manage',
  'user.view',
  'user.invite',
  'user.manage',
  'user.remove',
  'logs.view',
];

export const ROLE_DEFAULTS: Record<UserRole, Permission[]> = {
  super_admin: ALL_PERMISSIONS,
  org_admin: [
    'project.view',
    'project.create',
    'project.edit',
    'project.delete',
    'job.view',
    'job.create',
    'job.edit',
    'job.delete',
    'job.run',
    'connection.view',
    'connection.manage',
    'user.view',
    'user.invite',
    'user.manage',
    'user.remove',
    'logs.view',
  ],
  editor: ['project.view', 'job.view', 'job.run', 'logs.view'],
};

export const PERMISSION_LABELS: Record<Permission, string> = {
  'project.view': 'View Projects',
  'project.create': 'Create Projects',
  'project.edit': 'Edit Projects',
  'project.delete': 'Delete Projects',
  'job.view': 'View Jobs',
  'job.create': 'Create Jobs',
  'job.edit': 'Edit Jobs',
  'job.delete': 'Delete Jobs',
  'job.run': 'Run Jobs',
  'connection.view': 'View Connections',
  'connection.manage': 'Manage Connections',
  'user.view': 'View Team',
  'user.invite': 'Invite Users',
  'user.manage': 'Manage Users',
  'user.remove': 'Remove Users',
  'logs.view': 'View Logs',
};

export const PERMISSION_GROUPS: Array<{ label: string; perms: Permission[] }> =
  [
    {
      label: 'Projects',
      perms: [
        'project.view',
        'project.create',
        'project.edit',
        'project.delete',
      ],
    },
    {
      label: 'Jobs',
      perms: ['job.view', 'job.create', 'job.edit', 'job.delete', 'job.run'],
    },
    { label: 'Connections', perms: ['connection.view', 'connection.manage'] },
    {
      label: 'Team',
      perms: ['user.view', 'user.invite', 'user.manage', 'user.remove'],
    },
    { label: 'Logs', perms: ['logs.view'] },
  ];

export function getPermissionsForRole(role: UserRole): Permission[] {
  return ROLE_DEFAULTS[role] ?? ROLE_DEFAULTS['editor'];
}

export function roleIndex(role: UserRole): number {
  return ROLE_HIERARCHY.indexOf(role);
}

export function roleLabel(role: UserRole): string {
  const labels: Record<UserRole, string> = {
    super_admin: 'Super Admin',
    org_admin: 'Org Admin',
    editor: 'Editor',
  };
  return labels[role] ?? role;
}
