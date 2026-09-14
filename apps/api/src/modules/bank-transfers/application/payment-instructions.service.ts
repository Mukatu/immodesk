import { Injectable } from '@nestjs/common';
import { DomainError } from '../../../shared/errors/domain-error';
import { toJsonAmount } from '../../../shared/money/amount';
import { PrismaService } from '../../../shared/prisma/prisma.service';
import { BankAccountsService } from '../../banking/application/bank-accounts.service';
import { publicInvoiceNumber } from '../../billing/application/invoice-views';
import { OPEN_INVOICE_STATUSES, type InvoiceStatus } from '../../billing/domain/invoice-status';
import { PaymentMethodsService } from '../../organizations/application/payment-methods.service';

export interface PaymentInstructionsView {
  transferReference: string | null;
  invoice: { id: string; invoiceNumber: string | null; balanceAmount: number } | null;
  bankAccounts: Array<{
    id: string;
    bankName: string;
    accountHolderName: string;
    accountNumber: string | null;
    ribKey: string | null;
    iban: string | null;
  }>;
  mobileMoneyNumbers: Array<{
    bankAccountId: string;
    provider: string;
    msisdn: string;
    holderName: string;
  }>;
  aggregatorAvailable: boolean;
}

/**
 * `GET .../payment-instructions` (contrat phase 4) : numéros Mobile Money et
 * comptes de réception, toujours issus des `bank_accounts` déjà actifs —
 * d'abord ceux du bailleur du bail, sinon ceux de l'organisation.
 */
@Injectable()
export class PaymentInstructionsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly bankAccounts: BankAccountsService,
    private readonly paymentMethods: PaymentMethodsService,
  ) {}

  async forInvoice(
    organizationId: string,
    userId: string,
    invoiceId: string,
  ): Promise<PaymentInstructionsView> {
    return this.prisma.withTenant(organizationId, userId, async (tx) => {
      const invoice = await tx.rent_invoices.findFirst({
        where: { id: invoiceId },
        select: { id: true, invoice_number: true, balance_amount: true, landlord_id: true },
      });
      if (!invoice) throw new DomainError('BILLING.INVOICE_NOT_FOUND', { invoiceId });
      const accounts = await this.accountsFor(tx, invoice.landlord_id);
      const aggregatorAvailable = (await this.paymentMethods.get(organizationId, userId))
        .aggregatorAvailable;
      return {
        transferReference: invoice.invoice_number,
        invoice: {
          id: invoice.id,
          invoiceNumber: invoice.invoice_number
            ? publicInvoiceNumber(invoice.invoice_number)
            : null,
          balanceAmount: toJsonAmount(invoice.balance_amount),
        },
        ...this.split(accounts),
        aggregatorAvailable,
      };
    });
  }

  async forLease(
    organizationId: string,
    userId: string,
    leaseId: string,
  ): Promise<PaymentInstructionsView> {
    return this.prisma.withTenant(organizationId, userId, async (tx) => {
      const lease = await tx.leases.findFirst({
        where: { id: leaseId },
        select: { id: true, landlord_id: true },
      });
      if (!lease) throw new DomainError('LEASES.NOT_FOUND', { leaseId });
      const oldest = await tx.rent_invoices.findFirst({
        where: { lease_id: leaseId, status: { in: [...OPEN_INVOICE_STATUSES] as InvoiceStatus[] } },
        orderBy: { due_date: 'asc' },
        select: { id: true, invoice_number: true, balance_amount: true },
      });
      const accounts = await this.accountsFor(tx, lease.landlord_id);
      const aggregatorAvailable = (await this.paymentMethods.get(organizationId, userId))
        .aggregatorAvailable;
      return {
        transferReference: oldest?.invoice_number ?? null,
        invoice: oldest
          ? {
              id: oldest.id,
              invoiceNumber: oldest.invoice_number
                ? publicInvoiceNumber(oldest.invoice_number)
                : null,
              balanceAmount: toJsonAmount(oldest.balance_amount),
            }
          : null,
        ...this.split(accounts),
        aggregatorAvailable,
      };
    });
  }

  private async accountsFor(
    tx: Parameters<BankAccountsService['listForLandlord']>[0],
    landlordId: string,
  ) {
    const landlordAccounts = (await this.bankAccounts.listForLandlord(tx, landlordId)).filter(
      (a) => a.isActive,
    );
    if (landlordAccounts.length > 0) return landlordAccounts;
    return this.bankAccounts.listActiveForOrganization(tx);
  }

  private split(accounts: Awaited<ReturnType<BankAccountsService['listForLandlord']>>) {
    return {
      bankAccounts: accounts
        .filter((a) => !a.momoProvider)
        .map((a) => ({
          id: a.id,
          bankName: a.bankName,
          accountHolderName: a.accountHolderName,
          accountNumber: a.accountNumber,
          ribKey: a.ribKey,
          iban: a.iban,
        })),
      mobileMoneyNumbers: accounts
        .filter((a) => a.momoProvider && a.momoMsisdn)
        .map((a) => ({
          bankAccountId: a.id,
          provider: a.momoProvider as string,
          msisdn: a.momoMsisdn as string,
          holderName: a.accountHolderName,
        })),
    };
  }
}
