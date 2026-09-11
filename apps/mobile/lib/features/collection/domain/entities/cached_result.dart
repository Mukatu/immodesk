/// Enveloppe un résultat de lecture avec sa provenance : réseau (frais) ou
/// cache local Drift (hors ligne), avec la date de la dernière copie
/// connue pour afficher le bandeau « Données du … ». Même forme que
/// `PortfolioRepositoryImpl`/`CachedResult` (dupliquée ici pour garder la
/// feature `collection` indépendante de `portfolio`).
class CachedResult<T> {
  const CachedResult({
    required this.data,
    required this.isFromCache,
    this.cachedAt,
  });

  final T data;
  final bool isFromCache;
  final DateTime? cachedAt;
}
