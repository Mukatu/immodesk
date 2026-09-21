import 'package:dio/dio.dart';

import '../../../../core/network/api_exception.dart';
import '../../domain/entities/property_lead_result.dart';
import '../../domain/entities/referral.dart';
import '../../domain/entities/referral_commission.dart';
import '../../domain/entities/referral_partner.dart';
import '../../domain/repositories/referral_repository.dart';

/// Appels HTTP bruts de `docs/api/phase10-contract.md` (§ Routes, apport
/// d'affaires). Aucun en-tête `X-Organization-Id` : ces routes sont
/// scopées à l'utilisateur (ou publiques), jamais à une organisation.
class ReferralRemoteDataSource {
  ReferralRemoteDataSource(this._dio);

  final Dio _dio;

  Future<ReferralPartner> register(String? displayName) async {
    try {
      final Response<dynamic> response = await _dio.post<dynamic>(
        '/referral-partners',
        data: <String, dynamic>{'displayName': ?displayName},
      );
      return ReferralPartner.fromJson(response.data as Map<String, dynamic>);
    } on DioException catch (e) {
      throw ApiException.fromDioException(e);
    }
  }

  Future<ReferralPartner> fetchMe() async {
    try {
      final Response<dynamic> response = await _dio.get<dynamic>(
        '/referral-partners/me',
      );
      return ReferralPartner.fromJson(response.data as Map<String, dynamic>);
    } on DioException catch (e) {
      throw ApiException.fromDioException(e);
    }
  }

  Future<PropertyLeadResult> registerPropertyLead(
    Map<String, dynamic> body,
  ) async {
    try {
      final Response<dynamic> response = await _dio.post<dynamic>(
        '/referral-partners/me/properties',
        data: body,
      );
      return PropertyLeadResult.fromJson(response.data as Map<String, dynamic>);
    } on DioException catch (e) {
      throw ApiException.fromDioException(e);
    }
  }

  Future<Referral> confirmPropertyLead(
    String propertyLeadId,
    String code,
  ) async {
    try {
      final Response<dynamic> response = await _dio.post<dynamic>(
        '/referral-partners/me/properties/$propertyLeadId/confirm-otp',
        data: <String, dynamic>{'code': code},
      );
      return Referral.fromJson(response.data as Map<String, dynamic>);
    } on DioException catch (e) {
      throw ApiException.fromDioException(e);
    }
  }

  Future<ReferralsPage> fetchReferrals({String? cursor, int limit = 20}) async {
    try {
      final Response<dynamic> response = await _dio.get<dynamic>(
        '/referral-partners/me/referrals',
        queryParameters: <String, dynamic>{'limit': limit, 'cursor': ?cursor},
      );
      final Map<String, dynamic> data = response.data as Map<String, dynamic>;
      final List<dynamic> items = data['items'] as List<dynamic>? ?? const [];
      final Map<String, dynamic>? pageInfo =
          data['pageInfo'] as Map<String, dynamic>?;
      return ReferralsPage(
        items: items
            .map((dynamic e) => Referral.fromJson(e as Map<String, dynamic>))
            .toList(),
        nextCursor: pageInfo?['nextCursor'] as String?,
      );
    } on DioException catch (e) {
      throw ApiException.fromDioException(e);
    }
  }

  Future<ReferralCommissionsPage> fetchCommissions({
    String? cursor,
    int limit = 20,
  }) async {
    try {
      final Response<dynamic> response = await _dio.get<dynamic>(
        '/referral-partners/me/commissions',
        queryParameters: <String, dynamic>{'limit': limit, 'cursor': ?cursor},
      );
      final Map<String, dynamic> data = response.data as Map<String, dynamic>;
      final List<dynamic> items = data['items'] as List<dynamic>? ?? const [];
      final Map<String, dynamic>? pageInfo =
          data['pageInfo'] as Map<String, dynamic>?;
      return ReferralCommissionsPage(
        items: items
            .map(
              (dynamic e) =>
                  ReferralCommission.fromJson(e as Map<String, dynamic>),
            )
            .toList(),
        totals: ReferralCommissionTotals.fromJson(
          data['totals'] as Map<String, dynamic>,
        ),
        nextCursor: pageInfo?['nextCursor'] as String?,
      );
    } on DioException catch (e) {
      throw ApiException.fromDioException(e);
    }
  }
}
