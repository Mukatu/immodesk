import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import type { Request } from 'express';
import { Observable, catchError, concatMap, from, of, switchMap } from 'rxjs';
import type { AuthenticatedUser } from '../../../shared/auth/auth.contracts';
import type { TenantContext } from '../../../shared/tenant/tenant-context';
import { IdempotencyService } from '../application/idempotency.service';

export const IDEMPOTENCY_HEADER = 'idempotency-key';

/**
 * Rejoue la réponse mémorisée lorsqu'un POST porte un `Idempotency-Key`
 * déjà traité, et mémorise la réponse sinon.
 *
 * L'en-tête est facultatif (docs/api/phase0-contract.md) : sans lui,
 * l'intercepteur est transparent. Il exige un contexte d'organisation, la
 * table `idempotency_keys` étant sous RLS.
 */
@Injectable()
export class IdempotencyInterceptor implements NestInterceptor {
  constructor(private readonly idempotency: IdempotencyService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    if (context.getType() !== 'http') return next.handle();

    const request = context
      .switchToHttp()
      .getRequest<Request & { user?: AuthenticatedUser; tenant?: TenantContext }>();

    const key = request.headers[IDEMPOTENCY_HEADER];
    const value = Array.isArray(key) ? key[0] : key;

    if (request.method !== 'POST' || !value || !request.tenant) {
      return next.handle();
    }

    const tenant = request.tenant;
    const scope = `${request.method}:${request.route?.path ?? request.path}`;
    const requestHash = IdempotencyService.hashRequest(request.method, request.path, request.body);

    return from(
      this.idempotency.begin({
        organizationId: tenant.organizationId,
        userId: request.user?.userId ?? null,
        key: value,
        scope,
        method: request.method,
        path: request.path,
        requestHash,
      }),
    ).pipe(
      switchMap((lookup) => {
        if (lookup.replay) {
          // Un rejeu ne crée rien : une création mémorisée (201) est rendue
          // en 200, corps identique (docs/api/phase3-contract.md).
          const status = lookup.replay.status === 201 ? 200 : lookup.replay.status;
          context.switchToHttp().getResponse().status(status);
          return of(lookup.replay.body);
        }
        const recordId = lookup.recordId as string;
        // La réponse n'est rendue qu'APRÈS mémorisation : un second appel
        // arrivant aussitôt (double appui en réseau dégradé) doit trouver la
        // réponse à rejouer, et non une clé encore « en cours ».
        return next.handle().pipe(
          concatMap(async (body) => {
            await this.idempotency
              .complete({
                organizationId: tenant.organizationId,
                userId: request.user?.userId ?? null,
                recordId,
                status: context.switchToHttp().getResponse().statusCode ?? 200,
                body: body ?? null,
              })
              .catch(() => undefined);
            return body;
          }),
          catchError(async (error: unknown) => {
            // Échec métier : la clé est libérée pour permettre un nouvel essai.
            await this.idempotency.release({
              organizationId: tenant.organizationId,
              userId: request.user?.userId ?? null,
              recordId,
            });
            throw error;
          }),
        );
      }),
    );
  }
}
