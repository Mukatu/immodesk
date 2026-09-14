import 'package:dio/dio.dart';

import '../../../../core/network/api_exception.dart';
import '../../domain/entities/momo_quote.dart';
import '../../domain/entities/momo_transaction.dart';
import '../../domain/entities/payment_instructions.dart';
import '../../domain/entities/transfer_declaration_result.dart';

/// Appels HTTP bruts de la phase 4 (`docs/api/phase4-contract.md`).
/// `X-Organization-Id` requis comme pour les autres fonctionnalités.
class PaymentsRemoteDataSource {
  PaymentsRemoteDataSource(this._dio);

  final Dio _dio;

  Options _orgHeaders(String organizationId) =>
      Options(headers: <String, String>{'X-Organization-Id': organizationId});

  Future<PaymentInstructions> fetchPaymentInstructions(
    String organizationId,
    String invoiceId,
  ) async {
    try {
      final Response<dynamic> response = await _dio.get<dynamic>(
        '/invoices/$invoiceId/payment-instructions',
        options: _orgHeaders(organizationId),
      );
      return PaymentInstructions.fromJson(
        response.data as Map<String, dynamic>,
      );
    } on DioException catch (e) {
      throw ApiException.fromDioException(e);
    }
  }

  Future<MomoTransaction> declareMobileMoney(
    String organizationId,
    Map<String, dynamic> body,
  ) async {
    try {
      final Response<dynamic> response = await _dio.post<dynamic>(
        '/payments/mobile-money/declarations',
        data: body,
        options: _orgHeaders(organizationId),
      );
      return MomoTransaction.fromJson(response.data as Map<String, dynamic>);
    } on DioException catch (e) {
      throw ApiException.fromDioException(e);
    }
  }

  Future<TransferDeclarationResult> declareBankTransfer(
    String organizationId,
    Map<String, dynamic> body,
  ) async {
    try {
      final Response<dynamic> response = await _dio.post<dynamic>(
        '/bank-transfer-declarations',
        data: body,
        options: _orgHeaders(organizationId),
      );
      return TransferDeclarationResult.fromJson(
        response.data as Map<String, dynamic>,
      );
    } on DioException catch (e) {
      throw ApiException.fromDioException(e);
    }
  }

  Future<MomoQuote> quoteMobileMoney(
    String organizationId,
    Map<String, dynamic> body,
  ) async {
    try {
      final Response<dynamic> response = await _dio.post<dynamic>(
        '/payments/mobile-money/quote',
        data: body,
        options: _orgHeaders(organizationId),
      );
      return MomoQuote.fromJson(response.data as Map<String, dynamic>);
    } on DioException catch (e) {
      throw ApiException.fromDioException(e);
    }
  }

  Future<MomoTransaction> initiateMobileMoney(
    String organizationId,
    Map<String, dynamic> body,
  ) async {
    try {
      final Response<dynamic> response = await _dio.post<dynamic>(
        '/payments/mobile-money/initiate',
        data: body,
        options: _orgHeaders(organizationId),
      );
      final Map<String, dynamic> data = response.data as Map<String, dynamic>;
      return MomoTransaction.fromJson(
        data['transaction'] as Map<String, dynamic>,
      );
    } on DioException catch (e) {
      throw ApiException.fromDioException(e);
    }
  }

  Future<MomoTransaction> fetchMomoTransaction(
    String organizationId,
    String transactionId,
  ) async {
    try {
      final Response<dynamic> response = await _dio.get<dynamic>(
        '/payments/mobile-money/transactions/$transactionId',
        options: _orgHeaders(organizationId),
      );
      return MomoTransaction.fromJson(response.data as Map<String, dynamic>);
    } on DioException catch (e) {
      throw ApiException.fromDioException(e);
    }
  }
}
