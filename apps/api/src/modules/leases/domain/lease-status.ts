import { DomainError } from '../../../shared/errors/domain-error';

/** Énumération SQL `lease_status` (docs/schema/schema.sql, partie 01). */
export const LEASE_STATUSES = [
  'DRAFT',
  'PENDING_SIGNATURE',
  'ACTIVE',
  'NOTICE_GIVEN',
  'TERMINATED',
  'EXPIRED',
  'CANCELLED',
] as const;
export type LeaseStatus = (typeof LEASE_STATUSES)[number];

/** Énumération SQL `rent_period`. */
export const RENT_PERIODS = ['MONTHLY', 'QUARTERLY', 'SEMI_ANNUAL', 'ANNUAL'] as const;
export type RentPeriod = (typeof RENT_PERIODS)[number];

/** Énumération SQL `lease_party_role`. */
export const LEASE_PARTY_ROLES = ['PRIMARY_TENANT', 'CO_TENANT', 'GUARANTOR', 'OCCUPANT'] as const;
export type LeasePartyRole = (typeof LEASE_PARTY_ROLES)[number];

/** Énumération SQL `lease_document_kind`. */
export const LEASE_DOCUMENT_KINDS = [
  'CONTRACT',
  'AMENDMENT',
  'NOTICE',
  'TERMINATION',
  'INVENTORY',
  'INSURANCE',
  'OTHER',
] as const;
export type LeaseDocumentKind = (typeof LEASE_DOCUMENT_KINDS)[number];

/** Énumération SQL `payment_method`. */
export const PAYMENT_METHODS = ['CASH', 'MOBILE_MONEY', 'BANK_TRANSFER', 'BANK_CHECK'] as const;
export type PaymentMethod = (typeof PAYMENT_METHODS)[number];

/**
 * Déclencheur d'une transition : qui la provoque, et dans quelles
 * circonstances. Le nom est repris tel quel dans `audit_logs`.
 */
export type LeaseTransitionTrigger =
  | 'SUBMIT_FOR_SIGNATURE'
  | 'ACTIVATE'
  | 'CANCEL'
  | 'GIVE_NOTICE'
  | 'TERMINATE'
  | 'EXPIRE'
  | 'CLOSE_NOTICE';

export interface LeaseTransition {
  from: LeaseStatus;
  to: LeaseStatus;
  trigger: LeaseTransitionTrigger;
  /** `true` lorsque seule la tâche de fond quotidienne peut la déclencher. */
  automatic: boolean;
  description: string;
}

/**
 * TABLE DES TRANSITIONS — la machine à états du bail, en clair.
 *
 * Elle est déclarative et exhaustive : toute transition absente d'ici est
 * refusée. C'est la seule source de vérité ; aucun `if (status === ...)`
 * dispersé dans les services ne doit la doubler, sous peine de voir les deux
 * diverger à la première évolution.
 *
 *   DRAFT ──SUBMIT_FOR_SIGNATURE──▶ PENDING_SIGNATURE ──ACTIVATE──▶ ACTIVE
 *     │                                     │                          │
 *     └──────────ACTIVATE────────────────────┘             GIVE_NOTICE  │  TERMINATE
 *     │                                     │                    ▼      ▼
 *     └──CANCEL──▶ CANCELLED ◀──CANCEL──────┘              NOTICE_GIVEN ─▶ TERMINATED
 *                                                                 │
 *                                       ACTIVE ──EXPIRE──▶ EXPIRED │ CLOSE_NOTICE
 *                                                                  ▼
 *                                                             TERMINATED
 *
 * TERMINATED, EXPIRED et CANCELLED sont TERMINAUX : un bail clos ne
 * redevient jamais actif. Reprendre une location avec le même locataire sur
 * le même lot, c'est un NOUVEAU bail — le contraire effacerait la trace du
 * précédent, dont dépendent les quittances et le dépôt de garantie.
 */
export const LEASE_TRANSITIONS: readonly LeaseTransition[] = [
  {
    from: 'DRAFT',
    to: 'PENDING_SIGNATURE',
    trigger: 'SUBMIT_FOR_SIGNATURE',
    automatic: false,
    description: 'Bail prêt, en attente de signature des parties.',
  },
  {
    from: 'DRAFT',
    to: 'ACTIVE',
    trigger: 'ACTIVATE',
    automatic: false,
    description: 'Activation directe : le lot est occupé, le dépôt est appelé.',
  },
  {
    from: 'PENDING_SIGNATURE',
    to: 'ACTIVE',
    trigger: 'ACTIVATE',
    automatic: false,
    description: 'Activation après signature.',
  },
  {
    from: 'DRAFT',
    to: 'CANCELLED',
    trigger: 'CANCEL',
    automatic: false,
    description: 'Abandon avant toute prise d’effet.',
  },
  {
    from: 'PENDING_SIGNATURE',
    to: 'CANCELLED',
    trigger: 'CANCEL',
    automatic: false,
    description: 'Signature non obtenue : le bail est abandonné.',
  },
  {
    from: 'ACTIVE',
    to: 'NOTICE_GIVEN',
    trigger: 'GIVE_NOTICE',
    automatic: false,
    description: 'Préavis déposé, à effet futur.',
  },
  {
    from: 'ACTIVE',
    to: 'TERMINATED',
    trigger: 'TERMINATE',
    automatic: false,
    description: 'Résiliation immédiate.',
  },
  {
    from: 'NOTICE_GIVEN',
    to: 'TERMINATED',
    trigger: 'TERMINATE',
    automatic: false,
    description: 'Résiliation anticipée pendant le préavis.',
  },
  {
    from: 'NOTICE_GIVEN',
    to: 'TERMINATED',
    trigger: 'CLOSE_NOTICE',
    automatic: true,
    description: 'Le préavis arrive à son terme : bascule par le cron quotidien.',
  },
  {
    from: 'ACTIVE',
    to: 'EXPIRED',
    trigger: 'EXPIRE',
    automatic: true,
    description: 'Terme atteint sans reconduction : bascule par le cron quotidien.',
  },
];

/** États depuis lesquels plus aucune transition n'est possible. */
export const TERMINAL_LEASE_STATUSES: readonly LeaseStatus[] = [
  'TERMINATED',
  'EXPIRED',
  'CANCELLED',
];

/** États pour lesquels le lot est réputé occupé et l'anti-chevauchement actif. */
export const OCCUPYING_LEASE_STATUSES: readonly LeaseStatus[] = ['ACTIVE', 'NOTICE_GIVEN'];

/** États depuis lesquels le bail est encore librement modifiable. */
export const EDITABLE_LEASE_STATUSES: readonly LeaseStatus[] = ['DRAFT', 'PENDING_SIGNATURE'];

export function findTransition(
  from: LeaseStatus,
  trigger: LeaseTransitionTrigger,
): LeaseTransition | undefined {
  return LEASE_TRANSITIONS.find((t) => t.from === from && t.trigger === trigger);
}

export function canTransition(from: LeaseStatus, to: LeaseStatus): boolean {
  return LEASE_TRANSITIONS.some((t) => t.from === from && t.to === to);
}

/** Cibles atteignables depuis un état, sans doublon, dans l'ordre de la table. */
export function allowedTargets(from: LeaseStatus): LeaseStatus[] {
  return [...new Set(LEASE_TRANSITIONS.filter((t) => t.from === from).map((t) => t.to))];
}

/**
 * Vérifie une transition et renvoie sa description, ou lève
 * `409 LEASES.INVALID_TRANSITION` avec `details.from` et `details.to`,
 * comme l'impose le contrat de la phase 2.
 */
export function assertTransition(
  from: LeaseStatus,
  trigger: LeaseTransitionTrigger,
  to: LeaseStatus,
): LeaseTransition {
  const transition = LEASE_TRANSITIONS.find(
    (t) => t.from === from && t.trigger === trigger && t.to === to,
  );
  if (!transition) {
    throw new DomainError('LEASES.INVALID_TRANSITION', {
      from,
      to,
      trigger,
      allowed: allowedTargets(from),
    });
  }
  return transition;
}
