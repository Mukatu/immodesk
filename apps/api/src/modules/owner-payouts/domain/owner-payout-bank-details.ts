import { DomainError } from '../../../shared/errors/domain-error';

/**
 * Coordonnées de reversement (contrat, arbitrage n°6). Champs déjà résolus
 * (compte fourni en entrée, sinon compte par défaut du bailleur) par
 * `OwnerPayoutsService.resolveBankAccount` avant appel de ces fonctions
 * pures : le domaine ne touche jamais Prisma.
 */
export interface PayoutBankAccountCandidate {
  id: string;
  isActive: boolean;
  iban: string | null;
  swiftBic: string | null;
  accountNumber: string | null;
  momoMsisdn: string | null;
}

/**
 * Virement bancaire (arbitrage n°6) : compte actif obligatoire. Un bailleur
 * en diaspora (`landlords.country_code != 'CG'`) exige IBAN ET BIC ; un
 * bailleur local se contente d'un numéro de compte — « pas de valeur
 * virement international » ne s'applique qu'à la diaspora, un virement
 * local reste un virement bancaire ordinaire.
 */
export function assertBankTransferDetails(
  account: PayoutBankAccountCandidate | null,
  isDiaspora: boolean,
): void {
  if (!account || !account.isActive) {
    throw new DomainError('AGENCY.PAYOUT_MISSING_BANK_DETAILS', {
      method: 'BANK_TRANSFER',
      reason: 'no_active_bank_account',
    });
  }
  if (isDiaspora) {
    if (!account.iban?.trim() || !account.swiftBic?.trim()) {
      throw new DomainError('AGENCY.PAYOUT_MISSING_BANK_DETAILS', {
        method: 'BANK_TRANSFER',
        reason: 'missing_iban_or_bic',
        bankAccountId: account.id,
      });
    }
    return;
  }
  if (!account.accountNumber?.trim()) {
    throw new DomainError('AGENCY.PAYOUT_MISSING_BANK_DETAILS', {
      method: 'BANK_TRANSFER',
      reason: 'missing_account_number',
      bankAccountId: account.id,
    });
  }
}

/**
 * Mobile Money : un compte dédié (`bank_accounts.momo_msisdn`) est préféré,
 * mais un numéro Mobile Money implicite (`landlords.primary_phone`) est
 * accepté à défaut (DÉCISION documentée dans le prompt de tâche : aucun
 * compte dédié n'existe encore pour la plupart des bailleurs locaux, exiger
 * systématiquement un `bank_accounts` bloquerait la quasi-totalité des
 * reversements Mobile Money).
 */
export function resolveMomoMsisdn(
  account: PayoutBankAccountCandidate | null,
  landlordPrimaryPhone: string | null,
): string {
  const msisdn = account?.momoMsisdn?.trim() || landlordPrimaryPhone?.trim();
  if (!msisdn) {
    throw new DomainError('AGENCY.PAYOUT_MISSING_BANK_DETAILS', {
      method: 'MOBILE_MONEY',
      reason: 'no_msisdn',
    });
  }
  return msisdn;
}
