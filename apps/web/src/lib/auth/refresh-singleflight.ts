/**
 * Mutualisation des rafraîchissements côté BFF (processus Node).
 *
 * Le refresh token tourne à chaque usage côté API : deux requêtes portant le même cookie
 * (onglets multiples, requêtes parallèles) ne doivent produire qu'UN appel amont, sinon la
 * seconde présente un jeton déjà consommé (401, voire révocation de la famille). Le résultat
 * est conservé quelques secondes pour les requêtes parties avant l'application du nouveau
 * cookie ; au-delà, un jeton consommé est de nouveau traité comme une réutilisation.
 */

const RESULT_TTL_MS = 10_000;

interface Entry<T> {
  promise: Promise<T>;
  expiresAt: number;
}

const entries = new Map<string, Entry<unknown>>();

export function singleFlightRefresh<T>(key: string, run: () => Promise<T>): Promise<T> {
  const now = Date.now();
  for (const [k, entry] of entries) {
    if (entry.expiresAt <= now) entries.delete(k);
  }
  const existing = entries.get(key) as Entry<T> | undefined;
  if (existing) return existing.promise;

  const promise = run();
  entries.set(key, { promise, expiresAt: Number.POSITIVE_INFINITY });
  const settle = () => {
    const entry = entries.get(key);
    if (entry) entry.expiresAt = Date.now() + RESULT_TTL_MS;
  };
  promise.then(settle, () => entries.delete(key));
  return promise;
}
