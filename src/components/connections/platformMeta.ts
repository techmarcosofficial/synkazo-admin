export const PLATFORM_META: Record<string, { label: string }> = {
  servicetitan: { label: 'ServiceTitan' },
  hubspot: { label: 'HubSpot' },
  dataforma: { label: 'Dataforma' },
  texada: { label: 'Texada' },
};

export interface CredField {
  key: string;
  label: string;
  type?: string;
  placeholder: string;
  editPlaceholder?: string;
  requiredAlways?: boolean;
  optional?: boolean;
}

export interface CredSchema {
  title: string;
  fields: CredField[];
  connectionType: 'source' | 'destination';
  environment: 'production' | 'sandbox';
  note?: string;
}

export const CRED_SCHEMAS: Record<string, CredSchema> = {
  servicetitan: {
    title: 'ServiceTitan',
    connectionType: 'source',
    environment: 'production',
    fields: [
      {
        key: 'appKey',
        label: 'App Key',
        placeholder: 'st_appkey_xxxxxxxx',
        requiredAlways: true,
      },
      {
        key: 'clientId',
        label: 'Client ID',
        placeholder: 'st_client_xxxxxxxx',
        requiredAlways: true,
      },
      {
        key: 'clientSecret',
        label: 'Client Secret',
        type: 'password',
        placeholder: '••••••••••••••••',
        editPlaceholder: 'Leave blank to keep existing secret',
      },
      {
        key: 'tenantId',
        label: 'Tenant ID',
        placeholder: '1234567',
        requiredAlways: true,
      },
    ],
  },
  hubspot: {
    title: 'HubSpot',
    connectionType: 'destination',
    environment: 'sandbox',
    note: 'Use a Private App Token from HubSpot → Settings → Integrations → Private Apps.',
    fields: [
      {
        key: 'privateAppToken',
        label: 'Access Token / Private App Token',
        type: 'password',
        placeholder: 'pat-na1-xxxxxxxx',
        editPlaceholder: 'Leave blank to keep existing token',
      },
      {
        key: 'portalId',
        label: 'Portal ID (optional)',
        placeholder: '12345678',
        optional: true,
      },
    ],
  },
  dataforma: {
    title: 'Dataforma',
    connectionType: 'source',
    environment: 'production',
    note: 'Find these in your Dataforma account → API settings (df-auth & df-servicecode).',
    fields: [
      {
        key: 'apiKey',
        label: 'API Key',
        type: 'password',
        placeholder: 'df-auth key',
        editPlaceholder: 'Leave blank to keep existing key',
      },
      {
        key: 'serviceCode',
        label: 'Service Code',
        placeholder: 'df-servicecode',
        requiredAlways: true,
      },
    ],
  },
  texada: {
    title: 'Texada',
    connectionType: 'source',
    environment: 'production',
    note: 'Find these in your Texada Cloudlink account → API settings (Tenant & x-api-key).',
    fields: [
      {
        key: 'tenant',
        label: 'Tenant',
        placeholder: 'e.g. holtca',
        requiredAlways: true,
      },
      {
        key: 'apiKey',
        label: 'API Key',
        type: 'password',
        placeholder: 'x-api-key value',
        editPlaceholder: 'Leave blank to keep existing key',
      },
    ],
  },
};
