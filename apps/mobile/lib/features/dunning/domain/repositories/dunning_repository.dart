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
  /// Lorsque [invoiceId] est fourni (ouverture depuis une facture précise
  /// de la tournée), l'appel filtre exactement par `invoiceId`. Sinon
  /// (ouverture depuis la fiche locataire), l'appel filtre par
  /// `tenantId` — le contrat expose désormais ce filtre côté serveur,
  /// voir `DunningRepositoryImpl`.
  Future<CachedResult<List<DunningRun>>> fetchHistoryForTenant({
    required String organizationId,
    required String tenantId,
    String? invoiceId,
  });
}
