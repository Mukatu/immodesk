import { Injectable } from '@nestjs/common';
import { DomainError } from '../../../shared/errors/domain-error';
import { newId } from '../../../shared/ids/uuid';
import { PrismaService, type TenantClient } from '../../../shared/prisma/prisma.service';
import { audit, AuditService } from '../../audit/application/audit.service';
import { AUDIT_OPERATIONS, toJsonState } from '../../audit/domain/audit-entry';
import { normalizeOptionalPhone, trimOrNull } from '../../parties/domain/party-rules';

export const BANK_ACCOUNT_HOLDER_TYPES = ['ORGANIZATION', 'LANDLORD', 'TENANT'] as const;
export type BankAccountHolderType = (typeof BANK_ACCOUNT_HOLDER_TYPES)[number];

export const MOMO_PROVIDERS = ['MTN_MOMO', 'AIRTEL_MONEY', 'CINETPAY', 'PAWAPAY', 'OTHER'] as const;

export interface BankAccountInput {
  holderType?: BankAccountHolderType;
  landlordId?: string | null;
  tenantId?: string | null;
  label?: string;
  bankCode?: string;
  bankName?: string;
  branchName?: string | null;
  accountHolderName?: string;
  accountNumber?: string | null;
  ribKey?: string | null;
  iban?: string | null;
  swiftBic?: string | null;
  momoProvider?: string | null;
  momoMsisdn?: string | null;
  isDefault?: boolean;
}

interface BankAccountRow {
  id: string;
  holder_type: string;
  landlord_id: string | null;
  tenant_id: string | null;
  label: string;
  bank_code: string;
  bank_name: string;
  branch_name: string | null;
  account_holder_name: string;
  account_number: string | null;
  rib_key: string | null;
  iban: string | null;
  swift_bic: string | null;
  momo_provider: string | null;
  momo_msisdn: string | null;
  currency: string;
  is_default: boolean;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
}

export interface BankAccountView {
  id: string;
  holderType: string;
  landlordId: string | null;
  tenantId: string | null;
  label: string;
  bankCode: string;
  bankName: string;
  branchName: string | null;
  accountHolderName: string;
  accountNumber: string | null;
  ribKey: string | null;
  iban: string | null;
  swiftBic: string | null;
  momoProvider: string | null;
  momoMsisdn: string | null;
  currency: string;
  isDefault: boolean;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export function toBankAccountView(row: BankAccountRow): BankAccountView {
  return {
    id: row.id,
    holderType: row.holder_type,
    landlordId: row.landlord_id,
    tenantId: row.tenant_id,
    label: row.label,
    bankCode: row.bank_code,
    bankName: row.bank_name,
    branchName: row.branch_name,
    accountHolderName: row.account_holder_name,
    accountNumber: row.account_number,
    ribKey: row.rib_key,
    iban: row.iban,
    swiftBic: row.swift_bic,
    momoProvider: row.momo_provider,
    momoMsisdn: row.momo_msisdn,
    currency: row.currency,
    isDefault: row.is_default,
    isActive: row.is_active,
    createdAt: row.created_at.toISOString(),
    updatedAt: row.updated_at.toISOString(),
  };
}

@Injectable()
export class BankAccountsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
  ) {}

  async create(
    organizationId: string,
    userId: string,
    input: BankAccountInput,
  ): Promise<BankAccountView> {
    const holderType = input.holderType ?? 'ORGANIZATION';
    const momoMsisdn = normalizeOptionalPhone(input.momoMsisdn, 'momoMsisdn');
    this.assertHolder(holderType, input);
    this.assertIdentifier(input, momoMsisdn);

    const id = newId();
    return this.prisma.withTenant(organizationId, userId, async (tx) => {
      await this.assertNotDuplicate(
        tx,
        input.bankCode ?? '',
        trimOrNull(input.accountNumber),
        null,
      );
      if (input.isDefault === true)
        await this.clearDefault(tx, holderType, input.landlordId ?? null);

      const created = (await tx.bank_accounts.create({
        data: {
          id,
          organization_id: organizationId,
          holder_type: holderType,
          landlord_id: holderType === 'LANDLORD' ? (input.landlordId as string) : null,
          tenant_id: holderType === 'TENANT' ? (input.tenantId as string) : null,
          label: (input.label ?? '').trim(),
          bank_code: (input.bankCode ?? '').trim().toUpperCase(),
          bank_name: (input.bankName ?? '').trim(),
          account_holder_name: (input.accountHolderName ?? '').trim(),
          currency: 'XAF',
          ...this.toColumns(input, momoMsisdn),
        },
      })) as unknown as BankAccountRow;

      await audit(this.auditService, tx, {
        action: 'CREATE',
        operation: AUDIT_OPERATIONS.BANK_ACCOUNT_CREATED,
        entityType: 'bank_accounts',
        entityId: id,
        newState: toJsonState(toBankAccountView(created)),
      });
      return toBankAccountView(created);
    });
  }

  async list(
    organizationId: string,
    userId: string,
    filters: { holderType?: string; landlordId?: string },
  ): Promise<BankAccountView[]> {
    const rows = await this.prisma.withTenant(organizationId, userId, (tx) =>
      tx.bank_accounts.findMany({
        where: {
          ...(filters.holderType ? { holder_type: filters.holderType as never } : {}),
          ...(filters.landlordId ? { landlord_id: filters.landlordId } : {}),
        },
        orderBy: [{ is_default: 'desc' }, { created_at: 'desc' }],
      }),
    );
    return (rows as unknown as BankAccountRow[]).map(toBankAccountView);
  }

  async update(
    organizationId: string,
    userId: string,
    id: string,
    input: BankAccountInput,
  ): Promise<BankAccountView> {
    const momoMsisdn =
      input.momoMsisdn !== undefined
        ? normalizeOptionalPhone(input.momoMsisdn, 'momoMsisdn')
        : null;

    return this.prisma.withTenant(organizationId, userId, async (tx) => {
      const before = await this.require(tx, id);
      const holderType = (input.holderType ?? before.holder_type) as BankAccountHolderType;
      if (input.holderType !== undefined) this.assertHolder(holderType, input);
      if (input.bankCode !== undefined || input.accountNumber !== undefined) {
        await this.assertNotDuplicate(
          tx,
          (input.bankCode ?? before.bank_code).trim().toUpperCase(),
          input.accountNumber !== undefined
            ? trimOrNull(input.accountNumber)
            : before.account_number,
          id,
        );
      }
      if (input.isDefault === true && !before.is_default) {
        await this.clearDefault(tx, holderType, before.landlord_id);
      }

      const after = (await tx.bank_accounts.update({
        where: { id },
        data: {
          ...(input.holderType !== undefined ? { holder_type: holderType } : {}),
          ...(input.label !== undefined ? { label: input.label.trim() } : {}),
          ...(input.bankCode !== undefined
            ? { bank_code: input.bankCode.trim().toUpperCase() }
            : {}),
          ...(input.bankName !== undefined ? { bank_name: input.bankName.trim() } : {}),
          ...(input.accountHolderName !== undefined
            ? { account_holder_name: input.accountHolderName.trim() }
            : {}),
          ...this.toColumns(input, momoMsisdn),
          updated_at: new Date(),
        },
      })) as unknown as BankAccountRow;

      await audit(this.auditService, tx, {
        action: 'UPDATE',
        operation: AUDIT_OPERATIONS.BANK_ACCOUNT_UPDATED,
        entityType: 'bank_accounts',
        entityId: id,
        previousState: toJsonState(toBankAccountView(before)),
        newState: toJsonState(toBankAccountView(after)),
      });
      return toBankAccountView(after);
    });
  }

  /**
   * `bank_accounts` n'a pas de `deleted_at` : c'est une table de référence
   * financière, citée par des paiements passés. Le DELETE du contrat est donc
   * une DÉSACTIVATION (`is_active: false`), jamais une suppression.
   */
  async deactivate(organizationId: string, userId: string, id: string): Promise<void> {
    await this.prisma.withTenant(organizationId, userId, async (tx) => {
      const before = await this.require(tx, id);
      const after = (await tx.bank_accounts.update({
        where: { id },
        data: { is_active: false, is_default: false, updated_at: new Date() },
      })) as unknown as BankAccountRow;

      await audit(this.auditService, tx, {
        action: 'STATE_TRANSITION',
        operation: AUDIT_OPERATIONS.BANK_ACCOUNT_DEACTIVATED,
        entityType: 'bank_accounts',
        entityId: id,
        previousState: toJsonState(toBankAccountView(before)),
        newState: toJsonState(toBankAccountView(after)),
      });
    });
  }

  async listForLandlord(tx: TenantClient, landlordId: string): Promise<BankAccountView[]> {
    const rows = (await tx.bank_accounts.findMany({
      where: { landlord_id: landlordId },
      orderBy: [{ is_default: 'desc' }, { created_at: 'desc' }],
    })) as unknown as BankAccountRow[];
    return rows.map(toBankAccountView);
  }

  private async require(tx: TenantClient, id: string): Promise<BankAccountRow> {
    const row = (await tx.bank_accounts.findUnique({
      where: { id },
    })) as unknown as BankAccountRow | null;
    if (!row) throw new DomainError('BANKING.ACCOUNT_NOT_FOUND', { bankAccountId: id });
    return row;
  }

  /** `bank_accounts_holder_chk` : cohérence titulaire / identifiant de tiers. */
  private assertHolder(holderType: BankAccountHolderType, input: BankAccountInput): void {
    if (holderType === 'LANDLORD' && !input.landlordId) {
      throw new DomainError('BANKING.HOLDER_INVALID', { holderType, missing: 'landlordId' });
    }
    if (holderType === 'TENANT' && !input.tenantId) {
      throw new DomainError('BANKING.HOLDER_INVALID', { holderType, missing: 'tenantId' });
    }
  }

  /** `bank_accounts_identifier_chk` : numéro, IBAN ou Mobile Money. */
  private assertIdentifier(input: BankAccountInput, momoMsisdn: string | null): void {
    if (!trimOrNull(input.accountNumber) && !trimOrNull(input.iban) && !momoMsisdn) {
      throw new DomainError('BANKING.IDENTIFIER_REQUIRED');
    }
  }

  private async assertNotDuplicate(
    tx: TenantClient,
    bankCode: string,
    accountNumber: string | null,
    exceptId: string | null,
  ): Promise<void> {
    if (!accountNumber) return;
    const taken = await tx.bank_accounts.findFirst({
      where: { bank_code: bankCode.trim().toUpperCase(), account_number: accountNumber },
      select: { id: true },
    });
    if (taken && taken.id !== exceptId) {
      throw new DomainError('BANKING.ACCOUNT_DUPLICATE', {
        bankCode,
        existingBankAccountId: taken.id,
      });
    }
  }

  /** Un seul compte par défaut par (organisation) ou (organisation, bailleur). */
  private async clearDefault(
    tx: TenantClient,
    holderType: BankAccountHolderType,
    landlordId: string | null,
  ): Promise<void> {
    await tx.bank_accounts.updateMany({
      where: {
        holder_type: holderType as never,
        ...(holderType === 'LANDLORD' ? { landlord_id: landlordId } : {}),
        is_default: true,
      },
      data: { is_default: false, updated_at: new Date() },
    });
  }

  private toColumns(input: BankAccountInput, momoMsisdn: string | null): Record<string, unknown> {
    return {
      ...(input.landlordId !== undefined ? { landlord_id: input.landlordId } : {}),
      ...(input.tenantId !== undefined ? { tenant_id: input.tenantId } : {}),
      ...(input.branchName !== undefined ? { branch_name: trimOrNull(input.branchName) } : {}),
      ...(input.accountNumber !== undefined
        ? { account_number: trimOrNull(input.accountNumber) }
        : {}),
      ...(input.ribKey !== undefined ? { rib_key: trimOrNull(input.ribKey) } : {}),
      ...(input.iban !== undefined ? { iban: trimOrNull(input.iban)?.toUpperCase() ?? null } : {}),
      ...(input.swiftBic !== undefined
        ? { swift_bic: trimOrNull(input.swiftBic)?.toUpperCase() ?? null }
        : {}),
      ...(input.momoProvider !== undefined ? { momo_provider: input.momoProvider } : {}),
      ...(input.momoMsisdn !== undefined ? { momo_msisdn: momoMsisdn } : {}),
      ...(input.isDefault !== undefined ? { is_default: input.isDefault } : {}),
    };
  }
}
