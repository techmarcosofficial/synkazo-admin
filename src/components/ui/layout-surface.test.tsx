import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';

import PageContextAlert from '@/components/shared/PageContextAlert';

import { Alert } from './alert';
import { Card } from './card';

import { useDisplayPreferencesStore } from '@/stores/useDisplayPreferencesStore';

afterEach(() => {
  cleanup();
  useDisplayPreferencesStore.setState({
    defaultView: 'table',
    layoutStyle: 'contrast',
  });
  document.documentElement.dataset.layoutStyle = 'contrast';
  localStorage.clear();
});

describe('layout style preference', () => {
  it('persists the layout style without replacing the default view', () => {
    localStorage.clear();
    useDisplayPreferencesStore.setState({
      defaultView: 'card',
      layoutStyle: 'contrast',
    });

    useDisplayPreferencesStore.getState().setLayoutStyle('shadow');

    expect(document.documentElement).toHaveAttribute(
      'data-layout-style',
      'shadow',
    );
    expect(
      JSON.parse(localStorage.getItem('sb_display_prefs') || '{}'),
    ).toEqual({
      defaultView: 'card',
      layoutStyle: 'shadow',
    });
  });

  it('marks only the outer card as a layout surface by default', () => {
    render(
      <Card data-testid="outer-card">
        <Card data-testid="inner-card">Inner metric</Card>
      </Card>,
    );

    expect(screen.getByTestId('outer-card')).toHaveAttribute(
      'data-layout-surface',
      'outer',
    );
    expect(screen.getByTestId('inner-card')).toHaveAttribute(
      'data-layout-surface',
      'inner',
    );
  });

  it('supports an explicit inner surface for standalone metric cards', () => {
    render(
      <Card surface="inner" data-testid="metric-card">
        Metric
      </Card>,
    );

    expect(screen.getByTestId('metric-card')).toHaveAttribute(
      'data-layout-surface',
      'inner',
    );
  });

  it('styles page notifications as outer without promoting nested alerts', () => {
    render(
      <>
        <PageContextAlert variant="info" title="Page status" />
        <Alert data-testid="nested-alert">Nested warning</Alert>
      </>,
    );

    expect(screen.getByRole('status')).toHaveAttribute(
      'data-layout-surface',
      'outer',
    );
    expect(screen.getByTestId('nested-alert')).toHaveAttribute(
      'data-layout-surface',
      'inner',
    );
  });
});
