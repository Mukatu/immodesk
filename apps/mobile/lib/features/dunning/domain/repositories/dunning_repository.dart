import '../entities/cached_result.dart';
import '../entities/dunning_run.dart';

/// Accès en lecture seule à l'historique des relances déjà envoyées
/// (`GET /v1/dunning-runs`, `docs/api/phase9-contract.md`). Aucune méthode
/// d'écriture : la configuration des paliers et des pénalités reste un
/// écran web.
abstract interface class DunningRepository {
  /// Historique des relances d'un locataire, trié du plus récent (date
  /// d'exécution, ou d'échéance planifiée si non encore exécutée) au plus
  /// ancien.
  ///
  /// Le contrat ne porte pas de filtre par locataire sur cette route.
  /// Lorsque [invoiceId] est fourni (ouverture depuis une facture précise
  /// de la tournée), un seul appel exact au filtre `invoiceId` suffit.
  /// Sinon (ouverture depuis la fiche locataire), l'implémentation
  /// parcourt un nombre borné de pages et filtre côté mobile par
  /// `tenant.id` — voir `DunningRepositoryImpl`.
  Future<CachedResult<List<DunningRun>>> fetchHistoryForTenant({
    required String organizationId,
    required String tenantId,
    String? invoiceId,
  });
}
