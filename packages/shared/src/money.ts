/**
 * Gestion des montants en Franc CFA BEAC (XAF).
 *
 * Le XAF n'a AUCUNE sous-unité : un montant est toujours un entier,
 * jamais de décimale. Toute tentative de formater ou parser une valeur
 * comportant une partie décimale doit lever une erreur explicite.
 */

/** Séparateur de milliers standard utilisé en sortie (espace normal U+0020). */
const THOUSANDS_SEPARATOR = String.fromCharCode(0x0020);

/** Suffixe de devise ajouté par `formatXaf`. */
const CURRENCY_SUFFIX = "XAF";

/**
 * Toutes les variantes d'espace tolérées en entrée par `parseXaf` comme
 * séparateur de milliers : espace normal (U+0020), espace insécable
 * (U+00A0) et espace fine insécable (U+202F, utilisée par certaines locales
 * pour le formatage des nombres, ex. Intl.NumberFormat en fr-FR/fr-CG).
 */
const TOLERATED_SEPARATOR_CODEPOINTS = [0x0020, 0x00a0, 0x202f];
const SEPARATOR_CHARS_PATTERN = new RegExp(
  `[${TOLERATED_SEPARATOR_CODEPOINTS.map((code) => String.fromCharCode(code)).join("")}]`,
  "g",
);

/**
 * Vérifie qu'un montant numérique ne comporte aucune décimale.
 * Lève une `Error` explicite si ce n'est pas le cas.
 */
function assertNoDecimal(amount: number): void {
  if (!Number.isFinite(amount)) {
    throw new Error(
      `Montant XAF invalide : "${amount}" n'est pas un nombre fini.`,
    );
  }
  if (!Number.isInteger(amount)) {
    throw new Error(
      `Montant XAF invalide : "${amount}" comporte une décimale. ` +
        "Le XAF ne possède aucune sous-unité, seuls les montants entiers sont autorisés.",
    );
  }
}

/**
 * Value object léger représentant un montant en XAF.
 * Optionnel : utilisable pour transporter un montant déjà validé.
 */
export type Money = {
  readonly amount: bigint;
  readonly currency: "XAF";
};

/**
 * Formate un montant en XAF avec un séparateur de milliers (espace)
 * et le suffixe " XAF".
 *
 * @throws {Error} si `amount` est un `number` non entier (décimale interdite pour le XAF).
 */
export function formatXaf(amount: number | bigint): string {
  let integerAmount: bigint;

  if (typeof amount === "bigint") {
    integerAmount = amount;
  } else {
    assertNoDecimal(amount);
    integerAmount = BigInt(amount);
  }

  const negative = integerAmount < 0n;
  const digits = (negative ? -integerAmount : integerAmount).toString();

  let grouped = "";
  for (let i = 0; i < digits.length; i += 1) {
    const positionFromEnd = digits.length - i;
    grouped += digits[i];
    const isGroupBoundary = positionFromEnd > 1 && (positionFromEnd - 1) % 3 === 0;
    if (isGroupBoundary) {
      grouped += THOUSANDS_SEPARATOR;
    }
  }

  return `${negative ? "-" : ""}${grouped} ${CURRENCY_SUFFIX}`;
}

/**
 * Parse une chaîne formatée en XAF vers son montant entier.
 * Tolère les espaces classiques, insécables (U+00A0) et fines insécables
 * (U+202F) comme séparateurs de milliers, ainsi qu'un suffixe optionnel " XAF".
 *
 * @throws {Error} si la chaîne comporte une décimale ou n'est pas parseable.
 */
export function parseXaf(formatted: string): number {
  const withoutCurrency = formatted
    .trim()
    .replace(/\s*XAF\s*$/i, "")
    .trim();

  const withoutSeparators = withoutCurrency.replace(SEPARATOR_CHARS_PATTERN, "");

  if (withoutSeparators.length === 0) {
    throw new Error(`Montant XAF invalide : "${formatted}" est vide ou non parseable.`);
  }

  if (/[.,]/.test(withoutSeparators)) {
    throw new Error(
      `Montant XAF invalide : "${formatted}" comporte une décimale. ` +
        "Le XAF ne possède aucune sous-unité, seuls les montants entiers sont autorisés.",
    );
  }

  if (!/^-?\d+$/.test(withoutSeparators)) {
    throw new Error(`Montant XAF invalide : "${formatted}" n'est pas un nombre parseable.`);
  }

  const parsed = Number(withoutSeparators);
  assertNoDecimal(parsed);

  return parsed;
}

export { assertNoDecimal };
