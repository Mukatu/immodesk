import '../../domain/entities/independent_manager_onboarding_result.dart';
import '../../domain/repositories/onboarding_repository.dart';
import '../datasources/onboarding_remote_data_source.dart';

class OnboardingRepositoryImpl implements OnboardingRepository {
  OnboardingRepositoryImpl(this._remote);

  final OnboardingRemoteDataSource _remote;

  @override
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
  }) {
    return _remote.onboardIndependentManager(
      organizationLegalName: organizationLegalName,
      organizationCity: organizationCity,
      organizationContactPhone: organizationContactPhone,
      landlordFirstName: landlordFirstName,
      landlordLastName: landlordLastName,
      landlordPrimaryPhone: landlordPrimaryPhone,
      landlordCity: landlordCity,
      landlordCountryCode: landlordCountryCode,
      propertyName: propertyName,
      propertyAddressLine: propertyAddressLine,
      propertyDistrict: propertyDistrict,
      propertyCity: propertyCity,
      commissionRateBps: commissionRateBps,
      vatRateBps: vatRateBps,
      startDate: startDate,
      payoutDay: payoutDay,
    );
  }
}
