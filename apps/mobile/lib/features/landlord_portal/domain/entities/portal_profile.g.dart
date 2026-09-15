// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'portal_profile.dart';

// **************************************************************************
// JsonSerializableGenerator
// **************************************************************************

_PortalOrganizationRef _$PortalOrganizationRefFromJson(
  Map<String, dynamic> json,
) => _PortalOrganizationRef(
  id: json['id'] as String,
  name: json['name'] as String,
);

Map<String, dynamic> _$PortalOrganizationRefToJson(
  _PortalOrganizationRef instance,
) => <String, dynamic>{'id': instance.id, 'name': instance.name};

_PortalLandlord _$PortalLandlordFromJson(Map<String, dynamic> json) =>
    _PortalLandlord(
      id: json['id'] as String,
      displayName: json['displayName'] as String,
      primaryPhone: json['primaryPhone'] as String,
      email: json['email'] as String?,
      city: json['city'] as String,
      countryCode: json['countryCode'] as String,
      payoutMethod: $enumDecode(_$PaymentMethodEnumMap, json['payoutMethod']),
    );

Map<String, dynamic> _$PortalLandlordToJson(_PortalLandlord instance) =>
    <String, dynamic>{
      'id': instance.id,
      'displayName': instance.displayName,
      'primaryPhone': instance.primaryPhone,
      'email': instance.email,
      'city': instance.city,
      'countryCode': instance.countryCode,
      'payoutMethod': _$PaymentMethodEnumMap[instance.payoutMethod]!,
    };

const _$PaymentMethodEnumMap = {
  PaymentMethod.cash: 'CASH',
  PaymentMethod.mobileMoney: 'MOBILE_MONEY',
  PaymentMethod.bankTransfer: 'BANK_TRANSFER',
  PaymentMethod.bankCheck: 'BANK_CHECK',
};

_PortalProfile _$PortalProfileFromJson(Map<String, dynamic> json) =>
    _PortalProfile(
      landlord: PortalLandlord.fromJson(
        json['landlord'] as Map<String, dynamic>,
      ),
      organizations: (json['organizations'] as List<dynamic>)
          .map((e) => PortalOrganizationRef.fromJson(e as Map<String, dynamic>))
          .toList(),
    );

Map<String, dynamic> _$PortalProfileToJson(_PortalProfile instance) =>
    <String, dynamic>{
      'landlord': instance.landlord,
      'organizations': instance.organizations,
    };
