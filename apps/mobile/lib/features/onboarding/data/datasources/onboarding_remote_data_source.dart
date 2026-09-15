import 'package:dio/dio.dart';

import '../../../../core/network/api_exception.dart';
import '../../domain/entities/independent_manager_onboarding_result.dart';

class OnboardingRemoteDataSource {
  OnboardingRemoteDataSource(this._dio);

  final Dio _dio;

  Future<IndependentManagerOnboardingResult> onboardIndependentManager({
    required String organizationLegalName,
    required String organizationCity,
    required String organizationContactPhone,
    required String landlordFirstName,
    required String landlordLastName,
    required String landlordPrimaryPhone,
    required String landlordCity,
    required String landlordCountryCode,
    required String propertyName,
    required String propertyAddressLine,
    required String propertyDistrict,
    required String propertyCity,
    required int commissionRateBps,
    required int vatRateBps,
    required String startDate,
    required int payoutDay,
  }) async {
    try {
      final Response<dynamic> response = await _dio.post<dynamic>(
        '/organizations/independent-manager/onboarding',
        data: <String, dynamic>{
          'organization': <String, dynamic>{
            'legalName': organizationLegalName,
            'city': organizationCity,
            'contactPhone': organizationContactPhone,
          },
          'landlord': <String, dynamic>{
            'firstName': landlordFirstName,
            'lastName': landlordLastName,
            'primaryPhone': landlordPrimaryPhone,
            'city': landlordCity,
            'countryCode': landlordCountryCode,
          },
          'property': <String, dynamic>{
            'name': propertyName,
            'addressLine': propertyAddressLine,
            'district': propertyDistrict,
            'city': propertyCity,
          },
          'mandate': <String, dynamic>{
            'commissionBasis': 'RATE_BPS_ON_RENT_COLLECTED',
            'commissionRateBps': commissionRateBps,
            'vatRateBps': vatRateBps,
            'startDate': startDate,
            'payoutDay': payoutDay,
          },
        },
      );
      return IndependentManagerOnboardingResult.fromJson(
        response.data as Map<String, dynamic>,
      );
    } on DioException catch (e) {
      throw ApiException.fromDioException(e);
    }
  }
}
