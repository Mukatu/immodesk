/**
 * Consultation d'un travail d'export produit par un AUTRE module que
 * `reporting`.
 *
 * POURQUOI CE PORT EXISTE. Le contrat de la phase 11 (arbitrage 17) impose
 * que les exports de conformité se suivent par `GET /v1/exports/jobs/{jobId}`
 * — la route de la phase 9 — et **par aucune autre** : ouvrir une route de
 * suivi jumelle sous un préfixe de confidentialité ferait deux chemins pour
 * une même chose. Mais le module `privacy` produit une archive ZIP
 * multi-tables, pas le CSV unique de la phase 9 : sa file BullMQ est donc
 * distincte, et `reporting` ignore ses identifiants de travaux.
 *
 * Sans ce port, les `202 { jobId }` des exports de réversibilité renvoyaient
 * des identifiants intraçables : la fonctionnalité était livrée à moitié.
 *
 * Le sens de dépendance est délibéré : `reporting` ne connaît AUCUN module
 * producteur. Il consomme un jeton déclaré ici, dans `shared`, que tout module
 * peut alimenter. `privacy` s'y enregistre ; demain un autre le pourra sans
 * qu'une ligne de `reporting` ne change.
 */
export const EXPORT_STATUS_FALLBACKS = Symbol('EXPORT_STATUS_FALLBACKS');

/** Vue minimale commune aux files d'export, quel que soit le module. */
export interface FallbackExportJobView {
  /** Vérifiée par l'appelant : un identifiant de job ne traverse pas les organisations. */
  organizationId: string;
  status: 'QUEUED' | 'ACTIVE' | 'COMPLETED' | 'FAILED';
  result?: {
    documentId: string;
    downloadUrl: string;
    expiresAt: string;
    rowCount: number;
  };
  error?: string;
}

export interface ExportStatusFallback {
  status(jobId: string): Promise<FallbackExportJobView | null>;
}
