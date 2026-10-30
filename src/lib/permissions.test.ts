import { describe, expect, it } from 'vitest';

import { userHasPermission } from './permissions';

describe('userHasPermission', () => {
  it('uses explicit editor grants instead of adding role defaults', () => {
    const user = {
      role: 'editor' as const,
      permissions: ['project.view', 'project.create', 'logs.view'] as const,
    };

    expect(userHasPermission(user, 'project.create')).toBe(true);
    expect(userHasPermission(user, 'job.view')).toBe(false);
    expect(userHasPermission(user, 'job.run')).toBe(false);
    expect(userHasPermission(user, 'job.edit')).toBe(false);
  });

  it('uses role defaults only when explicit grants are absent', () => {
    const user = { role: 'editor' as const, permissions: undefined };

    expect(userHasPermission(user, 'project.view')).toBe(true);
    expect(userHasPermission(user, 'job.view')).toBe(true);
    expect(userHasPermission(user, 'job.run')).toBe(true);
    expect(userHasPermission(user, 'job.edit')).toBe(false);
  });

  it('keeps organization admins unrestricted when explicit grants are empty', () => {
    const user = { role: 'org_admin' as const, permissions: [] };

    expect(userHasPermission(user, 'project.delete')).toBe(true);
    expect(userHasPermission(user, 'job.run')).toBe(true);
  });
});
