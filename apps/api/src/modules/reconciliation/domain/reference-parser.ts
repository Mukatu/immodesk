/**
 * Extraction de la référence structurée d'une facture de loyer
 * (`LOY-{YYYYMM}-{seq}`, `numbering/domain/sequence-kind.ts`,
 * `SEQUENCE_FORMATS.RENT_INVOICE`) depuis un texte libre : libellé de ligne
 * de relevé ou référence de bout en bout (docs/api/phase6-contract.md,
 * § « Moteur de rapprochement », règle EXACT).
 *
 * Variante compacte acceptée (sans tirets, casse indifférente) : un opérateur
 * de saisie ou un système bancaire tiers ne respecte pas toujours la
 * ponctuation exacte du numéro affiché au locataire.
 */
export const INVOICE_REFERENCE_PATTERN = /LOY-?(\d{6})-?(\d{5,})/gi;

/**
 * Renvoie les références trouvées, normalisées sous la forme canonique
 * `LOY-YYYYMM-NNNNN` (compteur complété à 5 chiffres), dans l'ordre de
 * première apparition et sans doublon. Ni le mois ni le compteur ne sont
 * validés au-delà de leur forme (ce n'est pas ici que l'on sait si la
 * facture existe) : la recherche de la facture correspondante, si elle a
 * lieu, se fait plus haut.
 */
export function extractInvoiceReferences(text: string | null | undefined): string[] {
  if (!text) return [];
  const pattern = new RegExp(INVOICE_REFERENCE_PATTERN.source, INVOICE_REFERENCE_PATTERN.flags);
  const found: string[] = [];
  const seen = new Set<string>();
  let match: RegExpExecArray | null;
  while ((match = pattern.exec(text)) !== null) {
    const period = match[1];
    const counter = match[2].padStart(5, '0');
    const canonical = `LOY-${period}-${counter}`;
    if (!seen.has(canonical)) {
      seen.add(canonical);
      found.push(canonical);
    }
    // Une correspondance vide (impossible ici, les deux groupes exigent des
    // chiffres) bloquerait `exec` en boucle infinie ; gardé par sécurité.
    if (match[0].length === 0) pattern.lastIndex += 1;
  }
  return found;
}

/**
 * Vrai si au moins une référence structurée commune existe entre le libellé
 * et la référence de bout en bout d'une ligne (règle EXACT : la référence
 * peut être portée par l'un OU l'autre).
 */
export function hasStructuredReference(
  label: string | null,
  endToEndReference: string | null,
): boolean {
  return (
    extractInvoiceReferences(label).length > 0 ||
    extractInvoiceReferences(endToEndReference).length > 0
  );
}
