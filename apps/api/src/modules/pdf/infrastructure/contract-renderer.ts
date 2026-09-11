import { createHash } from 'node:crypto';
import Handlebars from 'handlebars';
import { formatXaf } from '../../../shared/money/amount';
import { OHADA_BLOCK, type ContractTemplate } from '../domain/contract-template';
import type { LeaseContractData } from '../domain/ports';
import { CONTRACT_HTML_TEMPLATE } from './contract-html';

/** Libellés français des énumérations imprimées dans le contrat. */
const UNIT_TYPE_LABELS: Record<string, string> = {
  STUDIO: 'studio',
  ROOM: 'chambre',
  APARTMENT: 'appartement',
  HOUSE: 'maison',
  SHOP: 'local commercial',
  OFFICE: 'bureau',
  WAREHOUSE: 'entrepôt',
  PARKING: 'place de stationnement',
  LAND_PLOT: 'parcelle',
  OTHER: 'local',
};

const RENT_PERIOD_LABELS: Record<string, string> = {
  MONTHLY: 'mensuel',
  QUARTERLY: 'trimestriel',
  SEMI_ANNUAL: 'semestriel',
  ANNUAL: 'annuel',
};

const PAYMENT_METHOD_LABELS: Record<string, string> = {
  CASH: 'espèces contre reçu',
  MOBILE_MONEY: 'Mobile Money',
  BANK_TRANSFER: 'virement bancaire',
  BANK_CHECK: 'chèque',
};

const PARTY_ROLE_LABELS: Record<string, string> = {
  PRIMARY_TENANT: 'Preneur principal',
  CO_TENANT: 'Co-locataire',
  GUARANTOR: 'Garant',
  OCCUPANT: 'Occupant déclaré',
};

/**
 * Moteur de rendu du contrat.
 *
 * Handlebars est compilé UNE FOIS : la compilation d'un gabarit de cette
 * taille coûte plus que le rendu lui-même, et le worker en enchaîne des
 * dizaines.
 *
 * `noEscape` reste à `false` : le contenu vient de saisies utilisateur
 * (nom du locataire, clauses personnalisées, conditions particulières), et
 * un nom contenant `<` doit s'imprimer tel quel, pas casser la mise en page.
 */
const compiled = Handlebars.compile(CONTRACT_HTML_TEMPLATE, { strict: false });

Handlebars.registerHelper('xaf', (value: unknown) => formatXaf(toBigInt(value)));
Handlebars.registerHelper('frDate', (value: unknown) => frenchDate(String(value ?? '')));

export interface RenderedContract {
  html: string;
  /**
   * SHA-256 du HTML SOURCE, date de génération exclue.
   *
   * POURQUOI PAS L'EMPREINTE DES OCTETS DU PDF — un PDF porte sa date de
   * création et un identifiant de document dans ses métadonnées : deux rendus
   * du même bail, à une seconde d'intervalle, produisent des octets
   * différents. Une empreinte calculée dessus ne prouverait donc rien. Celle
   * du HTML source, elle, ne change que si le CONTENU du contrat change —
   * c'est exactement ce que `lease_documents.signature_hash` doit attester.
   * L'empreinte des octets reste par ailleurs stockée dans
   * `documents.checksum_sha256`, pour vérifier l'intégrité du fichier stocké.
   */
  contentHash: string;
}

export function renderContract(
  data: LeaseContractData,
  template: ContractTemplate,
): RenderedContract {
  const html = compiled(buildViewModel(data, template));
  return { html, contentHash: createHash('sha256').update(html, 'utf8').digest('hex') };
}

/** Modèle de vue : tout est pré-calculé, le gabarit ne fait aucun calcul. */
function buildViewModel(
  data: LeaseContractData,
  template: ContractTemplate,
): Record<string, unknown> {
  const depositMonths =
    data.lease.rentAmount > 0n
      ? Number(
          (2n * data.lease.depositAmount + data.lease.rentAmount) / (2n * data.lease.rentAmount),
        )
      : 0;

  const otherParties = data.parties
    .filter((p) => p.role !== 'PRIMARY_TENANT')
    .map((p) => ({
      roleLabel: PARTY_ROLE_LABELS[p.role] ?? p.role,
      displayName: p.displayName,
      isSolidary: p.isSolidary,
      shareLabel: p.shareBps < 10_000 ? `${(p.shareBps / 100).toFixed(2)} %` : null,
    }));

  return {
    template,
    lease: data.lease,
    organization: data.organization,
    landlord: data.landlord,
    tenant: data.tenant,
    property: data.property,
    unit: data.unit,
    totalAmount: data.lease.rentAmount + data.lease.chargesAmount,
    depositMonths,
    unitTypeLabel: UNIT_TYPE_LABELS[data.unit.unitType] ?? 'local',
    rentPeriodLabel: RENT_PERIOD_LABELS[data.lease.rentPeriod] ?? 'mensuel',
    paymentMethodLabel:
      PAYMENT_METHOD_LABELS[data.lease.preferredPaymentMethod] ?? data.lease.preferredPaymentMethod,
    otherParties,
    hasOtherParties: otherParties.length > 0,
    clauses: template.optionalClauses.filter((clause) => clause.enabled),
    // Le bloc OHADA s'active soit par le paramétrage de l'organisation, soit
    // parce que le lot est commercial : un bail de boutique y est soumis,
    // que le gestionnaire y ait pensé ou non.
    showOhada: template.showOhadaBlock || data.isCommercial,
    ohada: OHADA_BLOCK,
  };
}

const FRENCH_MONTHS = [
  'janvier',
  'février',
  'mars',
  'avril',
  'mai',
  'juin',
  'juillet',
  'août',
  'septembre',
  'octobre',
  'novembre',
  'décembre',
];

/** `2026-06-01` → « 1er juin 2026 ». Aucun fuseau : c'est une date civile. */
export function frenchDate(iso: string): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso);
  if (!match) return iso;
  const [, year, month, day] = match;
  const dayNumber = Number(day);
  const label = dayNumber === 1 ? '1er' : String(dayNumber);
  return `${label} ${FRENCH_MONTHS[Number(month) - 1]} ${year}`;
}

function toBigInt(value: unknown): bigint {
  if (typeof value === 'bigint') return value;
  if (typeof value === 'number') return BigInt(Math.trunc(value));
  if (typeof value === 'string' && /^-?\d+$/.test(value)) return BigInt(value);
  return 0n;
}
