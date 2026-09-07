export type LeadStatus = 'new' | 'contacted' | 'qualified' | 'closed' | 'spam';

export interface Lead {
  id: string;
  name: string;
  email: string;
  company: string | null;
  platforms: string | null;
  message: string | null;
  source: string;
  pagePath: string | null;
  status: LeadStatus;
  adminNotes: string | null;
  contactedAt: string | null;
  closedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface LeadNotificationSettings {
  defaultRecipients: string[];
  additionalRecipients: string[];
}
