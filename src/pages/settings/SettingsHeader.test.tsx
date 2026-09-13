import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import SettingsHeader from './SettingsHeader';

vi.mock('@/lib/synkazoAuth', () => ({
  useSynkazoAuth: () => ({
    currentUser: {
      email: 'rhea@example.com',
      fullName: 'Rhea Shah',
      role: 'org_admin',
      status: 'active',
    },
  }),
}));

vi.mock('@/queries/useOrganisations', () => ({
  useMyOrgQuery: () => ({ data: { name: 'Synkazo Labs' } }),
}));

afterEach(() => cleanup());

describe('SettingsHeader', () => {
  it('keeps user identity and account context in the detail-style header', () => {
    render(<SettingsHeader />);

    expect(
      screen.getByRole('heading', { name: 'Settings' }),
    ).toBeInTheDocument();
    expect(screen.getByText('RS')).toBeInTheDocument();
    expect(screen.getByText('Rhea Shah')).toBeInTheDocument();
    expect(screen.getByText('rhea@example.com')).toBeInTheDocument();
    expect(screen.getByText('Org Admin')).toBeInTheDocument();
    expect(screen.getByText('Synkazo Labs')).toBeInTheDocument();
    expect(screen.getByText('Active')).toBeInTheDocument();
  });
});
