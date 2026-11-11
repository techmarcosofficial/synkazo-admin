import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';

import type { MappingRow } from './FieldMappingCanvas';
import FieldSettingsDrawer, {
  type FieldSettingsDrawerProps,
} from './FieldSettingsDrawer';

// Radix Select needs these browser APIs, which jsdom doesn't have.
beforeAll(() => {
  Element.prototype.hasPointerCapture ??= () => false;
  Element.prototype.releasePointerCapture ??= () => {};
  Element.prototype.scrollIntoView ??= () => {};
});

afterEach(cleanup);

const mapping: MappingRow = {
  sourceField: 'email_address',
  destField: 'email',
  destRules: { email: [{ type: 'trim', enabled: true }] },
  destOnEmpty: { email: 'none' },
  destUpdatePolicy: { email: 'always' },
};

function renderDrawer(props: Partial<FieldSettingsDrawerProps> = {}) {
  const onSave = vi.fn();
  const onOpenChange = vi.fn();
  render(
    <FieldSettingsDrawer
      open
      onOpenChange={onOpenChange}
      mapping={mapping}
      destKey="email"
      sourceFieldDef={{ key: 'email_address', label: 'Email', type: 'string' }}
      destFieldDef={{ key: 'email', label: 'Email', type: 'string' }}
      onSave={onSave}
      {...props}
    />,
  );
  return { onSave, onOpenChange };
}

const save = () =>
  fireEvent.click(screen.getByRole('button', { name: /Save settings/ }));
const openTab = (name: RegExp) =>
  userEvent.click(screen.getByRole('tab', { name }));
async function choose(label: string, option: string) {
  await userEvent.click(screen.getByRole('combobox', { name: label }));
  await userEvent.click(await screen.findByRole('option', { name: option }));
}

describe('FieldSettingsDrawer', () => {
  it('shows the three tabs and opens on Record Matching', () => {
    renderDrawer();

    expect(
      screen.getByRole('tab', { name: /Record Matching/ }),
    ).toHaveAttribute('aria-selected', 'true');
    expect(
      screen.getByRole('tab', { name: /Data Cleaning & Transformation/ }),
    ).toHaveTextContent('1');
    expect(
      screen.getByRole('tab', { name: /Empty Value Policy/ }),
    ).toBeInTheDocument();
    expect(
      screen.getByText('How should records be matched?'),
    ).toBeInTheDocument();
    // The preview rail is gone.
    expect(screen.queryByText(/^Preview$/)).not.toBeInTheDocument();
  });

  it.each([
    ['transforms', 'Data cleaning rules'],
    ['skips', 'Data cleaning rules'],
    ['fallbacks', 'What happens when the value is empty?'],
    ['identity', 'How should records be matched?'],
  ] as const)(
    'opens the tab for targetSection=%s',
    (targetSection, heading) => {
      renderDrawer({ targetSection });
      expect(screen.getByText(heading)).toBeInTheDocument();
    },
  );

  it('saves the match key and update policy', async () => {
    const { onSave, onOpenChange } = renderDrawer();

    fireEvent.click(screen.getByRole('switch', { name: 'Use as match key' }));
    expect(screen.getByText('Primary key')).toBeInTheDocument();
    await choose('When a match is found', 'Only set when creating');
    save();

    expect(onSave).toHaveBeenCalledWith(
      expect.objectContaining({
        sourceKey: 'email_address',
        destKey: 'email',
        isMatch: true,
        updatePolicy: 'create_only',
      }),
    );
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it('turns quick settings into rules that show in Applied rules', async () => {
    const { onSave } = renderDrawer();
    await openTab(/Data Cleaning/);

    expect(
      screen.getByRole('switch', { name: 'Trim whitespace' }),
    ).toBeChecked();
    await choose('Text case', 'UPPERCASE');
    fireEvent.change(screen.getByLabelText('Maximum text length'), {
      target: { value: '80' },
    });
    expect(screen.getByText('Applied rules')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('switch', { name: 'Trim whitespace' }));
    save();

    expect(onSave.mock.calls[0][0].rules).toEqual([
      { type: 'uppercase', enabled: true },
      { type: 'char_limit', enabled: true, value: '80' },
    ]);
  });

  it('hides quick settings for non-text fields', async () => {
    renderDrawer({
      destFieldDef: { key: 'email', label: 'Amount', type: 'number' },
    });
    await openTab(/Data Cleaning/);

    expect(screen.queryByText('Trim whitespace')).not.toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /Add transformation rule/ }),
    ).toBeInTheDocument();
  });

  it('asks for an upgrade instead of adding a rule without transforms', async () => {
    const promptUpgrade = vi.fn();
    const { onSave } = renderDrawer({
      canUseTransforms: false,
      promptUpgrade,
      mapping: { ...mapping, destRules: {} },
    });
    await openTab(/Data Cleaning/);

    fireEvent.click(screen.getByRole('switch', { name: 'Trim whitespace' }));
    expect(promptUpgrade).toHaveBeenCalled();
    save();
    expect(onSave.mock.calls[0][0].rules).toEqual([]);
  });

  it('blocks saving an incomplete rule and shows it on Data Cleaning', async () => {
    const { onSave } = renderDrawer({
      mapping: {
        ...mapping,
        destRules: { email: [{ type: 'prefix', enabled: true }] },
      },
    });

    save();

    expect(onSave).not.toHaveBeenCalled();
    expect(screen.getByText(/in 1 rule before saving/)).toBeInTheDocument();
    expect(screen.getByText('Value is required.')).toBeInTheDocument();
    expect(screen.getByText('Data cleaning rules')).toBeInTheDocument();
  });

  it('saves the empty-value policy with its default', async () => {
    const { onSave } = renderDrawer();
    await openTab(/Empty Value Policy/);

    expect(screen.queryByLabelText('Default value')).not.toBeInTheDocument();
    await choose('Empty source value', 'Use a default value');
    fireEvent.change(screen.getByLabelText('Default value'), {
      target: { value: 'n/a' },
    });
    save();

    expect(onSave).toHaveBeenCalledWith(
      expect.objectContaining({ onEmpty: 'default', defaultValue: 'n/a' }),
    );
  });

  it('shows and saves the reverse direction on two-way flows', async () => {
    const { onSave } = renderDrawer({ isTwoWay: true });
    await openTab(/Empty Value Policy/);

    expect(screen.getByText('Reverse direction')).toBeInTheDocument();
    const [, reverse] = screen.getAllByRole('combobox', {
      name: 'Empty source value',
    });
    await userEvent.click(reverse);
    await userEvent.click(
      await screen.findByRole('option', { name: 'Skip the record' }),
    );
    save();

    expect(onSave).toHaveBeenCalledWith(
      expect.objectContaining({
        onEmpty: 'none',
        reverseOnEmpty: 'skip_record',
      }),
    );
  });

  it('closes without saving on Cancel', () => {
    const { onSave, onOpenChange } = renderDrawer();
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(onSave).not.toHaveBeenCalled();
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });
});

describe('FieldSettingsDrawer quick presets', () => {
  it('shows the preset chips on Data Cleaning and adds a rule from one', async () => {
    const { onSave } = renderDrawer({
      mapping: { ...mapping, destRules: {} },
    });
    await openTab(/Data Cleaning/);

    expect(screen.getByText('Quick presets')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /Remove All Spaces/ }));
    save();

    expect(onSave.mock.calls[0][0].rules).toEqual([
      expect.objectContaining({ type: 'remove_spaces' }),
    ]);
  });
});
