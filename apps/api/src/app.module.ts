import { Module } from '@nestjs/common';
import { APP_FILTER, APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { AuditModule } from './modules/audit/audit.module';
import { BankChecksModule } from './modules/bank-checks/bank-checks.module';
import { BankingModule } from './modules/banking/banking.module';
import { BankStatementsModule } from './modules/bank-statements/bank-statements.module';
import { BankTransfersModule } from './modules/bank-transfers/bank-transfers.module';
import { BillingModule } from './modules/billing/billing.module';
import { CashModule } from './modules/cash/cash.module';
import { CommissionsModule } from './modules/commissions/commissions.module';
import { DepositsModule } from './modules/deposits/deposits.module';
import { DocumentsModule } from './modules/documents/documents.module';
import { ExpensesModule } from './modules/expenses/expenses.module';
import { IdentityModule } from './modules/identity/identity.module';
import { LandlordPortalModule } from './modules/landlord-portal/landlord-portal.module';
import { LeasesModule } from './modules/leases/leases.module';
import { MaintenanceModule } from './modules/maintenance/maintenance.module';
import { MandatesModule } from './modules/mandates/mandates.module';
import { MetersModule } from './modules/meters/meters.module';
import { MobileMoneyModule } from './modules/mobile-money/mobile-money.module';
import { MobileSyncModule } from './modules/mobile-sync/mobile-sync.module';
import { InspectionsModule } from './modules/inspections/inspections.module';
import { NotificationsModule } from './modules/notifications/notifications.module';
import { NumberingModule } from './modules/numbering/numbering.module';
import { OrganizationsModule } from './modules/organizations/organizations.module';
import { OwnerPayoutsModule } from './modules/owner-payouts/owner-payouts.module';
import { OwnerStatementsModule } from './modules/owner-statements/owner-statements.module';
import { PartiesModule } from './modules/parties/parties.module';
import { PaymentsModule } from './modules/payments/payments.module';
import { PdfModule } from './modules/pdf/pdf.module';
import { PlatformModule } from './modules/platform/platform.module';
import { PortfolioModule } from './modules/portfolio/portfolio.module';
import { ReceiptsModule } from './modules/receipts/receipts.module';
import { ReconciliationModule } from './modules/reconciliation/reconciliation.module';
import { UtilitiesModule } from './modules/utilities/utilities.module';
import { WebhooksModule } from './modules/webhooks/webhooks.module';
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
    // Phase 1 — tiers et patrimoine. Ces quatre modules sont `@Global()` :
    // ils échangent par des ports (jetons `Symbol`) dans les deux sens, ce
    // qu'un jeu d'imports croisés transformerait en cycle de modules alors
    // qu'aucun cycle n'existe entre les classes.
    PartiesModule,
    PortfolioModule,
    BankingModule,
    DocumentsModule,
    // Phase 2 — baux et dépôts. `numbering` publie les compteurs partagés,
    // `leases` et `deposits` s'échangent des ports `Symbol` dans les deux
    // sens (d'où `@Global()` là aussi), et `pdf` est la feuille du graphe :
    // il consomme `leases` sans que personne ne le consomme.
    NumberingModule,
    LeasesModule,
    DepositsModule,
    PdfModule,
    // Phase 3 — facturation, encaissements, espèces, quittances.
    BillingModule,
    PaymentsModule,
    CashModule,
    ReceiptsModule,
    PlatformModule,
    // Phase 4 — Mobile Money, virement déclaré, webhooks. `mobile-money`
    // publie le registre de fournisseurs et la file de vérification que
    // `webhooks` importe pour router sans jamais nommer un fournisseur.
    MobileMoneyModule,
    WebhooksModule,
    BankTransfersModule,
    // Phase 5 — synchronisation mobile hors ligne par lots. Consomme `cash`
    // et `documents` (tous deux `@Global()`) via ses gestionnaires
    // d'opération, sans import de module.
    MobileSyncModule,
    // Phase 6 — rapprochement bancaire et chèques. `bank-statements` ne connaît
    // pas `reconciliation` : il déclenche le moteur par le port
    // RECONCILIATION_ENGINE, que `reconciliation` publie en `@Global()`. Le
    // rejet d'un chèque ne touche jamais un rapprochement, ce qui garde le
    // graphe acyclique.
    BankChecksModule,
    BankStatementsModule,
    ReconciliationModule,
    // Phase 7 — gestion d'agence. `mandates` publie MANDATE_LANDLORD_INVITER
    // (repris plus tard par `landlord-portal`) et `expenses` publie
    // EXPENSE_READER (repris par `owner-statements`) : deux modules
    // `@Global()` de plus, sans import croisé entre eux. `commissions`
    // publie COMMISSION_CANCELLER (repris par `payments`) et expose
    // directement `CommissionsService` à `owner-statements`, qui l'injecte
    // sans port `Symbol` (couplage assumé entre les deux, voir
    // `owner-statements/application/owner-statements-campaign.service.ts`).
    MandatesModule,
    ExpensesModule,
    CommissionsModule,
    OwnerStatementsModule,
    OwnerPayoutsModule,
    // `landlord-portal` : activation par OTP et consultation (lecture seule)
    // du compte du portail bailleur. Ne publie ni ne consomme aucun port —
    // `LandlordPortalGuard` est appliqué directement sur `PortalController`
    // (`@UseGuards`), jamais en `APP_GUARD` global.
    LandlordPortalModule,
    // Phase 8 — états des lieux, compteurs & charges, maintenance. `meters`
    // et `maintenance` sont `@Global()` (lus par `utilities` et `inspections`
    // respectivement) ; `inspections` consomme `deposits`, `documents` et
    // `maintenance` (tous `@Global()`) sans import de module. `mobile-sync`,
    // déclaré plus haut, enregistre trois gestionnaires de plus pour ces
    // modules : l'ordre des imports n'a pas d'incidence sur la résolution
    // Nest, qui construit le graphe entier avant l'instanciation.
    MetersModule,
    UtilitiesModule,
    MaintenanceModule,
    InspectionsModule,
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
