import { CanActivate, ExecutionContext, Inject, Injectable } from '@nestjs/common';
import type { Request } from 'express';
import { APP_CONFIG } from '../config/config.module';
import type { AppConfig } from '../config/config.schema';
import { DomainError } from '../errors/domain-error';
import { ReadOnlyService } from './read-only.service';

/** Méthodes qui ne modifient rien : toujours autorisées pendant un gel. */
const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

/**
 * Clés de drapeaux modifiables pendant un gel, liste LIMITATIVE.
 * `commercial_launch` en est volontairement absente : ouvrir une vague
 * commerciale pendant une panne serait précisément la décision à ne pas
 * prendre.
 */
const FLAG_KEYS_ALLOWED_DURING_FREEZE = new Set([
  'read_only_mode',
  'platform_incident',
  'platform_maintenance',
  'security_audit_cleared',
]);

/** Défaut annoncé au client quand la fin du gel n'est pas connue. */
const DEFAULT_RETRY_AFTER_SECONDS = 300;

/**
 * Refuse les écritures pendant un gel de la plateforme, par `503
 * PLATFORM.READ_ONLY` assorti d'un `Retry-After`.
 *
 * La liste des exceptions est donnée par le contrat de la phase 11 et elle
 * est LIMITATIVE. Elle est appliquée par chemin plutôt que par décorateur :
 * un décorateur imposerait à chaque module d'y penser, et un oubli se
 * traduirait par une route qui écrit pendant un gel sans que rien ne le
 * signale. Ici, tout ce qui n'est pas nommé est refusé.
 */
@Injectable()
export class ReadOnlyGuard implements CanActivate {
  constructor(
    private readonly readOnly: ReadOnlyService,
    @Inject(APP_CONFIG) private readonly config: AppConfig,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    if (context.getType() !== 'http') return true;

    const request = context.switchToHttp().getRequest<Request>();
    const method = (request.method ?? 'GET').toUpperCase();
    if (SAFE_METHODS.has(method)) return true;

    const path = this.normalize(request.path ?? request.url ?? '');
    if (this.isAllowedDuringFreeze(method, path)) return true;

    const state = await this.readOnly.current();
    if (!state.enabled) return true;

    throw new DomainError('PLATFORM.READ_ONLY', {
      reason: state.reason,
      expectedEndAt: state.expectedEndAt,
      incidentRef: state.incidentRef,
      retryAfterSeconds: this.retryAfterSeconds(state.expectedEndAt),
    });
  }

  /** Chemin sans préfixe global ni barres superflues : `admin/incidents`. */
  private normalize(rawPath: string): string {
    const prefix = this.config.API_GLOBAL_PREFIX;
    let path = rawPath.split('?')[0] ?? '';
    path = path.replace(/^\/+/, '').replace(/\/+$/, '');
    if (prefix && (path === prefix || path.startsWith(`${prefix}/`))) {
      path = path.slice(prefix.length).replace(/^\/+/, '');
    }
    return path;
  }

  private isAllowedDuringFreeze(method: string, path: string): boolean {
    const segments = path.split('/');

    // Sondes et page de statut : indispensables aux sondes et à la
    // communication pendant l'incident.
    if (path === 'health' || path === 'health/ready' || path === 'status') return true;

    // Authentification : sans elle, personne ne peut se connecter pour
    // traiter l'incident. Ses écritures ne touchent que `otp_codes` et
    // `refresh_tokens`.
    if (segments[0] === 'auth' || segments[0] === 'tenant-auth') return true;

    // Réception des webhooks : l'exception la plus importante. Refuser la
    // réception ferait perdre les rappels des agrégateurs Mobile Money et de
    // WhatsApp, donc des encaissements réels. Ils sont enregistrés au statut
    // RECEIVED sans être traités, puis rejoués à la réouverture.
    if (segments[0] === 'webhooks') return true;

    // Demande d'un code pour action sensible. Sans elle, la révocation globale
    // d'organisation — autorisée pendant un gel — serait impossible à
    // déclencher, puisqu'elle exige un code `SENSITIVE_ACTION` que rien
    // d'autre ne délivre.
    if (path === 'me/security/otp') return true;

    // Révocations du centre de sécurité : une compromission doit rester
    // arrêtable pendant une panne.
    if (this.isRevocation(method, segments)) return true;

    // Conduite de l'incident lui-même : sans ces routes, le gel serait
    // irréversible et l'incident impossible à tenir à jour.
    if (path === 'admin/read-only-mode') return true;
    if (
      path === 'admin/incidents' ||
      path === 'admin/incidents/current/updates' ||
      path === 'admin/incidents/current/resolve'
    ) {
      return true;
    }

    // Drapeaux de conduite d'incident, limitativement. Toute autre clé —
    // `commercial_launch` en tête — est refusée, comme `/v1/admin/go-live/*`.
    if (segments[0] === 'admin' && segments[1] === 'feature-flags' && segments.length === 3) {
      return FLAG_KEYS_ALLOWED_DURING_FREEZE.has(segments[2] ?? '');
    }

    return false;
  }

  /** `.../security/...` : révocation de session, de clé ou révocation globale. */
  private isRevocation(method: string, segments: string[]): boolean {
    const securityIndex = segments.indexOf('security');
    if (securityIndex === -1) return false;
    const tail = segments.slice(securityIndex + 1);
    if (tail[0] === 'sessions') return method === 'DELETE' || tail[1] === 'revoke-all';
    if (tail[0] === 'revoke-all') return true;
    if (tail[0] === 'api-keys') return method === 'DELETE';
    return false;
  }

  private retryAfterSeconds(expectedEndAt: string | null): number {
    if (!expectedEndAt) return DEFAULT_RETRY_AFTER_SECONDS;
    const end = Date.parse(expectedEndAt);
    if (Number.isNaN(end)) return DEFAULT_RETRY_AFTER_SECONDS;
    const seconds = Math.ceil((end - Date.now()) / 1000);
    return seconds > 0 ? seconds : DEFAULT_RETRY_AFTER_SECONDS;
  }
}
