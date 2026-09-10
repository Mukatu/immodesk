import '../entities/cached_result.dart';
import '../entities/property_detail.dart';
import '../entities/property_summary.dart';
import '../entities/tenant.dart';
import '../entities/unit_detail.dart';

/// Port d'accès en lecture seule au portefeuille (immeubles, lots,
/// locataires), avec repli sur le cache local Drift hors ligne.
abstract interface class PortfolioRepository {
  Future<CachedResult<List<PropertySummary>>> fetchProperties(
    String organizationId,
  );

  /// Hors ligne, reconstitue une version dégradée à partir du résumé et
  /// des lots mis en cache (occupancy connue, mais adresse complète
  /// possiblement absente si jamais consultée en ligne).
  Future<CachedResult<PropertyDetail>> fetchPropertyDetail(
    String organizationId,
    String propertyId,
  );

  /// Hors ligne, ne peut renvoyer un résultat que si ce lot précis a déjà
  /// été mis en cache (ouverture d'un immeuble ou de ce lot en ligne).
  Future<CachedResult<UnitDetail>> fetchUnitDetail(
    String organizationId,
    String unitId,
  );

  Future<CachedResult<List<Tenant>>> fetchTenants(String organizationId);
}
