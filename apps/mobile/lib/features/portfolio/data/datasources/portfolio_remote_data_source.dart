import 'package:dio/dio.dart';

import '../../../../core/network/api_exception.dart';
import '../../domain/entities/property_detail.dart';
import '../../domain/entities/property_summary.dart';
import '../../domain/entities/tenant.dart';
import '../../domain/entities/unit_detail.dart';

/// Appels HTTP bruts pour le portefeuille (immeubles, lots, locataires),
/// tous en lecture seule (`GET`). `X-Organization-Id` est requis par le
/// contrat de phase 1 sur toutes ces routes.
///
/// Remarque : la pagination par curseur du contrat n'est pas exploitée ici
/// (une seule page, `limit=100`) — au-delà, un chargement incrémental
/// (`pageInfo.nextCursor`) sera ajouté avec la pagination d'écran.
class PortfolioRemoteDataSource {
  PortfolioRemoteDataSource(this._dio);

  final Dio _dio;

  Options _orgHeaders(String organizationId) =>
      Options(headers: <String, String>{'X-Organization-Id': organizationId});

  Future<List<PropertySummary>> fetchProperties(String organizationId) async {
    try {
      final Response<dynamic> response = await _dio.get<dynamic>(
        '/properties',
        queryParameters: const {'limit': 100},
        options: _orgHeaders(organizationId),
      );
      final Map<String, dynamic> data = response.data as Map<String, dynamic>;
      final List<dynamic> items = data['items'] as List<dynamic>? ?? const [];
      return items
          .map(
            (dynamic e) => PropertySummary.fromJson(e as Map<String, dynamic>),
          )
          .toList();
    } on DioException catch (e) {
      throw ApiException.fromDioException(e);
    }
  }

  Future<PropertyDetail> fetchPropertyDetail(
    String organizationId,
    String propertyId,
  ) async {
    try {
      final Response<dynamic> response = await _dio.get<dynamic>(
        '/properties/$propertyId',
        options: _orgHeaders(organizationId),
      );
      return PropertyDetail.fromJson(response.data as Map<String, dynamic>);
    } on DioException catch (e) {
      throw ApiException.fromDioException(e);
    }
  }

  Future<UnitDetail> fetchUnitDetail(
    String organizationId,
    String unitId,
  ) async {
    try {
      final Response<dynamic> response = await _dio.get<dynamic>(
        '/units/$unitId',
        options: _orgHeaders(organizationId),
      );
      return UnitDetail.fromJson(response.data as Map<String, dynamic>);
    } on DioException catch (e) {
      throw ApiException.fromDioException(e);
    }
  }

  Future<List<Tenant>> fetchTenants(String organizationId) async {
    try {
      final Response<dynamic> response = await _dio.get<dynamic>(
        '/tenants',
        queryParameters: const {'limit': 100},
        options: _orgHeaders(organizationId),
      );
      final Map<String, dynamic> data = response.data as Map<String, dynamic>;
      final List<dynamic> items = data['items'] as List<dynamic>? ?? const [];
      return items
          .map((dynamic e) => Tenant.fromJson(e as Map<String, dynamic>))
          .toList();
    } on DioException catch (e) {
      throw ApiException.fromDioException(e);
    }
  }
}
