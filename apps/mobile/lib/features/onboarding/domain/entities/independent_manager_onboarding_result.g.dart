// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'independent_manager_onboarding_result.dart';

// **************************************************************************
// JsonSerializableGenerator
// **************************************************************************

_OnboardingOrganizationRef _$OnboardingOrganizationRefFromJson(
  Map<String, dynamic> json,
) => _OnboardingOrganizationRef(
  id: json['id'] as String,
  legalName: json['legalName'] as String,
);

Map<String, dynamic> _$OnboardingOrganizationRefToJson(
  _OnboardingOrganizationRef instance,
) => <String, dynamic>{'id': instance.id, 'legalName': instance.legalName};

_OnboardingLandlordRef _$OnboardingLandlordRefFromJson(
  Map<String, dynamic> json,
) => _OnboardingLandlordRef(
  id: json['id'] as String,
  displayName: json['displayName'] as String,
);

Map<String, dynamic> _$OnboardingLandlordRefToJson(
  _OnboardingLandlordRef instance,
) => <String, dynamic>{'id': instance.id, 'displayName': instance.displayName};

_OnboardingPropertyRef _$OnboardingPropertyRefFromJson(
  Map<String, dynamic> json,
) => _OnboardingPropertyRef(
  id: json['id'] as String,
  name: json['name'] as String,
);

Map<String, dynamic> _$OnboardingPropertyRefToJson(
  _OnboardingPropertyRef instance,
) => <String, dynamic>{'id': instance.id, 'name': instance.name};

_OnboardingMandateRef _$OnboardingMandateRefFromJson(
  Map<String, dynamic> json,
) => _OnboardingMandateRef(
  id: json['id'] as String,
  reference: json['reference'] as String,
  commissionRateBps: (json['commissionRateBps'] as num?)?.toInt(),
);

Map<String, dynamic> _$OnboardingMandateRefToJson(
  _OnboardingMandateRef instance,
) => <String, dynamic>{
  'id': instance.id,
  'reference': instance.reference,
  'commissionRateBps': instance.commissionRateBps,
};

_IndependentManagerOnboardingResult
_$IndependentManagerOnboardingResultFromJson(Map<String, dynamic> json) =>
    _IndependentManagerOnboardingResult(
      organization: OnboardingOrganizationRef.fromJson(
        json['organization'] as Map<String, dynamic>,
      ),
      landlord: OnboardingLandlordRef.fromJson(
        json['landlord'] as Map<String, dynamic>,
      ),
      property: OnboardingPropertyRef.fromJson(
        json['property'] as Map<String, dynamic>,
      ),
      mandate: OnboardingMandateRef.fromJson(
        json['mandate'] as Map<String, dynamic>,
      ),
    );

Map<String, dynamic> _$IndependentManagerOnboardingResultToJson(
  _IndependentManagerOnboardingResult instance,
) => <String, dynamic>{
  'organization': instance.organization,
  'landlord': instance.landlord,
  'property': instance.property,
  'mandate': instance.mandate,
};
