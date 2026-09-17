import { ApiError, genericErrorMessage } from '@/lib/api/errors';

/**
 * Messages fr-CG pour les codes d'erreur propres à la phase 8 (arbitrages du
 * contrat) : un état des lieux signé est figé, la photo devient obligatoire
 * dès POOR/DAMAGED/MISSING, une seule retenue par poste, solde du dépôt
 * insuffisant. Les autres codes retombent sur le message renvoyé par l'API.
 */
const INSPECTION_ERROR_MESSAGES: Record<string, string> = {
  'INSPECTIONS.LOCKED':
    "Cet état des lieux est signé et figé : aucun ajout, modification ou suppression n'est possible.",
  'INSPECTIONS.PHOTO_REQUIRED':
    'Une photo est obligatoire pour chaque poste en mauvais état, dégradé ou manquant avant de signer.',
  'INSPECTIONS.DEDUCTION_ALREADY_APPLIED': 'Une retenue a déjà été appliquée pour ce poste.',
  'DEPOSITS.INSUFFICIENT_BALANCE':
    'Le solde du dépôt de garantie est insuffisant pour appliquer cette retenue.',
};

/** Traduit une erreur applicative en message fr-CG affichable, avec repli générique. */
export function inspectionErrorMessage(err: unknown): string {
  if (err instanceof ApiError) {
    return INSPECTION_ERROR_MESSAGES[err.code] ?? err.message;
  }
  return genericErrorMessage;
}
