import {
  createContext,
  useContext,
  useState,
  useEffect,
  type ReactNode,
} from 'react';

import { ROLE_HIERARCHY, ROLE_DEFAULTS } from './permissions';
import { sseClient } from './sseClient';
import { tokenStorage } from './tokenStorage';

import apiClient from '@/api/apiClient';
import { queryClientInstance } from '@/lib/query-client';
import type {
  User,
  UserRole,
  Permission,
  SynkazoAuthContextValue,
  RegisterFormData,
} from '@/types';

const SynkazoAuthContext = createContext<SynkazoAuthContextValue | null>(
  null,
);

export function SynkazoAuthProvider({ children }: { children: ReactNode }) {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const token = tokenStorage.getToken('accessToken');
    if (!token) {
      setIsLoading(false);
      return;
    }
    apiClient
      .get<{ data: User }>('/auth/me')
      .then(({ data }) => setCurrentUser(data.data))
      .catch(() => {})
      .finally(() => setIsLoading(false));
  }, []);

  useEffect(() => {
    if (currentUser) sseClient.connect();
    else sseClient.disconnect();
  }, [currentUser]);

  const resolveRole = (raw: string): UserRole => {
    if (ROLE_HIERARCHY.includes(raw as UserRole)) return raw as UserRole;
    if (raw === 'admin') return 'super_admin';
    return 'editor';
  };

  const hasRole = (minRole: UserRole): boolean => {
    if (!currentUser) return false;
    const role = resolveRole(currentUser.role);
    const userIdx = ROLE_HIERARCHY.indexOf(role);
    const minIdx = ROLE_HIERARCHY.indexOf(minRole);
    if (minIdx === -1) return false;
    return userIdx >= minIdx;
  };

  const hasPermission = (permission: Permission): boolean => {
    if (!currentUser) return false;
    const role = resolveRole(currentUser.role ?? 'editor');
    if (role === 'super_admin') return true;
    const roleDefaults: Permission[] = ROLE_DEFAULTS[role] ?? [];
    const userPerms: Permission[] =
      (currentUser.permissions as Permission[]) ?? [];
    return roleDefaults.includes(permission) || userPerms.includes(permission);
  };

  const login = async (
    email: string,
    password: string,
    remember = true,
  ): Promise<User> => {
    void remember;
    const { data } = await apiClient.post<{
      data: { user: User; accessToken: string; refreshToken: string };
    }>('/auth/login', { email: email.trim().toLowerCase(), password });
    tokenStorage.setTokens(data.data);
    // Drop any cached queries (plan, org, projects…) from a previous session so the
    // new user never sees the last account's data.
    queryClientInstance.clear();
    setCurrentUser(data.data.user);
    return data.data.user;
  };

  const verifyOtp = async (
    email: string,
    code: string,
    remember = true,
  ): Promise<User> => {
    void remember;
    const { data } = await apiClient.post<{
      data: { user: User; accessToken: string; refreshToken: string };
    }>('/auth/verify-otp', {
      email: email.trim().toLowerCase(),
      code: code.trim(),
    });
    tokenStorage.setTokens(data.data);
    queryClientInstance.clear();
    setCurrentUser(data.data.user);
    return data.data.user;
  };

  const register = async (
    form: RegisterFormData,
  ): Promise<{ email: string }> => {
    await apiClient.post('/auth/register', {
      email: form.email.trim().toLowerCase(),
      password: form.password,
      fullName: form.fullName,
      organisationName: form.orgName,
    });
    return { email: form.email.trim().toLowerCase() };
  };

  const logout = (): void => {
    apiClient
      .post('/auth/logout', {
        refreshToken: tokenStorage.getToken('refreshToken'),
      })
      .catch(() => {});
    tokenStorage.clearTokens();
    queryClientInstance.clear();
    setCurrentUser(null);
    window.location.href = '/login';
  };

  const refreshUser = async (): Promise<User> => {
    const { data } = await apiClient.get<{ data: User }>('/auth/me');
    setCurrentUser(data.data);
    return data.data;
  };

  return (
    <SynkazoAuthContext.Provider
      value={{
        currentUser,
        demoUser: currentUser,
        isLoading,
        hasRole,
        hasPermission,
        login,
        verifyOtp,
        register,
        logout,
        refreshUser,
      }}
    >
      {children}
    </SynkazoAuthContext.Provider>
  );
}

export function useSynkazoAuth(): SynkazoAuthContextValue {
  const ctx = useContext(SynkazoAuthContext);
  if (!ctx)
    throw new Error('useSynkazoAuth must be used inside SynkazoAuthProvider');
  return ctx;
}
