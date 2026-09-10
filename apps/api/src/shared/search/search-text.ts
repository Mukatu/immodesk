/**
 * Recherche plein texte simple, insensible à la casse ET aux accents.
 *
 * DÉCISION (phase 1) : l'extension `unaccent` n'est pas installée sur la base
 * — elle exige un `CREATE EXTENSION` privilégié que le rôle applicatif n'a pas
 * et qu'on ne veut pas rendre obligatoire pour déployer. Le repli est un
 * `translate()` PostgreSQL, fonction du cœur, disponible partout :
 *
 *     translate(lower(colonne), '<accentues>', '<ascii>') LIKE '%' || $1 || '%'
 *
 * Le terme recherché est plié côté application par `foldSearchText()` (NFD +
 * suppression des diacritiques + minuscules) de sorte que les deux côtés de la
 * comparaison utilisent exactement la même table de correspondance. Les
 * ligatures (oe, ae) sont dépliées côté application uniquement : `translate()`
 * ne sait pas remplacer un caractère par deux. Elles restent donc trouvables
 * en saisissant la forme dépliée, ce qui est le cas d'usage réel.
 *
 * Ce choix est assumé : sur les volumes de la phase 1 (quelques milliers de
 * tiers par organisation), un `LIKE` avec pliage est instantané. Le jour où il
 * ne le sera plus, l'index attendu est un GIN trigramme sur la même expression
 * `translate(lower(...))` — la requête n'aura pas à changer.
 */

/** Caractères accentués reconnus, en minuscules. */
export const SQL_ACCENTED_CHARS = 'àáâãäåçèéêëìíîïñòóôõöøùúûüýÿ';

/** Équivalents ASCII, dans le MÊME ordre et le MÊME nombre. */
export const SQL_PLAIN_CHARS = 'aaaaaaceeeeiiiinoooooouuuuyy';

/**
 * Bloc Unicode des diacritiques combinants (U+0300 à U+036F) produits par la
 * décomposition NFD. Construit par code plutôt qu'écrit en clair : ces
 * caractères sont invisibles dans un éditeur et se perdent au copier-coller.
 */
const COMBINING_MARKS = new RegExp(
  `[${String.fromCharCode(0x0300)}-${String.fromCharCode(0x036f)}]`,
  'g',
);

/** Ligatures dépliées côté application (impossible en `translate`). */
const LIGATURES: ReadonlyArray<[RegExp, string]> = [
  [/œ/g, 'oe'],
  [/æ/g, 'ae'],
  [/ß/g, 'ss'],
];

/**
 * Plie un texte pour la comparaison : minuscules, sans diacritique, espaces
 * compactés. « Résidence  MPILA » devient `residence mpila`.
 */
export function foldSearchText(value: string): string {
  let folded = value.normalize('NFD').replace(COMBINING_MARKS, '').toLowerCase();
  for (const [pattern, replacement] of LIGATURES) {
    folded = folded.replace(pattern, replacement);
  }
  return folded.replace(/\s+/g, ' ').trim();
}

/**
 * Prépare le motif `LIKE` d'un terme de recherche : plié puis échappé.
 * Les `%` et `_` saisis par l'utilisateur sont neutralisés (`ESCAPE '\'`),
 * sans quoi une recherche sur « % » ramènerait toute la table.
 */
export function toLikePattern(raw: string): string {
  const folded = foldSearchText(raw);
  const escaped = folded.replace(/[\\%_]/g, (c) => `\\${c}`);
  return `%${escaped}%`;
}

/**
 * Fragment SQL pliant une colonne pour la comparaison.
 * `sqlFold('l.last_name')` devient `translate(lower(coalesce(l.last_name, '')), ...)`.
 *
 * L'appelant fournit une expression de colonne CONSTRUITE PAR LE CODE, jamais
 * une entrée utilisateur : le terme recherché passe, lui, par un paramètre lié.
 */
export function sqlFold(columnExpression: string): string {
  return `translate(lower(coalesce(${columnExpression}, '')), '${SQL_ACCENTED_CHARS}', '${SQL_PLAIN_CHARS}')`;
}

/**
 * Construit la condition `q` sur plusieurs colonnes :
 * `(fold(a) LIKE $n ESCAPE '\' OR fold(b) LIKE $n ESCAPE '\')`.
 */
export function sqlSearchClause(columnExpressions: readonly string[], placeholder: string): string {
  const parts = columnExpressions.map((c) => `${sqlFold(c)} LIKE ${placeholder} ESCAPE '\\'`);
  return `(${parts.join(' OR ')})`;
}
