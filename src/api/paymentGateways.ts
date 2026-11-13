import apiClient from './apiClient';

export type PaymentGateway = 'stripe' | 'razorpay';
export type GatewayEnvironment = 'sandbox' | 'production';
export type CredentialSource = 'database' | 'env' | 'none';

export interface GatewayField {
  source: CredentialSource;
  configured: boolean;
  /** Public keys in full; secrets as `••••last4`. Never the raw secret. */
  preview: string | null;
}
export type StripeField = 'publishableKey' | 'secretKey' | 'webhookSecret';
export type RazorpayField = 'keyId' | 'keySecret' | 'webhookSecret';

export interface GatewayEnvironmentStatus<F extends string> {
  ready: boolean;
  fields: Record<F, GatewayField>;
}
export interface GatewayStatus<F extends string> {
  /** Environment (provider account) this gateway uses right now. */
  environment: GatewayEnvironment;
  environments: Record<GatewayEnvironment, GatewayEnvironmentStatus<F>>;
}

export interface PaymentGatewaySettings {
  activeGateway: PaymentGateway;
  stripe: GatewayStatus<StripeField>;
  razorpay: GatewayStatus<RazorpayField>;
  stripeWebhookUrl: string;
  razorpayWebhookUrl: string;
}

type KeyPatch<F extends string> = Partial<Record<F, string | null>>;
/** Keys: omitted = unchanged, null = clear the saved value (falls back to .env). */
export interface PaymentGatewaySettingsUpdate {
  activeGateway?: PaymentGateway;
  stripe?: {
    environment?: GatewayEnvironment;
    sandbox?: KeyPatch<StripeField>;
    production?: KeyPatch<StripeField>;
  };
  razorpay?: {
    environment?: GatewayEnvironment;
    sandbox?: KeyPatch<RazorpayField>;
    production?: KeyPatch<RazorpayField>;
  };
  confirmAccountChange?: boolean;
  confirmEnvironmentSwitch?: boolean;
  /** Optional for key edits; required to activate a gateway or switch environment. */
  reason?: string;
}

/** What an environment switch did to the provider catalog (prices/plans, coupons, customers). */
export interface CatalogMoveSummary {
  gateway: PaymentGateway;
  created: number;
  cleared: Record<string, number>;
  failed: { item: string; message: string }[];
}

export interface RazorpayCatalogSyncResult {
  created: number;
  linked: number;
  skipped: { priceId: string; reason: string }[];
  failed: { priceId: string; message: string }[];
}

export interface PublicPaymentConfig {
  activeGateway: PaymentGateway;
  stripePublishableKey: string | null;
  razorpayKeyId: string | null;
}

const path = '/super-admin/settings/payment-gateways';
const idempotent = (key: string) => ({ headers: { 'Idempotency-Key': key } });

export const paymentGatewaysApi = {
  get: () =>
    apiClient
      .get<{ data: PaymentGatewaySettings }>(path)
      .then((r) => r.data.data),
  save: ({
    idempotencyKey,
    ...body
  }: PaymentGatewaySettingsUpdate & { idempotencyKey: string }) =>
    apiClient
      .patch<{
        data: {
          settings: PaymentGatewaySettings;
          catalogMoves: CatalogMoveSummary[];
        };
      }>(path, body, idempotent(idempotencyKey))
      .then((r) => r.data.data),
  test: (req: { gateway: PaymentGateway; environment: GatewayEnvironment }) =>
    apiClient
      .post<{ data: { ok: boolean; message: string } }>(`${path}/test`, req)
      .then((r) => r.data.data),
  syncRazorpayCatalog: ({
    reason,
    idempotencyKey,
  }: {
    reason: string;
    idempotencyKey: string;
  }) =>
    apiClient
      .post<{ data: RazorpayCatalogSyncResult }>(
        `${path}/razorpay/sync-catalog`,
        { reason },
        idempotent(idempotencyKey),
      )
      .then((r) => r.data.data),
  moveCatalog: ({
    gateway,
    reason,
    idempotencyKey,
  }: {
    gateway: PaymentGateway;
    reason: string;
    idempotencyKey: string;
  }) =>
    apiClient
      .post<{ data: CatalogMoveSummary }>(
        `${path}/${gateway}/move-catalog`,
        { reason },
        idempotent(idempotencyKey),
      )
      .then((r) => r.data.data),
  publicConfig: () =>
    apiClient
      .get<{ data: PublicPaymentConfig }>('/billing/public-config')
      .then((r) => r.data.data),
};
