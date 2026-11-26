'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';

import { ApiError, portalApiFetch, refreshPortalAccessToken } from '@/lib/api/portal-client';
import { resetPortalTokenStore, setPortalAccessToken } from '@/lib/api/portal-token-store';
import type {
  PortalActivationRequestResponse,
  PortalLandlord,
  PortalMeResponse,
  PortalOrganizationRef,
} from '@/lib/api/types';

type PortalAuthStatus = 'loading' | 'authenticated' | 'anonymous';

interface PortalAuthContextValue {
  status: PortalAuthStatus;
  landlord: PortalLandlord | null;
  organizations: PortalOrganizationRef[];
  requestActivation: (invitationToken: string) => Promise<PortalActivationRequestResponse>;
  verifyActivation: (invitationToken: string, code: string) => Promise<void>;
  logout: () => Promise<void>;
}

const PortalAuthContext = React.createContext<PortalAuthContextValue | null>(null);

export function PortalAuthProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [status, setStatus] = React.useState<PortalAuthStatus>('loading');
  const [landlord, setLandlord] = React.useState<PortalLandlord | null>(null);
  const [organizations, setOrganizations] = React.useState<PortalOrganizationRef[]>([]);

  React.useEffect(() => {
    (async () => {
      const token = await refreshPortalAccessToken();
      if (!token) {
        resetPortalTokenStore();
        setStatus('anonymous');
        return;
      }
      try {
        const me = await portalApiFetch<PortalMeResponse>('/portal/me');
        setLandlord(me.landlord);
        setOrganizations(me.organizations);
        setStatus('authenticated');
      } catch {
        resetPortalTokenStore();
        setStatus('anonymous');
      }
    })();
  }, []);

  const requestActivation = React.useCallback(async (invitationToken: string) => {
    const response = await fetch('/api/portal-auth/activation/request', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ invitationToken }),
      credentials: 'include',
    });
    const payload = await response.json().catch(() => null);
    if (!response.ok) {
      throw new ApiError(
        response.status,
        payload ?? { code: 'HTTP.UNKNOWN', message: 'Erreur inconnue.' },
      );
    }
    return payload as PortalActivationRequestResponse;
  }, []);

  const verifyActivation = React.useCallback(async (invitationToken: string, code: string) => {
    const response = await fetch('/api/portal-auth/activation/verify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ invitationToken, code }),
      credentials: 'include',
    });
    const payload = await response.json().catch(() => null);
    if (!response.ok) {
      throw new ApiError(
        response.status,
        payload ?? { code: 'HTTP.UNKNOWN', message: 'Erreur inconnue.' },
      );
    }
    const data = payload as {
      accessToken: string;
      landlord: PortalLandlord;
      organizations: PortalOrganizationRef[];
    };
    setPortalAccessToken(data.accessToken);
    setLandlord(data.landlord);
    setOrganizations(data.organizations);
    setStatus('authenticated');
  }, []);

  const logout = React.useCallback(async () => {
    await fetch('/api/portal-auth/logout', { method: 'POST', credentials: 'include' }).catch(
      () => null,
    );
    resetPortalTokenStore();
    setLandlord(null);
    setOrganizations([]);
    setStatus('anonymous');
    router.push('/portail/activer');
  }, [router]);

  const value = React.useMemo<PortalAuthContextValue>(
    () => ({ status, landlord, organizations, requestActivation, verifyActivation, logout }),
    [status, landlord, organizations, requestActivation, verifyActivation, logout],
  );

  return <PortalAuthContext.Provider value={value}>{children}</PortalAuthContext.Provider>;
}

export function usePortalAuth(): PortalAuthContextValue {
  const ctx = React.useContext(PortalAuthContext);
  if (!ctx) {
    throw new Error('usePortalAuth doit être utilisé dans un <PortalAuthProvider>');
  }
  return ctx;
}
