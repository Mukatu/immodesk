'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';

import { ApiError, apiFetch } from '@/lib/api/client';
import type {
  MeResponse,
  OrganizationMembership,
  OtpRequestBody,
  OtpRequestResponse,
  OtpVerifyResponse,
  User,
} from '@/lib/api/types';
import {
  getCurrentOrganizationId,
  resetTokenStore,
  setAccessToken,
  setCurrentOrganizationId,
} from '@/lib/api/token-store';

type AuthStatus = 'loading' | 'authenticated' | 'anonymous';

interface AuthContextValue {
  status: AuthStatus;
  user: User | null;
  organizations: OrganizationMembership[];
  currentOrganizationId: string | null;
  currentOrganization: OrganizationMembership | null;
  setCurrentOrganization: (organizationId: string) => void;
  requestOtp: (body: OtpRequestBody) => Promise<OtpRequestResponse>;
  verifyOtp: (phone: string, code: string, deviceName?: string) => Promise<OtpVerifyResponse>;
  logout: () => Promise<void>;
  refresh: () => Promise<void>;
}

const AuthContext = React.createContext<AuthContextValue | null>(null);

async function requestOtpBff(body: OtpRequestBody): Promise<OtpRequestResponse> {
  const response = await fetch('/api/auth/otp/request', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    credentials: 'include',
  });
  const payload = await response.json().catch(() => null);
  if (!response.ok) {
    throw new ApiError(response.status, payload ?? { code: 'HTTP.UNKNOWN', message: 'Erreur inconnue.' });
  }
  return payload as OtpRequestResponse;
}

async function verifyOtpBff(
  phone: string,
  code: string,
  deviceName?: string,
): Promise<OtpVerifyResponse> {
  const response = await fetch('/api/auth/otp/verify', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ phone, code, deviceName }),
    credentials: 'include',
  });
  const payload = await response.json().catch(() => null);
  if (!response.ok) {
    throw new ApiError(response.status, payload ?? { code: 'HTTP.UNKNOWN', message: 'Erreur inconnue.' });
  }
  return payload as OtpVerifyResponse;
}

async function silentRefresh(): Promise<string | null> {
  try {
    const response = await fetch('/api/auth/refresh', { method: 'POST', credentials: 'include' });
    if (!response.ok) return null;
    const data = (await response.json()) as { accessToken: string };
    return data.accessToken;
  } catch {
    return null;
  }
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [status, setStatus] = React.useState<AuthStatus>('loading');
  const [user, setUser] = React.useState<User | null>(null);
  const [organizations, setOrganizations] = React.useState<OrganizationMembership[]>([]);
  const [currentOrganizationId, setCurrentOrganizationIdState] = React.useState<string | null>(
    null,
  );

  const hydrate = React.useCallback(async () => {
    const token = await silentRefresh();
    if (!token) {
      resetTokenStore();
      setStatus('anonymous');
      return;
    }
    setAccessToken(token);
    try {
      const me = await apiFetch<MeResponse>('/me');
      setUser(me.user);
      setOrganizations(me.organizations);
      const stored = getCurrentOrganizationId();
      const fallback = me.organizations[0]?.organization.id ?? null;
      const nextOrgId =
        stored && me.organizations.some((m) => m.organization.id === stored) ? stored : fallback;
      if (nextOrgId) {
        setCurrentOrganizationId(nextOrgId);
        setCurrentOrganizationIdState(nextOrgId);
      }
      setStatus('authenticated');
    } catch {
      resetTokenStore();
      setStatus('anonymous');
    }
  }, []);

  React.useEffect(() => {
    void hydrate();
  }, [hydrate]);

  const requestOtp = React.useCallback((body: OtpRequestBody) => requestOtpBff(body), []);

  const verifyOtp = React.useCallback(
    async (phone: string, code: string, deviceName?: string) => {
      const result = await verifyOtpBff(phone, code, deviceName);
      setAccessToken(result.accessToken);
      setUser(result.user);
      setOrganizations(result.organizations);
      const firstOrgId = result.organizations[0]?.organization.id ?? null;
      if (firstOrgId) {
        setCurrentOrganizationId(firstOrgId);
        setCurrentOrganizationIdState(firstOrgId);
      }
      setStatus('authenticated');
      return result;
    },
    [],
  );

  const logout = React.useCallback(async () => {
    await fetch('/api/auth/logout', { method: 'POST', credentials: 'include' }).catch(() => null);
    resetTokenStore();
    setUser(null);
    setOrganizations([]);
    setCurrentOrganizationIdState(null);
    setStatus('anonymous');
    router.push('/login');
  }, [router]);

  const setCurrentOrganization = React.useCallback((organizationId: string) => {
    setCurrentOrganizationId(organizationId);
    setCurrentOrganizationIdState(organizationId);
  }, []);

  const value = React.useMemo<AuthContextValue>(
    () => ({
      status,
      user,
      organizations,
      currentOrganizationId,
      currentOrganization:
        organizations.find((m) => m.organization.id === currentOrganizationId) ?? null,
      setCurrentOrganization,
      requestOtp,
      verifyOtp,
      logout,
      refresh: hydrate,
    }),
    [status, user, organizations, currentOrganizationId, setCurrentOrganization, requestOtp, verifyOtp, logout, hydrate],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = React.useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth doit être utilisé dans un <AuthProvider>');
  }
  return ctx;
}
