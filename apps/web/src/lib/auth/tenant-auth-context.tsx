'use client';

import * as React from 'react';

import { tenantApiFetch } from '@/lib/api/tenant-client';
import { resetTenantTokenStore, setTenantAccessToken } from '@/lib/api/tenant-token-store';
import type {
  TenantOtpRequestResponse,
  TenantOtpVerifyResponse,
  TenantPortalSession,
} from '@/lib/api/types';

type TenantAuthStatus = 'loading' | 'authenticated' | 'anonymous';

const SESSION_STORAGE_KEY = 'immodesk_tenant_session';

interface StoredTenantSession {
  accessToken: string;
  tenant: TenantPortalSession;
}

interface TenantAuthContextValue {
  status: TenantAuthStatus;
  tenant: TenantPortalSession | null;
  leases: TenantPortalSession['leases'];
  requestOtp: (phone: string) => Promise<TenantOtpRequestResponse>;
  verifyOtp: (phone: string, code: string) => Promise<void>;
  logout: () => void;
}

const TenantAuthContext = React.createContext<TenantAuthContextValue | null>(null);

/**
 * Persistance optionnelle côté client uniquement (survivre à un rechargement
 * de page) : `sessionStorage`, jamais `localStorage`. Ce n'est pas une route
 * serveur — le contrat n'expose aucun mécanisme de rafraîchissement pour le
 * locataire, donc au montage, en l'absence d'entrée valide, le statut passe
 * directement à `anonymous` sans tentative réseau.
 */
function readStoredSession(): StoredTenantSession | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.sessionStorage.getItem(SESSION_STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as StoredTenantSession;
  } catch {
    return null;
  }
}

function writeStoredSession(session: StoredTenantSession | null): void {
  if (typeof window === 'undefined') return;
  try {
    if (session) {
      window.sessionStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(session));
    } else {
      window.sessionStorage.removeItem(SESSION_STORAGE_KEY);
    }
  } catch {
    // sessionStorage indisponible (navigation privée, quota) : dégrade sans bloquer.
  }
}

export function TenantAuthProvider({ children }: { children: React.ReactNode }) {
  const [status, setStatus] = React.useState<TenantAuthStatus>('loading');
  const [tenant, setTenant] = React.useState<TenantPortalSession | null>(null);

  React.useEffect(() => {
    const stored = readStoredSession();
    if (!stored) {
      resetTenantTokenStore();
      setStatus('anonymous');
      return;
    }
    setTenantAccessToken(stored.accessToken);
    setTenant(stored.tenant);
    setStatus('authenticated');
  }, []);

  const requestOtp = React.useCallback(async (phone: string) => {
    return tenantApiFetch<TenantOtpRequestResponse>('/tenant-auth/otp/request', {
      method: 'POST',
      body: { phone },
      skipAuth: true,
    });
  }, []);

  const verifyOtp = React.useCallback(async (phone: string, code: string) => {
    const data = await tenantApiFetch<TenantOtpVerifyResponse>('/tenant-auth/otp/verify', {
      method: 'POST',
      body: { phone, code },
      skipAuth: true,
    });
    setTenantAccessToken(data.accessToken);
    setTenant(data.tenant);
    setStatus('authenticated');
    writeStoredSession({ accessToken: data.accessToken, tenant: data.tenant });
  }, []);

  const logout = React.useCallback(() => {
    resetTenantTokenStore();
    writeStoredSession(null);
    setTenant(null);
    setStatus('anonymous');
  }, []);

  const value = React.useMemo<TenantAuthContextValue>(
    () => ({
      status,
      tenant,
      leases: tenant?.leases ?? [],
      requestOtp,
      verifyOtp,
      logout,
    }),
    [status, tenant, requestOtp, verifyOtp, logout],
  );

  return <TenantAuthContext.Provider value={value}>{children}</TenantAuthContext.Provider>;
}

export function useTenantAuth(): TenantAuthContextValue {
  const ctx = React.useContext(TenantAuthContext);
  if (!ctx) {
    throw new Error('useTenantAuth doit être utilisé dans un <TenantAuthProvider>');
  }
  return ctx;
}
