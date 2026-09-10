import { Global, Module } from '@nestjs/common';
import { HealthService } from './application/health.service';
import { IdempotencyService } from './application/idempotency.service';
import { HealthController } from './presentation/health.controller';
import { IdempotencyInterceptor } from './presentation/idempotency.interceptor';

/**
 * Module `platform` : santé, configuration, idempotence et génération du
 * contrat OpenAPI. Propriétaire de la table `idempotency_keys`.
 */
@Global()
@Module({
  controllers: [HealthController],
  providers: [HealthService, IdempotencyService, IdempotencyInterceptor],
  exports: [HealthService, IdempotencyService, IdempotencyInterceptor],
})
export class PlatformModule {}
