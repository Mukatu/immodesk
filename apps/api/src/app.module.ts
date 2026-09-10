import { Module } from '@nestjs/common';
import { APP_FILTER, APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { AuditModule } from './modules/audit/audit.module';
import { IdentityModule } from './modules/identity/identity.module';
import { NotificationsModule } from './modules/notifications/notifications.module';
import { OrganizationsModule } from './modules/organizations/organizations.module';
import { PlatformModule } from './modules/platform/platform.module';
import { IdempotencyInterceptor } from './modules/platform/presentation/idempotency.interceptor';
import { JwtAuthGuard } from './shared/auth/jwt-auth.guard';
import { AppConfigModule } from './shared/config/config.module';
import { DomainExceptionFilter } from './shared/errors/domain-exception.filter';
import { AppLoggerModule } from './shared/logger/logger.module';
import { PrismaModule } from './shared/prisma/prisma.module';
import { RedisModule } from './shared/redis/redis.module';
import { AppThrottlerModule } from './shared/throttler/throttler.module';
import { OrganizationGuard } from './shared/tenant/organization.guard';
import { TenantContextInterceptor } from './shared/tenant/tenant-context.interceptor';

/**
 * Assemblage de l'application.
 *
 * L'ordre des gardes est significatif : `JwtAuthGuard` authentifie, puis
 * `OrganizationGuard` résout l'organisation et le rôle. L'intercepteur de
 * tenant ouvre ensuite le contexte `AsyncLocalStorage` autour du contrôleur.
 */
@Module({
  imports: [
    AppConfigModule,
    AppLoggerModule,
    PrismaModule,
    RedisModule,
    AppThrottlerModule,
    AuditModule,
    NotificationsModule,
    IdentityModule,
    OrganizationsModule,
    PlatformModule,
  ],
  providers: [
    { provide: APP_FILTER, useClass: DomainExceptionFilter },
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: OrganizationGuard },
    { provide: APP_INTERCEPTOR, useClass: TenantContextInterceptor },
    { provide: APP_INTERCEPTOR, useClass: IdempotencyInterceptor },
  ],
})
export class AppModule {}
