export type PlatformId =
  | 'servicetitan'
  | 'hubspot'
  | 'dataforma'
  | 'texada'
  | 'salesforce'
  | 'quickbooks'
  | 'zapier';

export type PlatformStatus = 'live' | 'coming_soon';
export type PlatformCategory =
  'field_service' | 'crm' | 'roofing' | 'accounting' | 'automation';

export interface Platform {
  id: PlatformId;
  name: string;
  color: string;
  status: PlatformStatus;
  category: PlatformCategory;
}

export type ConnectionStatus =
  'connected' | 'disconnected' | 'error' | 'pending';
export type ConnectionType = 'source' | 'destination';
export type HubSpotEnvironment = 'production' | 'sandbox';

export interface Connection {
  id: string;
  projectId: string;
  platformId: PlatformId;
  connectionType: ConnectionType;
  status: ConnectionStatus;
  accountName?: string;
  connectedAt?: string;
  lastChecked?: string;
  environment?: HubSpotEnvironment;
  createdAt?: string;
  updatedAt?: string;
  providerMetadata?: {
    supportsCustomObjects?: boolean;
    customObjectsBlockedReason?: string;
    /** Set when the token can list schemas but existing custom objects may still be
     *  missing from the destination picker — a narrower warning than
     *  customObjectsBlockedReason, which means creation itself is blocked. */
    customObjectsScopeWarning?: string;
    installSource?: 'marketplace' | 'manual';
  };
}

/** A single object's live-probed read access (used when scopes can't be introspected). */
export interface VerifiedAccessEntry {
  object: string;
  label: string;
  read: boolean;
}

/** Scope/permission info for a connection's Permissions view — always real, never assumed. */
export interface ConnectionPermissions {
  platformId: PlatformId;
  kind: 'hubspot_oauth' | 'hubspot_private_app' | 'health_only';
  scopes?: string[];
  verifiedAccess?: VerifiedAccessEntry[];
  source?: 'live' | 'live_probe' | 'unavailable';
  note?: string;
  plan?: string;
  planError?: string;
  hubId?: number;
  hubDomain?: string;
  status: ConnectionStatus;
  accountName: string | null;
  connectedAt: string | null;
  lastCheckedAt: string | null;
  webhookHealth?: { scope: 'connection'; subscriptions: WebhookSubscription[] };
}

export type WebhookEventStatus =
  | 'pending'
  | 'processed'
  | 'skipped'
  | 'suppressed_echo'
  | 'failed'
  | 'coalesced';

export type WebhookSubscriptionStatus =
  'pending' | 'active' | 'inactive' | 'error';

/** A HubSpot webhook subscription Synkazo has registered (or tried to) for a connection. */
export interface WebhookSubscription {
  id: string;
  projectId: string;
  connectionId: string;
  objectType: string;
  subscriptionType: string;
  propertyName: string | null;
  hubspotSubscriptionId: string | null;
  status: WebhookSubscriptionStatus;
  registeredAt: string | null;
  lastVerifiedAt: string | null;
  lastError: string | null;
  nextAttemptAt: string | null;
  retryCount: number;
  createdAt: string;
  updatedAt: string;
}

/** App-wide HubSpot webhook target URL — one value for every portal with the app installed. */
export interface HubspotWebhookSettings {
  targetUrl: string | null;
  appId: number;
  expectedUrl: string;
  matches: boolean;
}

/**
 * An inbound HubSpot webhook event. The drain cron fetches the exact changed
 * record and writes it to the project's other platform, then records that
 * write's real outcome on this row — status/detail below reflect what
 * actually happened downstream, not just "we received this event".
 */
export interface WebhookEvent {
  id: string;
  projectId: string;
  platformId: string;
  objectType: string;
  objectId: string;
  eventType: string;
  propertyName: string | null;
  occurredAt: string;
  receivedAt: string;
  /** Raw inbound HubSpot event payload, as received at ingestion */
  payload: Record<string, unknown> | null;
  status: WebhookEventStatus;
  processedAt: string | null;
  createdAt: string;
  /** Destination object type this event was written to (e.g. ServiceTitan "customers") */
  stObjectType: string | null;
  /** Destination record id created/updated by this event */
  stRecordId: string | null;
  mappedPayload: Record<string, unknown> | null;
  /** Raw destination API response or error body */
  destResponse: string | null;
  errorMessage: string | null;
  failReason: string | null;
  /** Write attempts made so far (bumped on each transient-failure retry) */
  attempts: number;
  /** Backoff gate — null/past means eligible for the next drain tick */
  nextAttemptAt: string | null;
  syncRecordLogId: string | null;
  /** Set only when status is 'coalesced' — the sibling event (same burst) whose write covered this one */
  coalescedIntoEventId: string | null;
  /**
   * What changed on the HubSpot record, resolved from its property history:
   * previous value, new value, and who made the change. Null on events that
   * never reached the drain (still pending, or no matching job).
   */
  propertyChanges: WebhookPropertyChange[] | null;
  /** Sibling events HubSpot fired for the same object in this burst. */
  relatedEvents?: WebhookEvent[];
}

/** One changed property with its before/after values and change attribution. */
export interface WebhookPropertyChange {
  property: string;
  oldValue: string | null;
  newValue: string | null;
  /** 'CRM_UI' (a person), 'INTEGRATION' (an app), 'IMPORT', ... */
  sourceType: string | null;
  /** App id for INTEGRATION, or 'userId:12345' for a CRM_UI edit */
  sourceId: string | null;
  changedAt: string | null;
  /** True when Synkazo itself made this change — the reason it is not written back */
  isOwnWrite: boolean;
}

/** A single discoverable object type (e.g. "contacts", "deals") */
export interface DiscoveryObject {
  name: string;
  label: string;
  primaryDisplayProperty?: string;
}

/** A single discoverable field/property */
export interface DiscoveryProperty {
  name: string;
  label: string;
  type: string;
  fieldType?: string;
  required?: boolean;
  options?: Array<{ label: string; value: string }>;
}
