import '../../../../core/db/app_database.dart';
import '../../../../core/network/api_exception.dart';
import '../../domain/entities/cached_result.dart';
import '../../domain/entities/cash_receipt_result.dart';
import '../../domain/entities/invoice_status.dart';
import '../../domain/entities/invoice_summary.dart';
import '../../domain/repositories/collection_repository.dart';
import '../collection_cache_mapper.dart';
import '../datasources/collection_remote_data_source.dart';

/// Lecture réseau des factures dues avec écriture systématique du cache
/// local (`CachedInvoices`) en cas de succès, et repli sur la dernière
/// copie en cas d'échec réseau — même stratégie que
/// `PortfolioRepositoryImpl` (lecture seule : ce cache n'est jamais utilisé
/// pour encaisser, voir `EncaissementController`).
class CollectionRepositoryImpl implements CollectionRepository {
  CollectionRepositoryImpl(this._remote, this._db);

  final CollectionRemoteDataSource _remote;
  final AppDatabase _db;

  bool _isNetworkError(ApiException e) => e.code.startsWith('NETWORK.');

  @override
  Future<CachedResult<List<InvoiceSummary>>> fetchDueInvoices(
    String organizationId,
  ) async {
    try {
      final List<InvoiceSummary> items = await _remote.fetchInvoices(
        organizationId,
      );
      final List<InvoiceSummary> due = items
          .where((invoice) => invoice.status.isDue)
          .toList();
      await _db.replaceCachedInvoicesForOrganization(
        organizationId,
        due
            .map((i) => CollectionCacheMapper.toInvoiceRow(organizationId, i))
            .toList(),
      );
      return CachedResult(data: due, isFromCache: false);
    } on ApiException catch (e) {
      if (!_isNetworkError(e)) rethrow;
      final List<CachedInvoiceRow> rows = await _db
          .getCachedInvoicesForOrganization(organizationId);
      if (rows.isEmpty) rethrow;
      final DateTime cachedAt = rows
          .map((r) => r.cachedAt)
          .reduce((a, b) => a.isAfter(b) ? a : b);
      return CachedResult(
        data: rows.map(CollectionCacheMapper.invoiceFromRow).toList(),
        isFromCache: true,
        cachedAt: cachedAt,
      );
    }
  }

  @override
  Future<CashReceiptResult> createCashReceipt({
    required String organizationId,
    required String tenantId,
    String? leaseId,
    required int amount,
    List<Map<String, Object?>>? allocations,
    String? signatureDataUrl,
    String? paperReceiptDocumentId,
    required String clientRef,
  }) {
    return _remote.createCashReceipt(organizationId, <String, dynamic>{
      'tenantId': tenantId,
      'leaseId': ?leaseId,
      'amount': amount,
      'allocations': ?allocations,
      'autoAllocate': allocations == null,
      'signatureDataUrl': ?signatureDataUrl,
      'paperReceiptDocumentId': ?paperReceiptDocumentId,
      'clientRef': clientRef,
    });
  }

  @override
  Future<void> sendCashReceipt({
    required String organizationId,
    required String cashReceiptId,
  }) {
    return _remote.sendCashReceipt(organizationId, cashReceiptId);
  }
}
