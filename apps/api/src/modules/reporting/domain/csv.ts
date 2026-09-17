/**
 * Sérialisation CSV des exports (contrat phase 9, arbitrage 5) :
 *
 * - séparateur POINT-VIRGULE (paramètres régionaux francophones d'Excel,
 *   où la virgule décimale rend la virgule impropre à séparer des colonnes) ;
 * - BOM UTF-8 en tête de fichier, pour qu'Excel détecte l'encodage sans que
 *   l'utilisateur ait à l'indiquer à l'import ;
 * - fin de ligne CRLF, convention native d'Excel sous Windows.
 *
 * Domaine pur : aucune dépendance Nest, Prisma ni système de fichiers.
 */

const SEPARATOR = ';';
const LINE_BREAK = '\r\n';
/** BOM UTF-8 (U+FEFF), qui fait détecter l'encodage sans configuration côté Excel. */
export const CSV_BOM = '﻿';

export type CsvCell = string | number | boolean | null | undefined;

/**
 * Échappe un champ pour le format CSV : entre guillemets dès qu'il contient
 * le séparateur, un guillemet ou un saut de ligne, les guillemets internes
 * étant doublés (RFC 4180). Un nom de locataire tel que `Ngoma ; "Le Sage"`
 * doit rester une seule colonne à la relecture.
 */
export function csvEscape(cell: CsvCell): string {
  if (cell === null || cell === undefined) return '';
  const text = typeof cell === 'boolean' ? (cell ? 'true' : 'false') : String(cell);
  if (text.includes(SEPARATOR) || text.includes('"') || /[\r\n]/.test(text)) {
    return `"${text.replace(/"/g, '""')}"`;
  }
  return text;
}

export function toCsvRow(cells: readonly CsvCell[]): string {
  return cells.map(csvEscape).join(SEPARATOR);
}

/**
 * Fichier CSV complet, BOM compris : en-tête, lignes, terminé par une fin de
 * ligne (convention Unix/Excel pour le dernier enregistrement).
 */
export function toCsvDocument(header: readonly string[], rows: readonly CsvCell[][]): string {
  const lines = [toCsvRow(header), ...rows.map(toCsvRow)];
  return CSV_BOM + lines.join(LINE_BREAK) + LINE_BREAK;
}

/** Montant XAF en entier, sans séparateur de milliers (contrat, arbitrage 5). */
export function csvAmount(value: number | bigint): string {
  return typeof value === 'bigint' ? value.toString(10) : Math.trunc(value).toString(10);
}
