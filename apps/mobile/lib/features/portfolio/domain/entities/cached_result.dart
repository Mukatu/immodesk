/// Enveloppe un résultat de lecture de référentiel avec sa provenance :
/// réseau (frais) ou cache local Drift (hors ligne), avec la date de la
/// dernière copie connue pour afficher le bandeau « Données du … ».
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
