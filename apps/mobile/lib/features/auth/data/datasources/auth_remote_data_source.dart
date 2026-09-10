import 'package:dio/dio.dart';

import '../../../../core/network/api_exception.dart';
import '../models/me_result.dart';
import '../models/otp_request_result.dart';
import '../models/verify_otp_result.dart';

/// Appels HTTP bruts du module `auth` (voir `docs/api/phase0-contract.md`).
class AuthRemoteDataSource {
  AuthRemoteDataSource(this._dio);

  final Dio _dio;

  Future<OtpRequestResult> requestOtp({
    required String phone,
    required String channel,
  }) async {
    try {
      final Response<dynamic> response = await _dio.post<dynamic>(
        '/auth/otp/request',
        data: <String, dynamic>{'phone': phone, 'channel': channel},
      );
      return OtpRequestResult.fromJson(response.data as Map<String, dynamic>);
    } on DioException catch (e) {
      throw ApiException.fromDioException(e);
    }
  }

  Future<VerifyOtpResult> verifyOtp({
    required String phone,
    required String code,
    String? deviceName,
  }) async {
    try {
      final Response<dynamic> response = await _dio.post<dynamic>(
        '/auth/otp/verify',
        data: <String, dynamic>{
          'phone': phone,
          'code': code,
          // ignore: use_null_aware_elements
          if (deviceName != null) 'deviceName': deviceName,
        },
      );
      return VerifyOtpResult.fromJson(response.data as Map<String, dynamic>);
    } on DioException catch (e) {
      throw ApiException.fromDioException(e);
    }
  }

  Future<MeResult> fetchMe() async {
    try {
      final Response<dynamic> response = await _dio.get<dynamic>('/me');
      return MeResult.fromJson(response.data as Map<String, dynamic>);
    } on DioException catch (e) {
      throw ApiException.fromDioException(e);
    }
  }

  Future<void> logout(String refreshToken) async {
    try {
      await _dio.post<dynamic>(
        '/auth/logout',
        data: <String, dynamic>{'refreshToken': refreshToken},
      );
    } on DioException catch (e) {
      throw ApiException.fromDioException(e);
    }
  }
}
