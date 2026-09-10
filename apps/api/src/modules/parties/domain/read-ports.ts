import type { TenantClient } from '../../../shared/prisma/prisma.service';

/**
 * Ports de LECTURE vers les autres modules de la phase 1.
 *
 * Les fiches détaillées du contrat agrègent des données que `parties` ne
 * possède pas : les biens d'un bailleur (module `portfolio`), ses comptes de
 * règlement (`banking`), les pièces jointes d'un locataire (`documents`).
 *
 * Plutôt que d'aller lire ces tables directement — ce qui ferait de `parties`
 * le copropriétaire de fait de la moitié du schéma — la composition passe par
 * des interfaces minimales, implémentées par les modules propriétaires. Le
 * sens des dépendances reste `portfolio → parties`, jamais l'inverse : c'est
 * `PartyDetailsService`, et lui seul, qui consomme ces ports, si bien
 * qu'aucun cycle de constructeur n'apparaît.
 *
 * Les trois sont injectés en `@Optional()` : un contexte réduit (test unitaire,
 * outil hors ligne) doit pouvoir instancier `parties` seul.
 */
export const PROPERTY_READER = Symbol('PROPERTY_READER');
export const BANK_ACCOUNT_READER = Symbol('BANK_ACCOUNT_READER');
export const DOCUMENT_READER = Symbol('DOCUMENT_READER');

export interface PropertyReader {
  /** Biens vivants d'un bailleur, avec leur taux d'occupation. */
  listSummariesForLandlord(tx: TenantClient, landlordId: string): Promise<unknown[]>;
}

export interface BankAccountReader {
  /** Comptes de règlement rattachés à un bailleur. */
  listForLandlord(tx: TenantClient, landlordId: string): Promise<unknown[]>;
}

export interface DocumentReader {
  /** Pièces jointes vivantes d'une entité (`tenant`, `unit`, ...). */
  listFor(tx: TenantClient, relatedEntityType: string, relatedEntityId: string): Promise<unknown[]>;
}
