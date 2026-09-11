import 'package:dio/dio.dart';

import '../../../../core/network/api_exception.dart';
import '../../domain/entities/cash_receipt_summary.dart';
import '../../domain/entities/collector_balance.dart';
import '../../domain/entities/remittance_summary.dart';

/// Appels HTTP bruts pour la caisse du démarcheur
/// (`docs/api/phase3-contract.md`). `X-Organization-Id` requis, comme pour
/// les autres modules.
class CashRemoteDataSource {
  CashRemoteDataSource(this._dio);

  final Dio _dio;

  Options _orgHeaders(String organizationId) =>
      Options(headers: <String, String>{'X-Organization-Id': organizationId});

  Future<CollectorBalance> fetchCollectorBalance(
    String organizationId,
    String userId,
  ) async {
    try {
      final Response<dynamic> response = await _dio.get<dynamic>(
        '/cash/collectors/$userId/balance',
        options: _orgHeaders(organizationId),
      );
      return CollectorBalance.fromJson(response.data as Map<String, dynamic>);
    } on DioException catch (e) {
      throw ApiException.fromDioException(e);
    }
  }

  Future<List<CashReceiptSummary>> fetchCashReceipts(
    String organizationId,
  ) async {
    try {
      final Response<dynamic> response = await _dio.get<dynamic>(
        '/cash-receipts',
        queryParameters: const {'limit': 200},
        options: _orgHeaders(organizationId),
      );
      final Map<String, dynamic> data = response.data as Map<String, dynamic>;
      final List<dynamic> items = data['items'] as List<dynamic>? ?? const [];
      return items
          .map(
            (dynamic e) =>
                CashReceiptSummary.fromJson(e as Map<String, dynamic>),
          )
          .toList();
    } on DioException catch (e) {
      throw ApiException.fromDioException(e);
    }
  }

  Future<List<RemittanceSummary>> fetchRemittances(
    String organizationId,
  ) async {
    try {
      final Response<dynamic> response = await _dio.get<dynamic>(
        '/cash-remittances',
        queryParameters: const {'limit': 100},
        options: _orgHeaders(organizationId),
      );
      final Map<String, dynamic> data = response.data as Map<String, dynamic>;
      final List<dynamic> items = data['items'] as List<dynamic>? ?? const [];
      return items
          .map(
            (dynamic e) =>
                RemittanceSummary.fromJson(e as Map<String, dynamic>),
          )
          .toList();
    } on DioException catch (e) {
      throw ApiException.fromDioException(e);
    }
  }

  Future<RemittanceSummary> createRemittance(
    String organizationId,
    Map<String, dynamic> body,
  ) async {
    try {
      final Response<dynamic> response = await _dio.post<dynamic>(
        '/cash-remittances',
        data: body,
        options: _orgHeaders(organizationId),
      );
      return RemittanceSummary.fromJson(response.data as Map<String, dynamic>);
    } on DioException catch (e) {
      throw ApiException.fromDioException(e);
    }
  }
}
