import { foldSearchText } from '../../../shared/search/search-text';

/**
 * Mentions bancaires courantes retirées du libellé normalisé : mots-outils
 * du virement/versement, titres de civilité, formes juridiques.
 */
export const BANK_NOISE_WORDS = [
  'VIR',
  'VIREMENT',
  'VRST',
  'VERSEMENT',
  'DE',
  'DU',
  'PAR',
  'REF',
  'REFERENCE',
  'CHQ',
  'CHEQUE',
  'REMISE',
  'DEPOT',
  'RECU',
  'PAIEMENT',
  'LOYER',
  'MR',
  'MME',
  'M',
  'SARL',
  'SA',
  'ETS',
] as const;

const NOISE_SET = new Set<string>(BANK_NOISE_WORDS);

/**
 * Normalise le libellé brut d'une ligne de relevé pour le rapprochement
 * approximatif : majuscules, accents retirés (`foldSearchText`), ponctuation
 * supprimée, mentions bancaires courantes filtrées, espaces compactés.
 *
 * Persisté UNE SEULE FOIS à l'import (`bank_statement_lines.normalized_label`) :
 * c'est la seule implémentation autorisée, réutilisée telle quelle par le
 * moteur de rapprochement (lot 3).
 */
export function normalizeLabel(label: string): string {
  const folded = foldSearchText(label ?? '').toUpperCase();
  const withoutPunctuation = folded.replace(/[^A-Z0-9 ]+/g, ' ');
  const words = withoutPunctuation
    .split(/\s+/)
    .filter((word) => word.length > 0 && !NOISE_SET.has(word));
  return words.join(' ').trim();
}
