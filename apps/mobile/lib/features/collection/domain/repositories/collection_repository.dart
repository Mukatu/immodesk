import '../entities/cached_result.dart';
import '../entities/cash_receipt_result.dart';
import '../entities/invoice_summary.dart';

/// Port d'accès aux factures dues du démarcheur (tournée de collecte) et à
/// l'encaissement en espèces.
abstract interface class CollectionRepository {
  /// Factures dues (émises, partiellement réglées ou en retard) pour
  /// l'organisation courante. Pour un `COLLECTOR`, l'API restreint déjà le
  /// résultat à ses lots affectés. Tente le réseau puis écrit le cache
  /// local (`CachedInvoices`) ; en cas d'échec réseau, replie sur la
  /// dernière copie connue (lecture seule — jamais utilisée pour
  /// encaisser, voir `EncaissementController`).
  Future<CachedResult<List<InvoiceSummary>>> fetchDueInvoices(
    String organizationId,
  );

  /// Crée un reçu de caisse (`POST /v1/cash-receipts`). Idempotent par
  /// `clientRef` : un rejeu avec le même `clientRef` renvoie la réponse
  /// d'origine sans créer de second encaissement.
  Future<CashReceiptResult> createCashReceipt({
    required String organizationId,
    required String tenantId,
    String? leaseId,
    required int amount,
    List<Map<String, Object?>>? allocations,
    String? signatureDataUrl,
    String? paperReceiptDocumentId,
    required String clientRef,
  });

  /// Renvoie le reçu au locataire (WhatsApp puis repli SMS par défaut,
  /// `POST /v1/cash-receipts/{id}/send`).
  Future<void> sendCashReceipt({
    required String organizationId,
    required String cashReceiptId,
  });
}
