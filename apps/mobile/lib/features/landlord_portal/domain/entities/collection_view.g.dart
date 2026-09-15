// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'collection_view.dart';

// **************************************************************************
// JsonSerializableGenerator
// **************************************************************************

_CollectionViewTenantRef _$CollectionViewTenantRefFromJson(
  Map<String, dynamic> json,
) => _CollectionViewTenantRef(
  id: json['id'] as String,
  displayName: json['displayName'] as String,
);

Map<String, dynamic> _$CollectionViewTenantRefToJson(
  _CollectionViewTenantRef instance,
) => <String, dynamic>{'id': instance.id, 'displayName': instance.displayName};

_CollectionViewUnitRef _$CollectionViewUnitRefFromJson(
  Map<String, dynamic> json,
) => _CollectionViewUnitRef(
  id: json['id'] as String,
  code: json['code'] as String,
);

Map<String, dynamic> _$CollectionViewUnitRefToJson(
  _CollectionViewUnitRef instance,
) => <String, dynamic>{'id': instance.id, 'code': instance.code};

_CollectionView _$CollectionViewFromJson(Map<String, dynamic> json) =>
    _CollectionView(
      paymentId: json['paymentId'] as String,
      paymentDate: json['paymentDate'] as String,
      method: $enumDecode(_$PaymentMethodEnumMap, json['method']),
      amount: (json['amount'] as num).toInt(),
      tenant: CollectionViewTenantRef.fromJson(
        json['tenant'] as Map<String, dynamic>,
      ),
      unit: CollectionViewUnitRef.fromJson(
        json['unit'] as Map<String, dynamic>,
      ),
      invoiceNumber: json['invoiceNumber'] as String?,
    );

Map<String, dynamic> _$CollectionViewToJson(_CollectionView instance) =>
    <String, dynamic>{
      'paymentId': instance.paymentId,
      'paymentDate': instance.paymentDate,
      'method': _$PaymentMethodEnumMap[instance.method]!,
      'amount': instance.amount,
      'tenant': instance.tenant,
      'unit': instance.unit,
      'invoiceNumber': instance.invoiceNumber,
    };

const _$PaymentMethodEnumMap = {
  PaymentMethod.cash: 'CASH',
  PaymentMethod.mobileMoney: 'MOBILE_MONEY',
  PaymentMethod.bankTransfer: 'BANK_TRANSFER',
  PaymentMethod.bankCheck: 'BANK_CHECK',
};
