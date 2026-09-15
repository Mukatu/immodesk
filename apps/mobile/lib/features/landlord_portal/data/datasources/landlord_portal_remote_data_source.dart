import 'package:dio/dio.dart';

import '../../../../core/network/api_exception.dart';
import '../../domain/entities/collection_view.dart';
import '../../domain/entities/owner_payout.dart';
import '../../domain/entities/owner_statement_summary.dart';
import '../../domain/entities/portal_profile.dart';
import '../../domain/entities/receipt_summary.dart';

/// Appels HTTP bruts du portail bailleur. Aucune de ces routes n'attend
/// `X-Organization-Id` : le compte `LANDLORD_PORTAL` ne porte aucune
/// appartenance à `organization_members` (`docs/api/phase7-contract.md`,
/// arbitrage 7). Une seule page par liste (`limit=100`), comme pour les
/// autres listes en lecture seule du mobile (portefeuille, baux).
class LandlordPortalRemoteDataSource {
  LandlordPortalRemoteDataSource(this._dio);

  final Dio _dio;

  Future<PortalProfile> fetchMe() async {
    try {
      final Response<dynamic> response = await _dio.get<dynamic>('/portal/me');
      return PortalProfile.fromJson(response.data as Map<String, dynamic>);
    } on DioException catch (e) {
      throw ApiException.fromDioException(e);
    }
  }

  Future<List<OwnerStatementSummary>> fetchStatements() async {
    try {
      final Response<dynamic> response = await _dio.get<dynamic>(
        '/portal/statements',
        queryParameters: const {'limit': 100},
      );
      final Map<String, dynamic> data = response.data as Map<String, dynamic>;
      final List<dynamic> items = data['items'] as List<dynamic>? ?? const [];
      return items
          .map(
            (dynamic e) =>
                OwnerStatementSummary.fromJson(e as Map<String, dynamic>),
          )
          .toList();
    } on DioException catch (e) {
      throw ApiException.fromDioException(e);
    }
  }

  Future<String> fetchStatementPdfUrl(String statementId) async {
    try {
      final Response<dynamic> response = await _dio.get<dynamic>(
        '/portal/statements/$statementId/pdf',
      );
      final Map<String, dynamic> data = response.data as Map<String, dynamic>;
      return data['downloadUrl'] as String;
    } on DioException catch (e) {
      throw ApiException.fromDioException(e);
    }
  }

  Future<List<OwnerPayout>> fetchPayouts() async {
    try {
      final Response<dynamic> response = await _dio.get<dynamic>(
        '/portal/payouts',
        queryParameters: const {'limit': 100},
      );
      final Map<String, dynamic> data = response.data as Map<String, dynamic>;
      final List<dynamic> items = data['items'] as List<dynamic>? ?? const [];
      return items
          .map((dynamic e) => OwnerPayout.fromJson(e as Map<String, dynamic>))
          .toList();
    } on DioException catch (e) {
      throw ApiException.fromDioException(e);
    }
  }

  Future<List<CollectionView>> fetchCollections() async {
    try {
      final Response<dynamic> response = await _dio.get<dynamic>(
        '/portal/collections',
        queryParameters: const {'limit': 100},
      );
      final Map<String, dynamic> data = response.data as Map<String, dynamic>;
      final List<dynamic> items = data['items'] as List<dynamic>? ?? const [];
      return items
          .map(
            (dynamic e) => CollectionView.fromJson(e as Map<String, dynamic>),
          )
          .toList();
    } on DioException catch (e) {
      throw ApiException.fromDioException(e);
    }
  }

  Future<List<ReceiptSummary>> fetchReceipts() async {
    try {
      final Response<dynamic> response = await _dio.get<dynamic>(
        '/portal/receipts',
        queryParameters: const {'limit': 100},
      );
      final Map<String, dynamic> data = response.data as Map<String, dynamic>;
      final List<dynamic> items = data['items'] as List<dynamic>? ?? const [];
      return items
          .map(
            (dynamic e) => ReceiptSummary.fromJson(e as Map<String, dynamic>),
          )
          .toList();
    } on DioException catch (e) {
      throw ApiException.fromDioException(e);
    }
  }
}
