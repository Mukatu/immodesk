import 'package:dio/dio.dart';

import '../../../../core/network/api_exception.dart';
import '../../domain/entities/landlord_invitation_result.dart';
import '../../domain/entities/mandate_detail.dart';

class MandatesRemoteDataSource {
  MandatesRemoteDataSource(this._dio);

  final Dio _dio;

  Options _orgHeaders(String organizationId) =>
      Options(headers: <String, String>{'X-Organization-Id': organizationId});

  Future<MandateDetail> fetchMandateDetail(
    String organizationId,
    String mandateId,
  ) async {
    try {
      final Response<dynamic> response = await _dio.get<dynamic>(
        '/management-mandates/$mandateId',
        options: _orgHeaders(organizationId),
      );
      return MandateDetail.fromJson(response.data as Map<String, dynamic>);
    } on DioException catch (e) {
      throw ApiException.fromDioException(e);
    }
  }

  Future<LandlordInvitationResult> sendLandlordInvitation(
    String organizationId,
    String mandateId,
  ) async {
    try {
      final Response<dynamic> response = await _dio.post<dynamic>(
        '/management-mandates/$mandateId/landlord-invitation',
        options: _orgHeaders(organizationId),
      );
      return LandlordInvitationResult.fromJson(
        response.data as Map<String, dynamic>,
      );
    } on DioException catch (e) {
      throw ApiException.fromDioException(e);
    }
  }
}
