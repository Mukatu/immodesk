import 'package:dio/dio.dart';

import '../../../../core/network/api_exception.dart';
import '../../domain/entities/cash_receipt_result.dart';
import '../../domain/entities/invoice_summary.dart';

/// Appels HTTP bruts pour les factures (`GET /v1/invoices`), en lecture
/// seule côté mobile en phase 3. `X-Organization-Id` requis, comme pour le
/// portefeuille et les baux.
///
/// Remarque : la pagination par curseur du contrat n'est pas exploitée ici
/// (une seule page, `limit=200`), comme pour `PortfolioRemoteDataSource` et
/// `LeasesRemoteDataSource`.
class CollectionRemoteDataSource {
  CollectionRemoteDataSource(this._dio);

  final Dio _dio;

  Options _orgHeaders(String organizationId) =>
      Options(headers: <String, String>{'X-Organization-Id': organizationId});

  Future<List<InvoiceSummary>> fetchInvoices(String organizationId) async {
    try {
      final Response<dynamic> response = await _dio.get<dynamic>(
        '/invoices',
        queryParameters: const {'limit': 200},
        options: _orgHeaders(organizationId),
      );
      final Map<String, dynamic> data = response.data as Map<String, dynamic>;
      final List<dynamic> items = data['items'] as List<dynamic>? ?? const [];
      return items
          .map(
            (dynamic e) => InvoiceSummary.fromJson(e as Map<String, dynamic>),
          )
          .toList();
    } on DioException catch (e) {
      throw ApiException.fromDioException(e);
    }
  }

  Future<CashReceiptResult> createCashReceipt(
    String organizationId,
    Map<String, dynamic> body,
  ) async {
    try {
      final Response<dynamic> response = await _dio.post<dynamic>(
        '/cash-receipts',
        data: body,
        options: _orgHeaders(organizationId),
      );
      return CashReceiptResult.fromJson(response.data as Map<String, dynamic>);
    } on DioException catch (e) {
      throw ApiException.fromDioException(e);
    }
  }

  Future<void> sendCashReceipt(
    String organizationId,
    String cashReceiptId,
  ) async {
    try {
      await _dio.post<dynamic>(
        '/cash-receipts/$cashReceiptId/send',
        options: _orgHeaders(organizationId),
      );
    } on DioException catch (e) {
      throw ApiException.fromDioException(e);
    }
  }
}
