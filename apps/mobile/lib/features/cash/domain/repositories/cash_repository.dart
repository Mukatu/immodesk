import '../entities/cash_receipt_summary.dart';
import '../entities/collector_balance.dart';
import '../entities/remittance_summary.dart';

/// Port d'accès à la caisse du démarcheur : encours, reçus non remis,
/// remises.
abstract interface class CashRepository {
  Future<CollectorBalance> fetchCollectorBalance({
    required String organizationId,
    required String userId,
  });

  /// Reçus de caisse du démarcheur courant. Pour un `COLLECTOR`, l'API
  /// restreint déjà le résultat à ses propres reçus.
  Future<List<CashReceiptSummary>> fetchMyCashReceipts(String organizationId);

  Future<List<RemittanceSummary>> fetchMyRemittances(String organizationId);

  /// Crée une remise soumise directement (`POST /v1/cash-remittances`,
  /// `submit` non précisé = `SUBMITTED`). Idempotent par `clientRef`.
  Future<RemittanceSummary> createRemittance({
    required String organizationId,
    required List<String> cashReceiptIds,
    required int declaredAmount,
    Map<String, int>? denominations,
    required String clientRef,
  });
}
