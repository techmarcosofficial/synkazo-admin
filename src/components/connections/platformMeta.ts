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
  helpText?: string;
  helpUrl?: string
}

export interface CredSchema {
  title: string;
  fields: CredField[];
  connectionType: 'source' | 'destination';
  environment: 'production' | 'sandbox';
  note?: string;
}

// export const CRED_SCHEMAS: Record<string, CredSchema> = {
//   servicetitan: {
//     title: 'ServiceTitan',
//     connectionType: 'source',
//     environment: 'production',
//     fields: [
//       {
//         key: 'appKey',
//         label: 'App Key',
//         placeholder: 'st_appkey_xxxxxxxx',
//         requiredAlways: true,
//         helpText: 'your App Key in the ServiceTitan Developer Portal.',
//         helpUrl: 'https//servertitan.com'
//       },
//       {
//         key: 'clientId',
//         label: 'Client ID',
//         placeholder: 'st_client_xxxxxxxx',
//         requiredAlways: true,
//       },
//       {
//         key: 'clientSecret',
//         label: 'Client Secret',
//         type: 'password',
//         placeholder: '••••••••••••••••',
//         editPlaceholder: 'Leave blank to keep existing secret',
//       },
//       {
//         key: 'tenantId',
//         label: 'Tenant ID',
//         placeholder: '1234567',
//         requiredAlways: true,
//       },
//     ],
//   },
//   hubspot: {
//     title: 'HubSpot',
//     connectionType: 'destination',
//     environment: 'sandbox',
//     note: 'Use a Private App Token from HubSpot → Settings → Integrations → Private Apps.',
//     fields: [
//       {
//         key: 'privateAppToken',
//         label: 'Access Token / Private App Token',
//         type: 'password',
//         placeholder: 'pat-na1-xxxxxxxx',
//         editPlaceholder: 'Leave blank to keep existing token',
//       },
//       {
//         key: 'portalId',
//         label: 'Portal ID (optional)',
//         placeholder: '12345678',
//         optional: true,
//       },
//     ],
//   },
//   dataforma: {
//     title: 'Dataforma',
//     connectionType: 'source',
//     environment: 'production',
//     note: 'Find these in your Dataforma account → API settings (df-auth & df-servicecode).',
//     fields: [
//       {
//         key: 'apiKey',
//         label: 'API Key',
//         type: 'password',
//         placeholder: 'df-auth key',
//         editPlaceholder: 'Leave blank to keep existing key',
//       },
//       {
//         key: 'serviceCode',
//         label: 'Service Code',
//         placeholder: 'df-servicecode',
//         requiredAlways: true,
//       },
//     ],
//   },
//   texada: {
//     title: 'Texada',
//     connectionType: 'source',
//     environment: 'production',
//     note: 'Find these in your Texada Cloudlink account → API settings (Tenant & x-api-key).',
//     fields: [
//       {
//         key: 'tenant',
//         label: 'Tenant',
//         placeholder: 'e.g. holtca',
//         requiredAlways: true,
//       },
//       {
//         key: 'apiKey',
//         label: 'API Key',
//         type: 'password',
//         placeholder: 'x-api-key value',
//         editPlaceholder: 'Leave blank to keep existing key',
//       },
//     ],
//   },
// };




export const CRED_SCHEMAS: Record<string, CredSchema> = {
  servicetitan: {
    title: 'ServiceTitan',
    connectionType: 'source',
    environment: 'production',

    note: 'You need an Application Key, Client ID, Client Secret, and Tenant ID. Your integration must be authorized to access the ServiceTitan account.',

    fields: [
      {
        key: 'appKey',
        label: 'App Key',
        placeholder: 'Enter your application key',
        requiredAlways: true,
        helpText:
          'The application developer obtains this key from the ServiceTitan Developer Portal. Open My Apps, select the application, and copy its Application Key from the Keys section.',
        helpUrl:
          'https://help.servicetitan.com/docs/get-started-with-api-dev-portal-v2',
      },

      {
        key: 'clientId',
        label: 'Client ID',
        placeholder: 'Enter your client ID',
        requiredAlways: true,
        helpText:
          'In ServiceTitan, go to Settings → Integrations → API Application Access. Connect and authorize the application, then copy its Client ID from Application Details. Your integration provider can also help you obtain it.',
        helpUrl:
          'https://developer.servicetitan.io/docs/getting-started/client-id-secret',
      },

      {
        key: 'clientSecret',
        label: 'Client Secret',
        type: 'password',
        placeholder: 'Enter your client secret',
        editPlaceholder: 'Leave blank to keep existing secret',
        helpText:
          'Open the authorized application in ServiceTitan under Settings → Integrations → API Application Access. Generate the Client Secret in Application Details. Your integration provider may manage this credential for you.',
        helpUrl:
          'https://developer.servicetitan.io/docs/getting-started/client-id-secret',
      },

      {
        key: 'tenantId',
        label: 'Tenant ID',
        placeholder: 'e.g. 1234567',
        requiredAlways: true,
        helpText:
          'Your Tenant ID identifies your ServiceTitan account. Open Settings → Integrations → API Application Access and locate your Tenant ID. Copy the numeric value for the account you want to connect.',
        helpUrl:
          'https://help.servicetitan.com/docs/get-started-with-api-dev-portal-v2',
      },
    ],
  },

  hubspot: {
    title: 'HubSpot',
    connectionType: 'destination',
    environment: 'sandbox',

    note: 'HubSpot recommends Service Keys for new system-to-system data integrations. Existing legacy private-app tokens continue to work. Confirm that your connector supports Service Keys before using one.',

    fields: [
      {
        key: 'privateAppToken',
        label: 'Access Token',
        type: 'password',
        placeholder: 'Enter your HubSpot access token',
        editPlaceholder: 'Leave blank to keep existing token',
        helpText:
          'For an existing private app, go to Development → Legacy apps → Your app → Auth → Show token. For a new data integration, go to Settings → Integrations → Service Keys, create a key, and grant the required CRM permissions. Use a Service Key only if this connector supports it.',
        helpUrl:
          'https://developers.hubspot.com/changelog/service-keys',
      },

      {
        key: 'portalId',
        label: 'Portal ID (optional)',
        placeholder: 'e.g. 12345678',
        optional: true,
        helpText:
          'Your Portal ID, also called the Hub ID or Account ID, identifies your HubSpot account. Find it in your HubSpot account details or account URL. If you use a sandbox, enter the sandbox account ID rather than your production account ID.',
        helpUrl:
          'https://developers.hubspot.com/docs/api-reference/legacy/account/account-information/guide',
      },
    ],
  },

  dataforma: {
    title: 'Dataforma',
    connectionType: 'source',
    environment: 'production',

    note: 'Dataforma requires your personal API key (df-auth) and your company service code (df-servicecode).',

    fields: [
      {
        key: 'apiKey',
        label: 'API Key',
        type: 'password',
        placeholder: 'Enter your Dataforma API key',
        editPlaceholder: 'Leave blank to keep existing key',
        helpText:
          'Log in to Dataforma and navigate to User Info → API Key. Generate a new API key and copy it securely. This key is sent as the df-auth header when authenticating API requests.',
        helpUrl:
          'https://documentation.dataforma.com/#/',
      },

      {
        key: 'serviceCode',
        label: 'Service Code',
        placeholder: 'Enter your company service code',
        requiredAlways: true,
        helpText:
          'Enter your company’s Dataforma service code, used in the df-servicecode API header. If you do not know this value, request it from your Dataforma administrator or support team.',
        helpUrl:
          'https://documentation.dataforma.com/#/',
      },
    ],
  },

  texada: {
    title: 'Texada',
    connectionType: 'source',
    environment: 'production',

    note: 'Connect using your lowercase CloudLink tenant name and the API key provided by Texada. Sandbox and production require different API keys.',

    fields: [
      {
        key: 'tenant',
        label: 'Tenant',
        placeholder: 'e.g. demo',
        requiredAlways: true,
        helpText:
          'Your tenant is the lowercase name in your CloudLink application URL. For example, in https://use.cloudlink.texadasoftware.com/demo/CustomerSearch/, the tenant is demo. Enter only the tenant name, not the full URL.',
        helpUrl:
          'https://help.texadasoftware.com/en/crm-service/en/crm-service/2176/cloudlink-apis-technical-documentation',
      },

      {
        key: 'apiKey',
        label: 'API Key',
        type: 'password',
        placeholder: 'Enter your Texada API key',
        editPlaceholder: 'Leave blank to keep existing key',
        helpText:
          'Request your CloudLink API key from Texada or your integration administrator. Texada generates and provides this key. Use the key for the correct environment: sandbox or production.',
        helpUrl:
          'https://help.texadasoftware.com/en/crm-service/en/crm-service/2176/cloudlink-apis-technical-documentation',
      },
    ],
  },
};