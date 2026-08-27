export type UserRole = 'editor' | 'org_admin' | 'super_admin';

export type Permission =
  | 'project.view'
  | 'project.create'
  | 'project.edit'
  | 'project.delete'
  | 'job.view'
  | 'job.create'
  | 'job.edit'
  | 'job.delete'
  | 'job.run'
  | 'connection.view'
  | 'connection.manage'
  | 'user.view'
  | 'user.invite'
  | 'user.manage'
  | 'user.remove'
  | 'logs.view';

export interface User {
  id: string;
  email: string;
  fullName: string;
  role: UserRole;
  permissions?: Permission[];
  organisationId?: string;
  status?: 'active' | 'invited' | 'suspended';
  isActive?: boolean;
  avatarInitials?: string;
  department?: string;
  joinedAt?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface Organisation {
  id: string;
  name: string;
  description?: string;
  plan?: string;
  createdAt?: string;
  updatedAt?: string;
}

/** Context value exposed by SynkazoAuthProvider */
export interface SynkazoAuthContextValue {
  currentUser: User | null;
  /** Alias for currentUser — kept for legacy consumers */
  demoUser: User | null;
  isLoading: boolean;
  hasRole: (minRole: UserRole) => boolean;
  hasPermission: (permission: Permission) => boolean;
  login: (email: string, password: string, remember?: boolean) => Promise<User>;
  verifyOtp: (email: string, code: string, remember?: boolean) => Promise<User>;
  register: (form: RegisterFormData) => Promise<{ email: string }>;
  logout: () => void;
  refreshUser: () => Promise<User>;
}

export interface RegisterFormData {
  email: string;
  password: string;
  fullName: string;
  orgName: string;
}
