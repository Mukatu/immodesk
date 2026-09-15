import '../entities/independent_manager_onboarding_result.dart';

/// Port d'onboarding du gestionnaire indépendant
/// (`docs/api/phase7-contract.md`, `POST
/// /v1/organizations/independent-manager/onboarding`) : crée en une seule
/// transaction l'organisation `INDEPENDENT_MANAGER`, le premier bailleur,
/// le premier immeuble et le premier mandat (commission par défaut 10 %).
abstract interface class OnboardingRepository {
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
  });
}
