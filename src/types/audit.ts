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
  action?: string;
  severity?: AuditSeverity;
  dateFrom?: string;
  dateTo?: string;
}
