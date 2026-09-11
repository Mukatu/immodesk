import 'package:dio/dio.dart';

import '../../../../core/network/api_exception.dart';
import '../../domain/entities/lease_detail.dart';
import '../../domain/entities/lease_document.dart';
import '../../domain/entities/lease_status.dart';
import '../../domain/entities/lease_summary.dart';

/// Appels HTTP bruts pour les baux (`GET` uniquement, lecture seule côté
/// mobile en phase 2). `X-Organization-Id` requis sur toutes les routes,
/// comme pour le portefeuille.
///
/// Remarque : la pagination par curseur du contrat (`pageInfo.nextCursor`)
/// n'est pas exploitée ici (une seule page, `limit=100`), comme pour
/// `PortfolioRemoteDataSource`.
class LeasesRemoteDataSource {
  LeasesRemoteDataSource(this._dio);

  final Dio _dio;

  Options _orgHeaders(String organizationId) =>
      Options(headers: <String, String>{'X-Organization-Id': organizationId});

  Future<List<LeaseSummary>> fetchLeases(
    String organizationId, {
    LeaseStatus? status,
    String? unitId,
    String? tenantId,
  }) async {
    try {
      final Map<String, dynamic> queryParameters = {
        'limit': 100,
        if (status != null) 'status': leaseStatusToApiValue(status),
        'unitId': ?unitId,
        'tenantId': ?tenantId,
      };
      final Response<dynamic> response = await _dio.get<dynamic>(
        '/leases',
        queryParameters: queryParameters,
        options: _orgHeaders(organizationId),
      );
      final Map<String, dynamic> data = response.data as Map<String, dynamic>;
      final List<dynamic> items = data['items'] as List<dynamic>? ?? const [];
      return items
          .map((dynamic e) => LeaseSummary.fromJson(e as Map<String, dynamic>))
          .toList();
    } on DioException catch (e) {
      throw ApiException.fromDioException(e);
    }
  }

  Future<LeaseDetail> fetchLeaseDetail(
    String organizationId,
    String leaseId,
  ) async {
    try {
      final Response<dynamic> response = await _dio.get<dynamic>(
        '/leases/$leaseId',
        options: _orgHeaders(organizationId),
      );
      return LeaseDetail.fromJson(response.data as Map<String, dynamic>);
    } on DioException catch (e) {
      throw ApiException.fromDioException(e);
    }
  }

  /// Liste des versions de documents attachés au bail (`GET
  /// /leases/{id}/documents`) : contrat généré, contrat signé, avenants...
  Future<List<LeaseDocument>> fetchLeaseDocuments(
    String organizationId,
    String leaseId,
  ) async {
    try {
      final Response<dynamic> response = await _dio.get<dynamic>(
        '/leases/$leaseId/documents',
        options: _orgHeaders(organizationId),
      );
      final Map<String, dynamic> data = response.data as Map<String, dynamic>;
      final List<dynamic> items = data['items'] as List<dynamic>? ?? const [];
      return items
          .map((dynamic e) => LeaseDocument.fromJson(e as Map<String, dynamic>))
          .toList();
    } on DioException catch (e) {
      throw ApiException.fromDioException(e);
    }
  }
}
