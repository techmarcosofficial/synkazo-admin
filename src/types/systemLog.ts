export type SystemLogSeverity = 'info' | 'warning' | 'critical';

export interface SystemLog {
  id: string;
  createdAt: string;
  organisationId: string | null;
  action: string;
  resource: string | null;
  resourceId: string | null;
  severity: SystemLogSeverity;
  details: Record<string, unknown> | null;
}
