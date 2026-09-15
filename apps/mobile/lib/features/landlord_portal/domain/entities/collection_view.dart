import 'package:freezed_annotation/freezed_annotation.dart';

import 'payment_method.dart';

part 'collection_view.freezed.dart';
part 'collection_view.g.dart';

@freezed
abstract class CollectionViewTenantRef with _$CollectionViewTenantRef {
  const factory CollectionViewTenantRef({
    required String id,
    required String displayName,
  }) = _CollectionViewTenantRef;

  factory CollectionViewTenantRef.fromJson(Map<String, dynamic> json) =>
      _$CollectionViewTenantRefFromJson(json);
}

@freezed
abstract class CollectionViewUnitRef with _$CollectionViewUnitRef {
  const factory CollectionViewUnitRef({
    required String id,
    required String code,
  }) = _CollectionViewUnitRef;

  factory CollectionViewUnitRef.fromJson(Map<String, dynamic> json) =>
      _$CollectionViewUnitRefFromJson(json);
}

/// `CollectionView` du contrat de phase 7 : un encaissement confirmé sur un
/// bien du bailleur, tel que renvoyé par `GET /v1/portal/collections`.
@freezed
abstract class CollectionView with _$CollectionView {
  const factory CollectionView({
    required String paymentId,
    required String paymentDate,
    required PaymentMethod method,
    required int amount,
    required CollectionViewTenantRef tenant,
    required CollectionViewUnitRef unit,
    String? invoiceNumber,
  }) = _CollectionView;

  factory CollectionView.fromJson(Map<String, dynamic> json) =>
      _$CollectionViewFromJson(json);
}
