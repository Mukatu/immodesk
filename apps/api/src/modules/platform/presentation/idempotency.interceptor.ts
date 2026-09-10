import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import type { Request } from 'express';
import { Observable, from, of, switchMap, tap } from 'rxjs';
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
          context.switchToHttp().getResponse().status(lookup.replay.status);
          return of(lookup.replay.body);
        }
        const recordId = lookup.recordId as string;
        return next.handle().pipe(
          tap({
            next: (body) => {
              void this.idempotency.complete({
                organizationId: tenant.organizationId,
                userId: request.user?.userId ?? null,
                recordId,
                status: context.switchToHttp().getResponse().statusCode ?? 200,
                body: body ?? null,
              });
            },
            error: () => {
              // Échec métier : la clé est libérée pour permettre un nouvel essai.
              void this.idempotency.release({
                organizationId: tenant.organizationId,
                userId: request.user?.userId ?? null,
                recordId,
              });
            },
          }),
        );
      }),
    );
  }
}
