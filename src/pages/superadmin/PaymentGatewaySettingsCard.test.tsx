import {
  cleanup,
  render,
  screen,
  waitFor,
  within,
} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import PaymentGatewaySettingsCard from './PaymentGatewaySettingsCard';

const field = (source: string, preview: string | null) => ({
  source,
  configured: !!preview,
  preview,
});
const emptyEnv = (names: string[]) => ({
  ready: false,
  fields: Object.fromEntries(names.map((n) => [n, field('none', null)])),
});
const STRIPE_FIELDS = ['publishableKey', 'secretKey', 'webhookSecret'];
const RZP_FIELDS = ['keyId', 'keySecret', 'webhookSecret'];

const state = vi.hoisted(() => ({
  save: vi.fn(),
  test: vi.fn(),
  sync: vi.fn(),
  move: vi.fn(),
  toast: { success: vi.fn(), error: vi.fn(), info: vi.fn() },
  error: false,
  razorpaySandboxReady: false,
  stripeProductionReady: true,
}));

function settings() {
  return {
    activeGateway: 'stripe',
    stripe: {
      environment: 'sandbox',
      environments: {
        sandbox: {
          ready: true,
          fields: {
            publishableKey: field('env', 'pk_test_abc'),
            secretKey: field('env', '••••1234'),
            webhookSecret: field('env', '••••abcd'),
          },
        },
        production: state.stripeProductionReady
          ? {
              ready: true,
              fields: {
                publishableKey: field('database', 'pk_live_abc'),
                secretKey: field('database', '••••9876'),
                webhookSecret: field('database', '••••live'),
              },
            }
          : emptyEnv(STRIPE_FIELDS),
      },
    },
    razorpay: {
      environment: 'sandbox',
      environments: {
        sandbox: {
          ready: state.razorpaySandboxReady,
          fields: {
            keyId: field('database', 'rzp_test_xyz'),
            keySecret: field('database', '••••9999'),
            webhookSecret: state.razorpaySandboxReady
              ? field('database', '••••8888')
              : field('none', null),
          },
        },
        production: emptyEnv(RZP_FIELDS),
      },
    },
    stripeWebhookUrl: 'https://api.example.com/api/billing/webhook',
    razorpayWebhookUrl: 'https://api.example.com/api/billing/razorpay/webhook',
  };
}

vi.mock('@/queries/usePaymentGateways', () => ({
  usePaymentGatewaySettingsQuery: () => ({
    isError: state.error,
    isLoading: false,
    refetch: vi.fn(),
    data: state.error ? undefined : settings(),
  }),
  useSavePaymentGatewaySettingsMutation: () => ({
    mutateAsync: state.save,
    isPending: false,
  }),
  useTestPaymentGatewayMutation: () => ({
    mutate: state.test,
    isPending: false,
  }),
  useSyncRazorpayCatalogMutation: () => ({
    mutateAsync: state.sync,
    isPending: false,
  }),
  useMoveCatalogMutation: () => ({ mutateAsync: state.move, isPending: false }),
}));
vi.mock('@/lib/toast', () => ({ showToast: state.toast }));

afterEach(cleanup);
beforeEach(() => {
  vi.clearAllMocks();
  state.error = false;
  state.razorpaySandboxReady = false;
  state.stripeProductionReady = true;
  state.save.mockResolvedValue({ settings: settings(), catalogMoves: [] });
  vi.stubGlobal(
    'ResizeObserver',
    class {
      observe() {}
      unobserve() {}
      disconnect() {}
    },
  );
});

const REASON = 'Moving new checkouts to Razorpay';
type User = ReturnType<typeof userEvent.setup>;

async function pickEnvironment(user: User, name: 'Sandbox' | 'Production') {
  await user.click(screen.getByRole('button', { name: 'Sandbox' }));
  await user.click(await screen.findByRole('menuitem', { name }));
}
async function giveReasonAndSubmit(user: User, actionLabel: RegExp) {
  await user.type(await screen.findByLabelText(/Reason/), REASON);
  await user.click(screen.getByRole('button', { name: actionLabel }));
}
const dialog = () => screen.findByRole('dialog');

describe('Payment gateway connections', () => {
  it('shows each gateway like a project connection, with .env keys marked', () => {
    render(<PaymentGatewaySettingsCard />);
    expect(screen.getByText('API keys')).toBeInTheDocument();
    expect(screen.getByText('Stripe connection')).toBeInTheDocument();
    expect(screen.getByText('Using .env')).toBeInTheDocument();
    expect(screen.getByText('Connected')).toBeInTheDocument();
    expect(screen.getByText(/Sandbox · pk_test_abc/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Retest/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Edit/ })).toBeInTheDocument();
    // No raw secret anywhere.
    expect(document.body.textContent).not.toMatch(/sk_test_|sk_live_/);
  });

  it('switches gateway tabs even when a gateway is not connected', async () => {
    const user = userEvent.setup();
    render(<PaymentGatewaySettingsCard />);
    await user.click(screen.getByRole('tab', { name: /Razorpay/ }));
    expect(await screen.findByText('Razorpay connection')).toBeInTheDocument();
    expect(screen.getByText('Incomplete')).toBeInTheDocument();
    expect(
      screen.getByText(/Missing: Webhook secret\. Click Finish setup/),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /Finish setup/ }),
    ).toBeInTheDocument();
  });

  it('Edit opens the popup with the public key prefilled, secrets blank, autofill off', async () => {
    const user = userEvent.setup();
    render(<PaymentGatewaySettingsCard />);
    await user.click(screen.getByRole('button', { name: /Edit/ }));
    const popup = await dialog();
    expect(
      within(popup).getByText('Edit Stripe Sandbox keys'),
    ).toBeInTheDocument();
    expect(
      within(popup).getByText(/come from the server \.env/),
    ).toBeInTheDocument();
    expect(
      within(popup).getByLabelText(/Publishable key/, { selector: 'input' }),
    ).toHaveValue('pk_test_abc');
    const secret = within(popup).getByLabelText(/^Secret key/, {
      selector: 'input',
    });
    expect(secret).toHaveValue('');
    expect(secret).toHaveAttribute('type', 'password');
    expect(secret).toHaveAttribute('autocomplete', 'new-password');
    expect(secret).toHaveAttribute(
      'placeholder',
      'Leave blank to keep ••••1234',
    );
    expect(
      within(popup).getByLabelText(/Publishable key/, { selector: 'input' }),
    ).toHaveAttribute('autocomplete', 'off');
  });

  it('saves only changed keys, with no reason, then closes with a success toast', async () => {
    const user = userEvent.setup();
    render(<PaymentGatewaySettingsCard />);
    await user.click(screen.getByRole('tab', { name: /Razorpay/ }));
    await user.click(
      await screen.findByRole('button', { name: /Finish setup/ }),
    );
    const popup = await dialog();
    await user.click(within(popup).getByRole('button', { name: 'Generate' }));
    const webhook = within(popup).getByLabelText(/^Webhook secret/, {
      selector: 'input',
    }) as HTMLInputElement;
    expect(webhook).toHaveAttribute('type', 'text');
    expect(webhook.value).toMatch(/^[0-9a-f]{48}$/);
    const generated = webhook.value;
    await user.click(
      within(popup).getByRole('button', { name: 'Save & verify' }),
    );
    await waitFor(() =>
      expect(state.save).toHaveBeenCalledWith({
        razorpay: { sandbox: { webhookSecret: generated } },
        idempotencyKey: expect.any(String),
      }),
    );
    expect(state.toast.success).toHaveBeenCalled();
    await waitFor(() =>
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument(),
    );
  });

  it('marks required fields when connecting from scratch', async () => {
    const user = userEvent.setup();
    render(<PaymentGatewaySettingsCard />);
    await user.click(screen.getByRole('tab', { name: /Razorpay/ }));
    await pickEnvironment(user, 'Production');
    await user.click(
      await screen.findByRole('button', { name: /Connect Razorpay/ }),
    );
    const popup = await dialog();
    expect(
      within(popup).getByText('Connect Razorpay Production'),
    ).toBeInTheDocument();
    await user.click(
      within(popup).getByRole('button', { name: 'Save & verify' }),
    );
    expect(within(popup).getAllByText('Required')).toHaveLength(3);
    expect(state.save).not.toHaveBeenCalled();
  });

  it('keeps the popup open with "Verification failed" and marks the field when keys are rejected', async () => {
    state.save.mockRejectedValueOnce({
      response: {
        status: 400,
        data: {
          code: 'GATEWAY_VERIFICATION_FAILED',
          message: 'Razorpay rejected this Sandbox Key ID and secret.',
          errors: [{ field: 'keySecret', message: 'x' }],
        },
      },
    });
    const user = userEvent.setup();
    render(<PaymentGatewaySettingsCard />);
    await user.click(screen.getByRole('tab', { name: /Razorpay/ }));
    await user.click(
      await screen.findByRole('button', { name: /Finish setup/ }),
    );
    const popup = await dialog();
    await user.type(
      within(popup).getByLabelText(/^Key secret/, { selector: 'input' }),
      'wrong',
    );
    await user.type(
      within(popup).getByLabelText(/^Webhook secret/, { selector: 'input' }),
      'whsecret123',
    );
    await user.click(
      within(popup).getByRole('button', { name: 'Save & verify' }),
    );
    expect(
      await within(popup).findByText('Verification failed'),
    ).toBeInTheDocument();
    expect(
      within(popup).getByText(
        'Razorpay rejected this Sandbox Key ID and secret.',
      ),
    ).toBeInTheDocument();
    expect(
      within(popup).getByLabelText(/^Key secret/, { selector: 'input' }),
    ).toHaveAttribute('aria-invalid', 'true');
    expect(
      within(popup).getByRole('button', { name: 'Retry verification' }),
    ).toBeInTheDocument();
    expect(state.toast.success).not.toHaveBeenCalled();
  });

  it('shows the Retest result in the row, green or red', async () => {
    state.test.mockImplementationOnce(
      (_req: unknown, opts: { onSuccess: (r: unknown) => void }) =>
        opts.onSuccess({
          ok: true,
          message: 'Connected to Stripe Sandbox (acct_1).',
        }),
    );
    const user = userEvent.setup();
    render(<PaymentGatewaySettingsCard />);
    await user.click(screen.getByRole('button', { name: /Retest/ }));
    expect(
      (
        await screen.findByText('Connected to Stripe Sandbox (acct_1).')
      ).closest('[data-tone]'),
    ).toHaveAttribute('data-tone', 'success');

    state.test.mockImplementationOnce(
      (_req: unknown, opts: { onSuccess: (r: unknown) => void }) =>
        opts.onSuccess({ ok: false, message: 'Stripe rejected the key.' }),
    );
    await user.click(screen.getByRole('button', { name: /Retest/ }));
    expect(
      (await screen.findByText(/Stripe rejected the key\./)).closest(
        '[data-tone]',
      ),
    ).toHaveAttribute('data-tone', 'error');
    expect(screen.getByText('Failed')).toBeInTheDocument();
  });

  it('activates exactly one gateway from Gateway settings, with a reason', async () => {
    state.razorpaySandboxReady = true;
    const user = userEvent.setup();
    render(<PaymentGatewaySettingsCard />);
    await user.click(screen.getByRole('button', { name: /Gateway settings/ }));
    const stripeSwitch = await screen.findByRole('switch', {
      name: 'Stripe active',
    });
    expect(stripeSwitch).toBeChecked();
    expect(stripeSwitch).toBeDisabled();
    await user.click(screen.getByRole('switch', { name: 'Razorpay active' }));
    await giveReasonAndSubmit(user, /Activate Razorpay/);
    await waitFor(() =>
      expect(state.save).toHaveBeenCalledWith({
        activeGateway: 'razorpay',
        reason: REASON,
        idempotencyKey: expect.any(String),
      }),
    );
  });

  it('cannot activate a gateway whose environment is not connected', async () => {
    const user = userEvent.setup();
    render(<PaymentGatewaySettingsCard />);
    await user.click(screen.getByRole('button', { name: /Gateway settings/ }));
    expect(
      await screen.findByRole('switch', { name: 'Razorpay active' }),
    ).toBeDisabled();
  });

  it('switches environment only after a reason and the typed name when subscribers exist', async () => {
    state.save
      .mockRejectedValueOnce({
        response: {
          status: 409,
          data: {
            code: 'ENVIRONMENT_HAS_SUBSCRIBERS',
            message: '3 Stripe subscriptions are live on Sandbox.',
          },
        },
      })
      .mockResolvedValueOnce({
        settings: settings(),
        catalogMoves: [
          {
            gateway: 'stripe',
            created: 9,
            cleared: { customers: 3 },
            failed: [],
          },
        ],
      });
    const user = userEvent.setup();
    render(<PaymentGatewaySettingsCard />);
    await pickEnvironment(user, 'Production');
    await user.click(
      await screen.findByRole('button', { name: /Use Production/ }),
    );
    await giveReasonAndSubmit(user, /^Use Production$/);
    expect(
      await screen.findByText('3 Stripe subscriptions are live on Sandbox.'),
    ).toBeInTheDocument();
    await user.type(screen.getByLabelText(/to confirm/), 'PRODUCTION');
    await user.click(screen.getByRole('button', { name: /^Use Production$/ }));
    await waitFor(() =>
      expect(state.save).toHaveBeenLastCalledWith(
        expect.objectContaining({
          stripe: { environment: 'production' },
          confirmEnvironmentSwitch: true,
        }),
      ),
    );
    expect(
      await screen.findByText(/Stripe catalog moved: 9 created/),
    ).toBeInTheDocument();
  });

  it('shows a recovery action if settings cannot load', () => {
    state.error = true;
    render(<PaymentGatewaySettingsCard />);
    expect(
      screen.getByRole('button', { name: /retry|try again/i }),
    ).toBeInTheDocument();
  });
});
