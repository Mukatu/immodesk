import 'package:dio/dio.dart';

import '../../../../core/network/api_exception.dart';
import '../../domain/entities/organization.dart';
import '../../domain/entities/organization_membership.dart';

class OrganizationsRemoteDataSource {
  OrganizationsRemoteDataSource(this._dio);

  final Dio _dio;

  /// La liste des organisations de l'utilisateur est portée par `GET /v1/me`
  /// (voir `docs/api/phase0-contract.md`) : pas d'endpoint dédié en phase 0.
  Future<List<OrganizationMembership>> listMine() async {
    try {
      final Response<dynamic> response = await _dio.get<dynamic>('/me');
      final Map<String, dynamic> data = response.data as Map<String, dynamic>;
      final List<dynamic> items =
          data['organizations'] as List<dynamic>? ?? const [];
      return items
          .map(
            (dynamic e) =>
                OrganizationMembership.fromJson(e as Map<String, dynamic>),
          )
          .toList();
    } on DioException catch (e) {
      throw ApiException.fromDioException(e);
    }
  }

  Future<Organization> create({
    required OrganizationType type,
    required String legalName,
    String? tradeName,
    required String city,
    String? district,
    required String contactPhone,
    String? contactEmail,
  }) async {
    try {
      final Response<dynamic> response = await _dio.post<dynamic>(
        '/organizations',
        data: <String, dynamic>{
          'type': type.apiValue,
          'legalName': legalName,
          if (tradeName != null && tradeName.isNotEmpty)
            'tradeName': tradeName,
          'city': city,
          if (district != null && district.isNotEmpty) 'district': district,
          'contactPhone': contactPhone,
          if (contactEmail != null && contactEmail.isNotEmpty)
            'contactEmail': contactEmail,
        },
      );
      return Organization.fromJson(response.data as Map<String, dynamic>);
    } on DioException catch (e) {
      throw ApiException.fromDioException(e);
    }
  }
}
