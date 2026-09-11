import '../../../portfolio/domain/entities/cached_result.dart';
import '../entities/lease_detail.dart';
import '../entities/lease_document.dart';
import '../entities/lease_status.dart';
import '../entities/lease_summary.dart';

/// Port d'accès en lecture seule aux baux, avec repli sur le cache local
/// Drift hors ligne (même principe que `PortfolioRepository`).
abstract interface class LeasesRepository {
  /// Liste des baux de l'organisation, filtrable par statut.
  Future<CachedResult<List<LeaseSummary>>> fetchLeases(
    String organizationId, {
    LeaseStatus? status,
  });

  /// Bail actif (`ACTIVE` ou `NOTICE_GIVEN`) rattaché à un lot, ou `null`
  /// s'il n'y en a aucun.
  Future<CachedResult<LeaseDetail?>> fetchActiveLeaseForUnit(
    String organizationId,
    String unitId,
  );

  /// Bail actif rattaché à un locataire (en tant que locataire principal),
  /// ou `null` s'il n'y en a aucun.
  Future<CachedResult<LeaseDetail?>> fetchActiveLeaseForTenant(
    String organizationId,
    String tenantId,
  );

  /// Détail complet d'un bail par identifiant.
  Future<CachedResult<LeaseDetail>> fetchLeaseDetail(
    String organizationId,
    String leaseId,
  );

  /// Versions de documents attachées au bail (contrat généré, contrat
  /// signé, etc.). Toujours en ligne, sans repli sur un cache local : en
  /// cas d'échec réseau, l'appelant affiche un message hors ligne clair.
  Future<List<LeaseDocument>> fetchLeaseDocuments(
    String organizationId,
    String leaseId,
  );
}
