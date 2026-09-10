import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import type { Request } from 'express';
import { Observable, type Subscription } from 'rxjs';
import { tenantStorage, type TenantContext } from './tenant-context';

/**
 * Ouvre le contexte `AsyncLocalStorage` résolu par `OrganizationGuard` autour
 * de l'exécution du contrôleur, afin que toute couche applicative puisse
 * appeler `requireTenant()` sans se voir passer l'organisation en paramètre.
 *
 * L'abonnement à `next.handle()` est fait DANS `storage.run(...)` : c'est
 * l'abonnement qui déclenche l'appel du contrôleur, pas la création de
 * l'observable.
 */
@Injectable()
export class TenantContextInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    if (context.getType() !== 'http') return next.handle();

    const request = context.switchToHttp().getRequest<Request & { tenant?: TenantContext }>();
    const tenant = request.tenant;
    if (!tenant) return next.handle();

    return new Observable((subscriber) => {
      let inner: Subscription | undefined;
      tenantStorage.run(tenant, () => {
        inner = next.handle().subscribe(subscriber);
      });
      return () => inner?.unsubscribe();
    });
  }
}
