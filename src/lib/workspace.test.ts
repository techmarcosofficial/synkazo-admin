import { describe, expect, it } from 'vitest';

import { homeForUser, postLoginPath, workspaceForUser } from './workspace';

const operator = { role: 'super_admin' as const };
const tenant = { role: 'org_admin' as const };

describe('workspace routing', () => {
  it('routes a platform operator to the platform home with no organisation', () => {
    expect(workspaceForUser(operator)).toBe('platform');
    expect(homeForUser(operator)).toBe('/super-admin/overview');
  });

  it('ignores tenant destinations for platform operators', () => {
    expect(postLoginPath(operator, '/dashboard')).toBe('/super-admin/overview');
    expect(postLoginPath(operator, '/checkout?plan=paid')).toBe(
      '/super-admin/overview',
    );
    expect(postLoginPath(operator, '/super-admin/system')).toBe(
      '/super-admin/system',
    );
  });

  it('keeps tenant users away from platform destinations', () => {
    expect(postLoginPath(tenant, '/super-admin/overview')).toBe('/dashboard');
    expect(postLoginPath(tenant, '/checkout?plan=paid')).toBe(
      '/checkout?plan=paid',
    );
  });

  it('rejects protocol-relative and backslash redirects', () => {
    expect(postLoginPath(operator, '//evil.example')).toBe(
      '/super-admin/overview',
    );
    expect(postLoginPath(tenant, '/\\evil.example')).toBe('/dashboard');
  });
});
