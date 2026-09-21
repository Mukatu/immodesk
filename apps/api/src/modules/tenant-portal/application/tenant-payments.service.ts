import { Injectable } from '@nestjs/common';
import type { TenantLeaseRow } from '../../../shared/prisma/tenant-directory.service';
import { MomoAggregatorService } from '../../mobile-money/application/momo-aggregator.service';
import { TenantInvoicesQueryService } from './tenant-invoices-query.service';

export interface TenantInvoicePaymentInput {
  payerMsisdn: string;
  clientRef: string;
}

export interface TenantInvoicePaymentOutcome {
  transactionId: string;
  status: string;
}

/**
 * Paiement d'une facture par le locataire, Mobile Money (contrat, § « Paiement ») :
 * même fournisseur agrégateur que les loyers réglés par un COLLECTOR
 * (`MomoAggregatorService.initiate`, module `mobile-money`, phase 4) —
 * jamais réimplémenté — et donc la même règle de confirmation par
 * re-interrogation (`MomoVerificationService`, jamais le webhook seul).
 *
 * `MomoReader.role` attend un `MemberRole` (`tenants` n'appartenant à aucune
 * organisation) : `'COLLECTOR'` est choisi ICI en défense en profondeur —
 * `MomoQueryService.getIn` masque alors une transaction à quiconque n'en est
 * pas l'initiateur, ce que le locataire est TOUJOURS ici (`received_by_user_id`
 * vaut son propre `userId`). Écart documenté dans le rapport de livraison.
 */
@Injectable()
export class TenantPaymentsService {
  constructor(
    private readonly invoices: TenantInvoicesQueryService,
    private readonly aggregator: MomoAggregatorService,
  ) {}

  async pay(
    leases: readonly TenantLeaseRow[],
    userId: string,
    invoiceId: string,
    input: TenantInvoicePaymentInput,
  ): Promise<TenantInvoicePaymentOutcome> {
    const { organizationId, row } = await this.invoices.findScoped(leases, userId, invoiceId);
    // Solde nul ou négatif (facture déjà réglée) : `assertAmountInRange`
    // (module `mobile-money`) refuse déjà tout montant hors bornes avec
    // `MOMO.AMOUNT_OUT_OF_RANGE` — aucune vérification à dupliquer ici.
    const result = await this.aggregator.initiate(
      organizationId,
      { userId, role: 'COLLECTOR' },
      {
        invoiceId: row.id,
        tenantId: row.tenant_id,
        leaseId: row.lease_id,
        amount: row.balance_amount,
        payerMsisdn: input.payerMsisdn,
        clientRef: input.clientRef,
      },
    );
    return { transactionId: result.transaction.id, status: result.transaction.status };
  }
}
