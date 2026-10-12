import type { User } from '@/types';

export type WorkspaceKind = 'tenant' | 'platform';

export const PLATFORM_HOME = '/super-admin/overview';
export const TENANT_HOME = '/dashboard';

export function workspaceForUser(user: Pick<User, 'role'>): WorkspaceKind {
  return user.role === 'super_admin' ? 'platform' : 'tenant';
}

export function homeForUser(user: Pick<User, 'role'>): string {
  return workspaceForUser(user) === 'platform' ? PLATFORM_HOME : TENANT_HOME;
}

export function postLoginPath(
  user: Pick<User, 'role'>,
  requested?: string | null,
): string {
  const home = homeForUser(user);
  if (
    !requested ||
    !requested.startsWith('/') ||
    requested.startsWith('//') ||
    requested.includes('\\')
  ) {
    return home;
  }

  const pathname = requested.split(/[?#]/, 1)[0];
  const isPlatformPath =
    pathname === '/super-admin' || pathname.startsWith('/super-admin/');
  if (workspaceForUser(user) === 'platform') {
    return isPlatformPath ? requested : home;
  }
  return isPlatformPath ? home : requested;
}
