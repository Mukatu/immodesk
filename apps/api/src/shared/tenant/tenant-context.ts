import { AsyncLocalStorage } from 'node:async_hooks';
import { DomainError } from '../errors/domain-error';

export type MemberRole = 'OWNER' | 'MANAGER' | 'COLLECTOR' | 'ACCOUNTANT' | 'VIEWER';

export interface TenantContext {
  /** Organisation courante (`app.current_organization_id`). */
  organizationId: string;
  /** Utilisateur authentifié (`app.current_user_id`). */
  userId: string;
  /** Rôle effectif de l'utilisateur dans cette organisation, relu en base. */
  role: MemberRole;
  /** Identifiant du membre (`organization_members.id`). */
  membershipId: string;
  /** Corrélation avec la trace HTTP. */
  requestId?: string;
}

/**
 * Stockage du contexte de tenant. Exporté pour permettre à l'intercepteur
 * HTTP d'ouvrir le contexte autour de l'exécution du contrôleur ; le code
 * applicatif utilise `requireTenant()` et non ce stockage.
 */
export const tenantStorage = new AsyncLocalStorage<TenantContext>();
const storage = tenantStorage;

/** Ouvre un contexte de tenant pour la durée de `fn`. */
export function runWithTenant<T>(context: TenantContext, fn: () => Promise<T> | T): Promise<T> | T {
  return storage.run(context, fn);
}

/** Contexte courant, ou `null` hors d'une requête d'organisation. */
export function currentTenant(): TenantContext | null {
  return storage.getStore() ?? null;
}

/**
 * Contexte courant obligatoire. Une requête d'organisation sans contexte est
 * un défaut de conception : on refuse plutôt que de risquer une fuite.
 */
export function requireTenant(): TenantContext {
  const ctx = storage.getStore();
  if (!ctx) {
    throw new DomainError('PLATFORM.TENANT_CONTEXT_MISSING');
  }
  return ctx;
}
