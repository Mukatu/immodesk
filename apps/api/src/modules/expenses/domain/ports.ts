import type { TenantClient } from '../../../shared/prisma/prisma.service';

/**
 * Port de lecture consommé par `owner-statements` (pas encore construit) pour
 * la campagne mensuelle (contrat, § « Dépenses » et « Campagne mensuelle »).
 *
 * `mandates` reste propriétaire exclusif de `expenses` ; ce port est le SEUL
 * chemin par lequel un autre module lit ou rattache des dépenses à un
 * relevé — à l'image de `LEASE_READER` / `DEPOSIT_WRITER` entre `leases` et
 * `deposits`.
 */
export const EXPENSE_READER = Symbol('EXPENSE_READER');

export interface ExpenseForStatement {
  id: string;
  propertyId: string | null;
  category: string;
  label: string;
  amount: bigint;
  vatAmount: bigint;
  totalAmount: bigint;
  expenseDate: Date;
}

export interface ExpenseReader {
  /**
   * Dépenses éligibles à un relevé (contrat, règle 6) : `APPROVED` ou
   * `PAID`, `borne_by = LANDLORD`, `is_deductible_from_rent = true`,
   * **`is_rebillable = false`** (arbitrage n°3 du contrat, § Dépenses : une
   * dépense refacturable part en ligne `REPAIR_REBILL` du locataire, jamais
   * dans le relevé du bailleur, pour ne pas la compter deux fois), et pas
   * déjà rattachées (`owner_statement_id IS NULL`) — un appel rejoué après
   * l'annulation d'un relevé (`detachFromStatement`) retrouve donc les
   * mêmes dépenses.
   *
   * `propertyId = null` : périmètre PORTEFEUILLE (mandat consolidé, voir
   * `mandates.service.ts`) — ne filtre pas sur `expenses.property_id`, donc
   * inclut toute dépense du bailleur dans la période, y compris celles sans
   * bien renseigné (rattachées seulement à un bail ou un lot). `propertyId`
   * fourni : ne matche que `expenses.property_id = propertyId` — une dépense
   * rattachée à un lot ou un bail sans `property_id` explicite n'est alors
   * PAS reprise ; à la charge de l'appelant de renseigner `property_id` sur
   * la dépense s'il veut qu'elle compte dans un relevé mono-bien.
   */
  findEligibleForStatement(
    tx: TenantClient,
    organizationId: string,
    landlordId: string,
    propertyId: string | null,
    periodStart: Date,
    periodEnd: Date,
  ): Promise<ExpenseForStatement[]>;

  /** Rattache définitivement les dépenses au relevé émis (contrat, règle 6). */
  attachToStatement(tx: TenantClient, expenseIds: string[], statementId: string): Promise<void>;

  /** Libère les dépenses d'un relevé annulé (contrat, § Machine à états, `CANCELLED`). */
  detachFromStatement(tx: TenantClient, statementId: string): Promise<void>;
}
