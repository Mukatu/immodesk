import '../../domain/entities/cash_receipt_summary.dart';
import '../../domain/entities/collector_balance.dart';
import '../../domain/entities/remittance_summary.dart';
import '../../domain/repositories/cash_repository.dart';
import '../datasources/cash_remote_data_source.dart';

class CashRepositoryImpl implements CashRepository {
  CashRepositoryImpl(this._remote);

  final CashRemoteDataSource _remote;

  @override
  Future<CollectorBalance> fetchCollectorBalance({
    required String organizationId,
    required String userId,
  }) {
    return _remote.fetchCollectorBalance(organizationId, userId);
  }

  @override
  Future<List<CashReceiptSummary>> fetchMyCashReceipts(String organizationId) {
    return _remote.fetchCashReceipts(organizationId);
  }

  @override
  Future<List<RemittanceSummary>> fetchMyRemittances(String organizationId) {
    return _remote.fetchRemittances(organizationId);
  }

  @override
  Future<RemittanceSummary> createRemittance({
    required String organizationId,
    required List<String> cashReceiptIds,
    required int declaredAmount,
    Map<String, int>? denominations,
    required String clientRef,
  }) {
    return _remote.createRemittance(organizationId, <String, dynamic>{
      'cashReceiptIds': cashReceiptIds,
      'declaredAmount': declaredAmount,
      'denominations': ?denominations,
      'clientRef': clientRef,
    });
  }
}
