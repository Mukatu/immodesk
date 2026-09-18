'use client';

import * as React from 'react';

import { useTenantAuth } from '@/lib/auth/tenant-auth-context';
import {
  clearTenantPortalSessionFlag,
  writeTenantPortalSessionFlag,
} from '@/app/locataire/_lib/tenant-portal-cookie';

/**
 * Ne rend rien : pose ou retire le cookie non sensible que `middleware.ts`
 * lit pour protéger `/locataire/*` (voir tenant-portal-cookie.ts pour le
 * pourquoi — la session réelle vit uniquement en mémoire/`sessionStorage`,
 * jamais en cookie). Couvre les changements de statut hors navigation
 * explicite (restauration au chargement, expiration) — la connexion pose le
 * drapeau elle-même avant de naviguer, voir connexion/page.tsx.
 */
export function TenantSessionFlag() {
  const { status } = useTenantAuth();

  React.useEffect(() => {
    if (status === 'loading') return;
    if (status === 'authenticated') {
      writeTenantPortalSessionFlag();
    } else {
      clearTenantPortalSessionFlag();
    }
  }, [status]);

  return null;
}
