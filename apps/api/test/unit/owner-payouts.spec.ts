import { DomainError } from '../../src/shared/errors/domain-error';
import {
  assertBankTransferDetails,
  resolveMomoMsisdn,
  type PayoutBankAccountCandidate,
} from '../../src/modules/owner-payouts/domain/owner-payout-bank-details';
import {
  assertApprovable,
  assertExecutable,
  assertFailable,
  assertNoExistingPayout,
  assertStatementBalancePositive,
  assertStatementPayoutSource,
} from '../../src/modules/owner-payouts/domain/owner-payout-rules';

function account(overrides: Partial<PayoutBankAccountCandidate> = {}): PayoutBankAccountCandidate {
  return {
    id: 'compte-1',
    isActive: true,
    iban: null,
    swiftBic: null,
    accountNumber: null,
    momoMsisdn: null,
    ...overrides,
  };
}

describe('Coordonnées bancaires du reversement (arbitrage n°6)', () => {
  it('un virement diaspora sans IBAN ni BIC est refusé', () => {
    const acc = account({ accountNumber: '00123456789' });
    expect(() => assertBankTransferDetails(acc, true)).toThrow(DomainError);
    try {
      assertBankTransferDetails(acc, true);
    } catch (error) {
      const domain = error as DomainError;
      expect(domain.code).toBe('AGENCY.PAYOUT_MISSING_BANK_DETAILS');
      expect(domain.details?.reason).toBe('missing_iban_or_bic');
    }
  });

  it('un virement diaspora avec IBAN et BIC est accepté', () => {
    const acc = account({ iban: 'FR7612345987650123456789014', swiftBic: 'BNPAFRPPXXX' });
    expect(() => assertBankTransferDetails(acc, true)).not.toThrow();
  });

  it('un virement local avec un simple numéro de compte est accepté', () => {
    const acc = account({ accountNumber: '00123456789' });
    expect(() => assertBankTransferDetails(acc, false)).not.toThrow();
  });

  it('un virement local sans numéro de compte est refusé', () => {
    expect(() => assertBankTransferDetails(account(), false)).toThrow(DomainError);
  });

  it('aucun compte actif refuse le virement, diaspora ou non', () => {
    expect(() => assertBankTransferDetails(null, false)).toThrow(DomainError);
    expect(() => assertBankTransferDetails(account({ isActive: false }), false)).toThrow(
      DomainError,
    );
  });

  it('Mobile Money utilise le numéro dédié du compte quand il existe', () => {
    const acc = account({ momoMsisdn: '+242060000001' });
    expect(resolveMomoMsisdn(acc, '+242050000002')).toBe('+242060000001');
  });

  it('Mobile Money se replie sur le téléphone principal du bailleur à défaut de compte dédié', () => {
    expect(resolveMomoMsisdn(null, '+242050000002')).toBe('+242050000002');
    expect(resolveMomoMsisdn(account(), '+242050000002')).toBe('+242050000002');
  });

  it('Mobile Money sans aucun numéro disponible est refusé', () => {
    expect(() => resolveMomoMsisdn(null, null)).toThrow(DomainError);
    expect(() => resolveMomoMsisdn(account(), '   ')).toThrow(DomainError);
  });
});

describe('Gardes de transition du reversement', () => {
  it('seul PENDING peut être approuvé', () => {
    expect(() => assertApprovable('PENDING')).not.toThrow();
    expect(() => assertApprovable('APPROVED')).toThrow(DomainError);
  });

  it('FAILED → PROCESSING (nouvelle tentative) est accepté sans recréer le reversement', () => {
    expect(() => assertExecutable('FAILED')).not.toThrow();
    expect(() => assertExecutable('APPROVED')).not.toThrow();
    expect(() => assertExecutable('PROCESSING')).not.toThrow();
  });

  it('PENDING → PAID direct est refusé : il faut d’abord passer par PROCESSING', () => {
    // Il n'existe pas de route directe vers PAID ; c'est assertExecutable qui
    // bloque un reversement encore PENDING avant même d'atteindre PROCESSING.
    expect(() => assertExecutable('PENDING')).toThrow(DomainError);
    try {
      assertExecutable('PENDING');
    } catch (error) {
      const domain = error as DomainError;
      expect(domain.code).toBe('AGENCY.PAYOUT_INVALID_TRANSITION');
    }
  });

  it('l’échec exige PROCESSING ou APPROVED, et un motif', () => {
    expect(() => assertFailable('PROCESSING', undefined)).toThrow(DomainError);
    expect(() => assertFailable('PENDING', 'motif')).toThrow(DomainError);
    expect(() => assertFailable('APPROVED', 'Opérateur indisponible')).not.toThrow();
    expect(() => assertFailable('PROCESSING', 'Solde agrégateur insuffisant')).not.toThrow();
  });

  it('seul un relevé ISSUED ou SENT peut être source d’un reversement', () => {
    expect(() => assertStatementPayoutSource('ISSUED')).not.toThrow();
    expect(() => assertStatementPayoutSource('SENT')).not.toThrow();
    expect(() => assertStatementPayoutSource('DRAFT')).toThrow(DomainError);
  });

  it('le solde net à reverser doit être strictement positif', () => {
    expect(() => assertStatementBalancePositive(1n)).not.toThrow();
    expect(() => assertStatementBalancePositive(0n)).toThrow(DomainError);
    expect(() => assertStatementBalancePositive(-1n)).toThrow(DomainError);
  });

  it('un reversement non annulé déjà existant bloque la création d’un doublon', () => {
    expect(() => assertNoExistingPayout(false)).not.toThrow();
    expect(() => assertNoExistingPayout(true)).toThrow(DomainError);
  });
});
