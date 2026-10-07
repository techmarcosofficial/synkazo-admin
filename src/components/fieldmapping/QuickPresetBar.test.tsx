import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import QuickPresetBar from './QuickPresetBar';

describe('QuickPresetBar', () => {
  afterEach(cleanup);

  it('renders quick preset buttons', () => {
    render(
      <QuickPresetBar
        rules={[]}
        onRulesChange={vi.fn()}
      />,
    );

    expect(screen.getByText(/Quick Presets/i)).toBeInTheDocument();
    expect(screen.getByText('Trim Spaces')).toBeInTheDocument();
    expect(screen.getByText('Title Case')).toBeInTheDocument();
    expect(screen.getByText('UPPERCASE')).toBeInTheDocument();
    expect(screen.getByText('lowercase')).toBeInTheDocument();
    expect(screen.getByText('Standard Phone')).toBeInTheDocument();
  });

  it('adds a rule when an inactive preset is clicked', () => {
    const handleRulesChange = vi.fn();
    render(
      <QuickPresetBar
        rules={[]}
        onRulesChange={handleRulesChange}
      />,
    );

    fireEvent.click(screen.getByText('Trim Spaces'));
    expect(handleRulesChange).toHaveBeenCalledWith([
      { type: 'trim', enabled: true },
    ]);
  });

  it('removes a rule when an active preset is clicked', () => {
    const handleRulesChange = vi.fn();
    render(
      <QuickPresetBar
        rules={[{ type: 'trim', enabled: true }]}
        onRulesChange={handleRulesChange}
      />,
    );

    fireEvent.click(screen.getByText('Trim Spaces'));
    expect(handleRulesChange).toHaveBeenCalledWith([]);
  });

  it('handles exclusive rules when switching case formatting', () => {
    const handleRulesChange = vi.fn();
    render(
      <QuickPresetBar
        rules={[{ type: 'lowercase', enabled: true }]}
        onRulesChange={handleRulesChange}
      />,
    );

    fireEvent.click(screen.getByText('UPPERCASE'));
    // lowercase should be removed, uppercase added
    expect(handleRulesChange).toHaveBeenCalledWith([
      { type: 'uppercase', enabled: true },
    ]);
  });
});
