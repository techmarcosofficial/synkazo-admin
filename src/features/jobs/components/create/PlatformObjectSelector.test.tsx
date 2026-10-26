import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { TooltipProvider } from '@/components/ui/tooltip';
import { PlatformObjectSelectorView } from './PlatformObjectSelector';

describe('PlatformObjectSelector', () => {
  afterEach(cleanup);

  const defaultProps = {
    label: 'Destination',
    platformId: 'hubspot',
    platformLabel: 'HubSpot',
    objects: [
      { id: 'contacts', label: 'Contacts' },
      { id: 'companies', label: 'Companies' },
    ],
    object: '',
    onObjectChange: vi.fn(),
    policy: {
      objectTierAllowed: () => true,
      planAllowsCustomObjects: true,
    },
  };

  it('renders custom objects warning as an info button with tooltip instead of inline text under input', () => {
    const warningText =
      'Existing custom objects may not appear — this HubSpot connection is missing schema read access. Reconnect it to refresh permissions.';

    const { container } = render(
      <TooltipProvider>
        <PlatformObjectSelectorView
          {...defaultProps}
          customObjectsWarning={warningText}
        />
      </TooltipProvider>,
    );

    // Should have the info icon button in the header
    const infoBtn = screen.getByRole('button', {
      name: /Custom objects note for HubSpot/i,
    });
    expect(infoBtn).toBeInTheDocument();

    // The select field area should NOT have the raw warning paragraph bloating the vertical layout
    const fieldArea = container.querySelector('[data-slot="field"]:nth-of-type(2)');
    expect(fieldArea).not.toHaveTextContent(warningText);
  });

  it('renders validation error message when error prop is passed', () => {
    render(
      <TooltipProvider>
        <PlatformObjectSelectorView
          {...defaultProps}
          error="Destination object is required"
        />
      </TooltipProvider>,
    );

    expect(screen.getByText('Destination object is required')).toBeInTheDocument();
  });
});
