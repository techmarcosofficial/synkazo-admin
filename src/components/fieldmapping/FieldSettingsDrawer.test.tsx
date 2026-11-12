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
const openSection = (name: string | RegExp) =>
  userEvent.click(
    screen.getByRole('button', { name: typeof name === 'string' ? new RegExp(`^${name}`) : name }),
  );
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
    // The field already has a rule, so Data Cleaning opens on Applied rules.
    ['transforms', 'Applied rules'],
    ['skips', 'Applied rules'],
    ['fallbacks', 'What happens when the value is empty?'],
    ['identity', 'How should records be matched?'],
  ] as const)(
    'opens the tab for targetSection=%s',
    (targetSection, heading) => {
      renderDrawer({ targetSection });
      expect(screen.getByRole('heading', { name: heading })).toBeInTheDocument();
    },
  );

  it('saves the identifier and update policy', async () => {
    const { onSave, onOpenChange } = renderDrawer();

    fireEvent.click(screen.getByRole('switch', { name: 'Use as identifier' }));
    expect(
      screen.getByText(/This field is the identifier/),
    ).toBeInTheDocument();
    await openSection('On existing records');
    expect(screen.getByRole('radio', { name: 'Always overwrite' })).toBeChecked();
    fireEvent.click(screen.getByRole('radio', { name: 'Create only' }));
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
    await openSection('Quick cleanup');

    expect(
      screen.getByRole('switch', { name: 'Trim whitespace' }),
    ).toBeChecked();
    await choose('Text case', 'UPPERCASE');
    fireEvent.change(screen.getByLabelText('Maximum text length'), {
      target: { value: '80' },
    });
    // Trim + uppercase + length limit are now three applied rules.
    expect(screen.getByRole('button', { name: /^Applied rules/ })).toHaveTextContent('3');

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

    const quick = screen.queryByRole('button', { name: /^Quick cleanup/ });
    if (quick) await userEvent.click(quick);
    expect(screen.queryByText('Trim whitespace')).not.toBeInTheDocument();
  });

  it('lists every rule in a category and adds one from it', async () => {
    const { onSave } = renderDrawer();
    await openTab(/Data Cleaning/);
    await openSection('Text');

    expect(screen.getByRole('heading', { name: 'Text rules' })).toBeInTheDocument();
    // Trim is already applied, so it can't be added twice.
    expect(screen.queryByRole('button', { name: 'Add Trim Spaces' })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Add Uppercase' }));
    // No input needed: stays on the category, now marked as added.
    expect(screen.queryByRole('button', { name: 'Add Uppercase' })).not.toBeInTheDocument();

    // A rule that needs a value jumps to Applied rules to fill it in.
    fireEvent.click(screen.getByRole('button', { name: 'Add Add Prefix' }));
    expect(screen.getByRole('heading', { name: 'Applied rules' })).toBeInTheDocument();
    save();

    expect(onSave).not.toHaveBeenCalled();
    expect(screen.getByText(/in 1 rule before saving/)).toBeInTheDocument();
  }, 15000);

  it('flashes Applied rules when a rule lands there from elsewhere', async () => {
    renderDrawer();
    await openTab(/Data Cleaning/);
    await openSection('Text');
    const applied = screen.getByRole('button', { name: /^Applied rules/ });
    expect(applied.querySelector('.side-nav-flash')).toBeNull();

    fireEvent.click(screen.getByRole('button', { name: 'Add Uppercase' }));
    expect(applied.querySelector('.side-nav-flash')).not.toBeNull();
    expect(applied).toHaveTextContent('2');

    // "Added · View" jumps to where the rule now lives.
    fireEvent.click(screen.getAllByRole('button', { name: /Added/ })[0]);
    expect(screen.getByRole('heading', { name: 'Applied rules' })).toBeInTheDocument();
  });

  it('finds rules across categories by search', async () => {
    renderDrawer();
    await openTab(/Data Cleaning/);
    fireEvent.change(screen.getByRole('textbox', { name: 'Search rules' }), {
      target: { value: 'timezone' },
    });
    expect(
      screen.getByRole('button', { name: 'Add Timezone Convert' }),
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
    expect(screen.getByRole('heading', { name: 'Applied rules' })).toBeInTheDocument();
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
    await openSection('Back to source');

    expect(screen.getByText('Reverse direction')).toBeInTheDocument();
    await userEvent.click(
      screen.getByRole('combobox', { name: 'Empty source value' }),
    );
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

describe('FieldSettingsDrawer live preview', () => {
  it('shows what each rule does and what gets sent', async () => {
    renderDrawer({
      mapping: {
        ...mapping,
        destRules: {
          email: [{ type: 'trim', enabled: true }, { type: 'lowercase', enabled: true }],
        },
      },
    });
    await openTab(/Data Cleaning/);

    const input = screen.getByLabelText(/Try it/);
    fireEvent.change(input, { target: { value: '  Jane@Acme.COM ' } });
    const preview = screen.getByRole('region', { name: 'Try your rules' });
    expect(preview).toHaveTextContent('Sent to HubSpot:jane@acme.com');
    // Each card shows its own step.
    expect(
      screen.getAllByText('Jane@Acme.COM', { selector: 'span' }).length,
    ).toBeGreaterThan(0);
  });

  it('runs an If → Then rule and explains a skipped record', async () => {
    renderDrawer({
      mapping: {
        ...mapping,
        destRules: {
          email: [
            {
              type: 'if_condition',
              enabled: true,
              operator: 'contains',
              value: '@test.com',
              thenAction: 'skip_record',
            },
          ],
        },
      },
    });
    await openTab(/Data Cleaning/);
    expect(screen.getByText('If value')).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText(/Try it/), {
      target: { value: 'qa@test.com' },
    });
    expect(
      screen.getByRole('region', { name: 'Try your rules' }),
    ).toHaveTextContent('Record not synced');
  });

  it('converts an older If Starts With rule into a working If → Then', async () => {
    const { onSave } = renderDrawer({
      mapping: {
        ...mapping,
        destRules: {
          email: [{ type: 'if_starts_with', enabled: true, value: '+1', action: 'US' }],
        },
      },
    });
    await openTab(/Data Cleaning/);
    expect(screen.getByText(/never changed values/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /Convert/ }));
    save();

    expect(onSave.mock.calls[0][0].rules).toEqual([
      expect.objectContaining({
        type: 'if_condition',
        operator: 'starts_with',
        value: '+1',
        thenAction: 'set',
        thenValue: 'US',
      }),
    ]);
  });

  it('shows a worked example for each rule in a category', async () => {
    renderDrawer();
    await openTab(/Data Cleaning/);
    await openSection('Date & time');
    expect(screen.getByText('Mar 15, 2024')).toBeInTheDocument();
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
