import type { TenantClient } from '../../../shared/prisma/prisma.service';

/**
 * Ports du module `pdf`, implémentés par `leases`.
 *
 * Le sens des dépendances est `pdf → leases` et jamais l'inverse : le module
 * de rendu lit un bail et réclame l'archivage d'une version, mais `leases`
 * ignore tout de Puppeteer. C'est ce qui permet de faire tourner l'API sans
 * navigateur — le worker se désactive seul — sans que le cycle de vie du bail
 * en souffre.
 */
export const LEASE_CONTRACT_SOURCE = Symbol('LEASE_CONTRACT_SOURCE');
export const LEASE_DOCUMENT_WRITER = Symbol('LEASE_DOCUMENT_WRITER');

/** Données nécessaires au rendu du contrat, déjà mises en forme. */
export interface LeaseContractData {
  lease: {
    id: string;
    reference: string | null;
    status: string;
    startDate: string;
    endDate: string | null;
    moveInDate: string | null;
    rentPeriod: string;
    rentAmount: bigint;
    chargesAmount: bigint;
    chargesAreProvisional: boolean;
    depositAmount: bigint;
    agencyFeeAmount: bigint;
    advanceMonths: number;
    paymentDueDay: number;
    graceDays: number;
    noticeDays: number;
    preferredPaymentMethod: string;
    notes: string | null;
  };
  organization: {
    legalName: string;
    tradeName: string | null;
    city: string;
    rccmNumber: string | null;
  };
  landlord: { displayName: string; primaryPhone: string; addressLine: string | null };
  tenant: { displayName: string; primaryPhone: string; idDocumentNumber: string | null };
  property: { name: string; addressLine: string; district: string; city: string };
  unit: { code: string; label: string | null; unitType: string; roomsCount: number | null };
  parties: Array<{ role: string; displayName: string; shareBps: number; isSolidary: boolean }>;
  isCommercial: boolean;
}

export interface LeaseContractSource {
  /** Lit le bail et son entourage dans la transaction courante. */
  loadContractData(tx: TenantClient, leaseId: string): Promise<LeaseContractData>;
}

export interface LeaseContractVersionInput {
  leaseId: string;
  documentId: string;
  signatureHash: string;
  generatedByJob: string;
  reference: string | null;
}

export interface LeaseDocumentWriter {
  /**
   * Archive une version de contrat : `version = max + 1` pour ce bail et ce
   * type. Une version déjà écrite n'est jamais modifiée.
   */
  attachContractVersion(
    tx: TenantClient,
    organizationId: string,
    input: LeaseContractVersionInput,
  ): Promise<{ id: string; version: number }>;
}
