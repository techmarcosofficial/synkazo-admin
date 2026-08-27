import apiClient from './apiClient';

export interface Invitation {
  id: string;
  email: string;
  role: string;
  status: 'pending' | 'accepted' | 'revoked' | 'expired';
  token?: string;
  expiresAt?: string;
  createdAt?: string;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const d = (r: any): any => r.data.data;

export interface ProjectAccessGrant {
  projectId: string;
  permissions: string[];
}

export const invitationsApi = {
  listInvitations: (): Promise<Invitation[]> =>
    apiClient.get('/invitations').then(d),
  createInvitation: (data: {
    email: string;
    role: string;
    message?: string;
    projectAccess?: ProjectAccessGrant[];
  }): Promise<Invitation> => apiClient.post('/invitations', data).then(d),
  acceptInvitation: (data: {
    token: string;
    fullName?: string;
    password?: string;
  }): Promise<{ organisationName?: string; role?: string }> =>
    apiClient.post('/invitations/accept', data).then(d),
  revokeInvitation: (id: string): Promise<void> =>
    apiClient.post(`/invitations/${id}/revoke`).then(d),
};
