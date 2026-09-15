import 'package:freezed_annotation/freezed_annotation.dart';

part 'independent_manager_onboarding_result.freezed.dart';
part 'independent_manager_onboarding_result.g.dart';

@freezed
abstract class OnboardingOrganizationRef with _$OnboardingOrganizationRef {
  const factory OnboardingOrganizationRef({
    required String id,
    required String legalName,
  }) = _OnboardingOrganizationRef;

  factory OnboardingOrganizationRef.fromJson(Map<String, dynamic> json) =>
      _$OnboardingOrganizationRefFromJson(json);
}

@freezed
abstract class OnboardingLandlordRef with _$OnboardingLandlordRef {
  const factory OnboardingLandlordRef({
    required String id,
    required String displayName,
  }) = _OnboardingLandlordRef;

  factory OnboardingLandlordRef.fromJson(Map<String, dynamic> json) =>
      _$OnboardingLandlordRefFromJson(json);
}

@freezed
abstract class OnboardingPropertyRef with _$OnboardingPropertyRef {
  const factory OnboardingPropertyRef({
    required String id,
    required String name,
  }) = _OnboardingPropertyRef;

  factory OnboardingPropertyRef.fromJson(Map<String, dynamic> json) =>
      _$OnboardingPropertyRefFromJson(json);
}

@freezed
abstract class OnboardingMandateRef with _$OnboardingMandateRef {
  const factory OnboardingMandateRef({
    required String id,
    required String reference,
    int? commissionRateBps,
  }) = _OnboardingMandateRef;

  factory OnboardingMandateRef.fromJson(Map<String, dynamic> json) =>
      _$OnboardingMandateRefFromJson(json);
}

/// Réponse de `POST /v1/organizations/independent-manager/onboarding` :
/// organisation, bailleur, bien et mandat créés en une seule transaction.
@freezed
abstract class IndependentManagerOnboardingResult
    with _$IndependentManagerOnboardingResult {
  const factory IndependentManagerOnboardingResult({
    required OnboardingOrganizationRef organization,
    required OnboardingLandlordRef landlord,
    required OnboardingPropertyRef property,
    required OnboardingMandateRef mandate,
  }) = _IndependentManagerOnboardingResult;

  factory IndependentManagerOnboardingResult.fromJson(
    Map<String, dynamic> json,
  ) => _$IndependentManagerOnboardingResultFromJson(json);
}
