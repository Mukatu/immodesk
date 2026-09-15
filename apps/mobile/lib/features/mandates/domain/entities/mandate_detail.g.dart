// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'mandate_detail.dart';

// **************************************************************************
// JsonSerializableGenerator
// **************************************************************************

_MandateLandlordRef _$MandateLandlordRefFromJson(Map<String, dynamic> json) =>
    _MandateLandlordRef(
      id: json['id'] as String,
      displayName: json['displayName'] as String,
      isDiaspora: json['isDiaspora'] as bool? ?? false,
    );

Map<String, dynamic> _$MandateLandlordRefToJson(_MandateLandlordRef instance) =>
    <String, dynamic>{
      'id': instance.id,
      'displayName': instance.displayName,
      'isDiaspora': instance.isDiaspora,
    };

_LandlordPortalInvitationStatus _$LandlordPortalInvitationStatusFromJson(
  Map<String, dynamic> json,
) => _LandlordPortalInvitationStatus(
  invited: json['invited'] as bool? ?? false,
  invitedAt: json['invitedAt'] as String?,
  activated: json['activated'] as bool? ?? false,
  userId: json['userId'] as String?,
);

Map<String, dynamic> _$LandlordPortalInvitationStatusToJson(
  _LandlordPortalInvitationStatus instance,
) => <String, dynamic>{
  'invited': instance.invited,
  'invitedAt': instance.invitedAt,
  'activated': instance.activated,
  'userId': instance.userId,
};

_MandateDetail _$MandateDetailFromJson(Map<String, dynamic> json) =>
    _MandateDetail(
      id: json['id'] as String,
      reference: json['reference'] as String,
      status: $enumDecode(_$MandateStatusEnumMap, json['status']),
      landlord: MandateLandlordRef.fromJson(
        json['landlord'] as Map<String, dynamic>,
      ),
      commissionBasis: $enumDecode(
        _$CommissionBasisEnumMap,
        json['commissionBasis'],
      ),
      commissionRateBps: (json['commissionRateBps'] as num?)?.toInt(),
      commissionFlatAmount: (json['commissionFlatAmount'] as num?)?.toInt(),
      vatRateBps:
          (json['vatRateBps'] as num?)?.toInt() ?? defaultCommissionVatRateBps,
      startDate: json['startDate'] as String,
      endDate: json['endDate'] as String?,
      payoutDay: (json['payoutDay'] as num?)?.toInt() ?? 10,
      currency: json['currency'] as String? ?? 'XAF',
      landlordPortal: LandlordPortalInvitationStatus.fromJson(
        json['landlordPortal'] as Map<String, dynamic>,
      ),
    );

Map<String, dynamic> _$MandateDetailToJson(_MandateDetail instance) =>
    <String, dynamic>{
      'id': instance.id,
      'reference': instance.reference,
      'status': _$MandateStatusEnumMap[instance.status]!,
      'landlord': instance.landlord,
      'commissionBasis': _$CommissionBasisEnumMap[instance.commissionBasis]!,
      'commissionRateBps': instance.commissionRateBps,
      'commissionFlatAmount': instance.commissionFlatAmount,
      'vatRateBps': instance.vatRateBps,
      'startDate': instance.startDate,
      'endDate': instance.endDate,
      'payoutDay': instance.payoutDay,
      'currency': instance.currency,
      'landlordPortal': instance.landlordPortal,
    };

const _$MandateStatusEnumMap = {
  MandateStatus.draft: 'DRAFT',
  MandateStatus.active: 'ACTIVE',
  MandateStatus.suspended: 'SUSPENDED',
  MandateStatus.terminated: 'TERMINATED',
  MandateStatus.expired: 'EXPIRED',
};

const _$CommissionBasisEnumMap = {
  CommissionBasis.rateBpsOnRentCollected: 'RATE_BPS_ON_RENT_COLLECTED',
  CommissionBasis.rateBpsOnRentDue: 'RATE_BPS_ON_RENT_DUE',
  CommissionBasis.flatAmountPerMonth: 'FLAT_AMOUNT_PER_MONTH',
  CommissionBasis.flatAmountPerLease: 'FLAT_AMOUNT_PER_LEASE',
};
