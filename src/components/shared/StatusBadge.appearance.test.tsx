import {
  cleanup,
  fireEvent,
  render,
  screen,
  within,
} from '@testing-library/react';
import { createPortal } from 'react-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';

import StatusBadge from './StatusBadge';
import SubscriptionPlanCard from '@/components/billing/SubscriptionPlanCard';
import { Badge, BadgeAppearanceProvider } from '@/components/ui/badge';

afterEach(cleanup);

describe('Super Admin badge appearance', () => {
  it.each([
    ['active', 'success'],
    ['trialing', 'warning'],
    ['past_due', 'danger'],
    [null, 'muted'],
  ] as const)(
    'keeps one correctly coloured dot on the dark billing card for %s',
    (status, tone) => {
      const { container } = render(
        <BadgeAppearanceProvider>
          <SubscriptionPlanCard planName="Pro" status={status} />
        </BadgeAppearanceProvider>,
      );
      const badge = container.querySelector('[data-slot="badge"]');
      expect(badge).toHaveAttribute('data-tone', tone);
      expect(badge).toHaveClass('border-0', 'text-foreground');
      expect(badge?.querySelectorAll('[data-slot="badge-dot"]')).toHaveLength(
        1,
      );
      expect(badge?.closest('.dark')).not.toBeNull();
    },
  );

  it.each([
    ['active', 'success', 'success'],
    ['pending', 'warning', 'warning'],
    ['info', 'info', 'info'],
    ['paused', 'paused', 'paused'],
    ['ERROR', 'danger', 'destructive'],
    ['past_due', 'danger', 'destructive'],
    ['paid', 'success', 'success'],
    ['succeeded', 'success', 'success'],
    ['warning', 'warning', 'warning'],
    ['unknown-status', 'muted', 'muted-foreground'],
  ])(
    'matches the dot and translucent background for %s',
    (status, tone, color) => {
      const { container } = render(
        <BadgeAppearanceProvider>
          <StatusBadge status={status} label="Status label" />
        </BadgeAppearanceProvider>,
      );
      const badge = screen.getByText('Status label');
      expect(badge).toHaveAttribute('data-tone', tone);
      expect(badge).toHaveClass(
        `bg-${color}/10`,
        'border-0',
        'text-foreground',
      );
      expect(badge).not.toHaveClass(`text-${color}`);
      expect(badge).not.toHaveClass('border');
      const dots = container.querySelectorAll('[data-slot="badge-dot"]');
      expect(dots).toHaveLength(1);
      expect(dots[0]).toHaveClass(`bg-${color}`);
      expect(dots[0]).toHaveAttribute('aria-hidden', 'true');
    },
  );

  it('uses neutral dots for metadata badges and removes legacy outline/background classes', () => {
    render(
      <BadgeAppearanceProvider>
        <Badge variant="outline" className="border-red-500 bg-red-100">
          Owner
        </Badge>
      </BadgeAppearanceProvider>,
    );
    const badge = screen.getByText('Owner');
    expect(badge).toHaveClass('border-0', 'bg-muted-foreground/10');
    expect(badge).not.toHaveClass('border', 'bg-red-100');
    expect(badge.querySelectorAll('[data-slot="badge-dot"]')).toHaveLength(1);
  });

  it('retains the appearance in portalled drawers', () => {
    render(
      <BadgeAppearanceProvider>
        {createPortal(
          <StatusBadge status="failed" label="Drawer failure" />,
          document.body,
        )}
      </BadgeAppearanceProvider>,
    );
    expect(screen.getByText('Drawer failure')).toHaveClass(
      'bg-destructive/10',
      'border-0',
    );
  });

  it('preserves fix actions and link semantics with exactly one dot', () => {
    const fix = vi.fn();
    render(
      <BadgeAppearanceProvider>
        <StatusBadge status="error" action={{ label: 'Fix', onClick: fix }} />
        <Badge asChild tone="info">
          <a href="/super-admin/organisations">Organisations</a>
        </Badge>
      </BadgeAppearanceProvider>,
    );
    const action = screen.getByRole('button', { name: /error.*fix/i });
    fireEvent.click(action);
    expect(fix).toHaveBeenCalledOnce();
    expect(action).toHaveClass('bg-destructive/10', 'border-0');
    expect(action.querySelectorAll('[data-slot="badge-dot"]')).toHaveLength(1);
    const link = screen.getByRole('link', { name: 'Organisations' });
    expect(link).toHaveAttribute('href', '/super-admin/organisations');
    expect(link.querySelectorAll('[data-slot="badge-dot"]')).toHaveLength(1);
  });

  it('keeps tenant badges unchanged alongside the tinted platform badges', () => {
    render(
      <>
        <div data-testid="tenant">
          <StatusBadge status="active" />
          <Badge variant="outline">Owner</Badge>
        </div>
        <BadgeAppearanceProvider>
          <div data-testid="platform">
            <StatusBadge status="active" />
          </div>
        </BadgeAppearanceProvider>
      </>,
    );
    const tenant = within(screen.getByTestId('tenant'));
    expect(tenant.getByText('Active')).toHaveClass(
      'bg-muted',
      'text-muted-foreground',
    );
    expect(tenant.getByText('Owner')).toHaveClass('border', 'border-border');
    expect(
      screen.getByTestId('tenant').querySelectorAll('[data-slot="badge-dot"]'),
    ).toHaveLength(1);
    expect(
      within(screen.getByTestId('platform')).getByText('Active'),
    ).toHaveClass('bg-success/10');
  });
});
