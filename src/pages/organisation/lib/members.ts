import { roleLabel } from '@/lib/permissions';
import type { User, UserRole } from '@/types';

export type MemberSortKey = 'name' | 'role' | 'joined';

/**
 * Guards against a legacy `admin` value on list data. The backend enum only
 * emits editor | org_admin | super_admin, so this is belt-and-braces for rows
 * that predate the rename.
 */
export function normalizeRole(role: unknown): UserRole {
  return (role as string) === 'admin'
    ? 'super_admin'
    : (role as UserRole) || 'editor';
}

export function compareMembers(a: User, b: User, key: MemberSortKey) {
  switch (key) {
    case 'name':
      return (a.fullName || a.email || '').localeCompare(
        b.fullName || b.email || '',
      );
    case 'role':
      return roleLabel(normalizeRole(a.role)).localeCompare(
        roleLabel(normalizeRole(b.role)),
      );
    case 'joined':
      return (
        new Date(a.createdAt || 0).getTime() -
        new Date(b.createdAt || 0).getTime()
      );
  }
}

export function memberInitials(member: Pick<User, 'fullName' | 'email'>) {
  return member.fullName
    ? member.fullName
        .split(' ')
        .map((n) => n[0])
        .join('')
        .slice(0, 2)
        .toUpperCase()
    : member.email?.charAt(0)?.toUpperCase() || '?';
}

export function matchesMemberSearch(member: User, search: string) {
  const q = search.trim().toLowerCase();
  if (!q) return true;
  return Boolean(
    member.fullName?.toLowerCase().includes(q) ||
    member.email?.toLowerCase().includes(q),
  );
}
