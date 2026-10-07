export type AuditSeverity = 'info' | 'warning' | 'critical';

export interface AuditLog {
  id: string;
  createdAt: string;
  userId: string | null;
  userEmail: string | null;
  organisationId: string | null;
  action: string;
  resource: string | null;
  resourceId: string | null;
  severity: AuditSeverity;
  ipAddress: string | null;
  details: Record<string, unknown> | null;
}

export interface AuditLogFilters {
  search?: string;
  organisationId?: string;
  userId?: string;
  // GAP-055 — partial-match email search for the acting user. Distinct
  // from `userId` (exact UUID lookup).
  actorEmail?: string;
  action?: string;
  // GAP-055 — exact match on the audit row's `resource` column, drawn
  // from the fixed vocabulary emitted by AuditService callers
  // (organisation, user, invoice, subscription, project, job).
  resource?: string;
  severity?: AuditSeverity;
  dateFrom?: string;
  dateTo?: string;
}
