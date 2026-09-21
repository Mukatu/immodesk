// GENERATED CODE - DO NOT MODIFY BY HAND
// coverage:ignore-file
// ignore_for_file: type=lint
// ignore_for_file: unused_element, deprecated_member_use, deprecated_member_use_from_same_package, use_function_type_syntax_for_parameters, unnecessary_const, avoid_init_to_null, invalid_override_different_default_values_named, prefer_expression_function_bodies, annotate_overrides, invalid_annotation_target, unnecessary_question_mark

part of 'referral_partner.dart';

// **************************************************************************
// FreezedGenerator
// **************************************************************************

// dart format off
T _$identity<T>(T value) => value;

/// @nodoc
mixin _$ReferralPartner {

 String get id; String get partnerCode; ReferralPartnerStatus get status; String? get displayName; String get totalAccruedAmount; String get totalPaidAmount; String get createdAt;
/// Create a copy of ReferralPartner
/// with the given fields replaced by the non-null parameter values.
@JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
$ReferralPartnerCopyWith<ReferralPartner> get copyWith => _$ReferralPartnerCopyWithImpl<ReferralPartner>(this as ReferralPartner, _$identity);

  /// Serializes this ReferralPartner to a JSON map.
  Map<String, dynamic> toJson();


@override
bool operator ==(Object other) {
  return identical(this, other) || (other.runtimeType == runtimeType&&other is ReferralPartner&&(identical(other.id, id) || other.id == id)&&(identical(other.partnerCode, partnerCode) || other.partnerCode == partnerCode)&&(identical(other.status, status) || other.status == status)&&(identical(other.displayName, displayName) || other.displayName == displayName)&&(identical(other.totalAccruedAmount, totalAccruedAmount) || other.totalAccruedAmount == totalAccruedAmount)&&(identical(other.totalPaidAmount, totalPaidAmount) || other.totalPaidAmount == totalPaidAmount)&&(identical(other.createdAt, createdAt) || other.createdAt == createdAt));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode => Object.hash(runtimeType,id,partnerCode,status,displayName,totalAccruedAmount,totalPaidAmount,createdAt);

@override
String toString() {
  return 'ReferralPartner(id: $id, partnerCode: $partnerCode, status: $status, displayName: $displayName, totalAccruedAmount: $totalAccruedAmount, totalPaidAmount: $totalPaidAmount, createdAt: $createdAt)';
}


}

/// @nodoc
abstract mixin class $ReferralPartnerCopyWith<$Res>  {
  factory $ReferralPartnerCopyWith(ReferralPartner value, $Res Function(ReferralPartner) _then) = _$ReferralPartnerCopyWithImpl;
@useResult
$Res call({
 String id, String partnerCode, ReferralPartnerStatus status, String? displayName, String totalAccruedAmount, String totalPaidAmount, String createdAt
});




}
/// @nodoc
class _$ReferralPartnerCopyWithImpl<$Res>
    implements $ReferralPartnerCopyWith<$Res> {
  _$ReferralPartnerCopyWithImpl(this._self, this._then);

  final ReferralPartner _self;
  final $Res Function(ReferralPartner) _then;

/// Create a copy of ReferralPartner
/// with the given fields replaced by the non-null parameter values.
@pragma('vm:prefer-inline') @override $Res call({Object? id = null,Object? partnerCode = null,Object? status = null,Object? displayName = freezed,Object? totalAccruedAmount = null,Object? totalPaidAmount = null,Object? createdAt = null,}) {
  return _then(_self.copyWith(
id: null == id ? _self.id : id // ignore: cast_nullable_to_non_nullable
as String,partnerCode: null == partnerCode ? _self.partnerCode : partnerCode // ignore: cast_nullable_to_non_nullable
as String,status: null == status ? _self.status : status // ignore: cast_nullable_to_non_nullable
as ReferralPartnerStatus,displayName: freezed == displayName ? _self.displayName : displayName // ignore: cast_nullable_to_non_nullable
as String?,totalAccruedAmount: null == totalAccruedAmount ? _self.totalAccruedAmount : totalAccruedAmount // ignore: cast_nullable_to_non_nullable
as String,totalPaidAmount: null == totalPaidAmount ? _self.totalPaidAmount : totalPaidAmount // ignore: cast_nullable_to_non_nullable
as String,createdAt: null == createdAt ? _self.createdAt : createdAt // ignore: cast_nullable_to_non_nullable
as String,
  ));
}

}


/// Adds pattern-matching-related methods to [ReferralPartner].
extension ReferralPartnerPatterns on ReferralPartner {
/// A variant of `map` that fallback to returning `orElse`.
///
/// It is equivalent to doing:
/// ```dart
/// switch (sealedClass) {
///   case final Subclass value:
///     return ...;
///   case _:
///     return orElse();
/// }
/// ```

@optionalTypeArgs TResult maybeMap<TResult extends Object?>(TResult Function( _ReferralPartner value)?  $default,{required TResult orElse(),}){
final _that = this;
switch (_that) {
case _ReferralPartner() when $default != null:
return $default(_that);case _:
  return orElse();

}
}
/// A `switch`-like method, using callbacks.
///
/// Callbacks receives the raw object, upcasted.
/// It is equivalent to doing:
/// ```dart
/// switch (sealedClass) {
///   case final Subclass value:
///     return ...;
///   case final Subclass2 value:
///     return ...;
/// }
/// ```

@optionalTypeArgs TResult map<TResult extends Object?>(TResult Function( _ReferralPartner value)  $default,){
final _that = this;
switch (_that) {
case _ReferralPartner():
return $default(_that);case _:
  throw StateError('Unexpected subclass');

}
}
/// A variant of `map` that fallback to returning `null`.
///
/// It is equivalent to doing:
/// ```dart
/// switch (sealedClass) {
///   case final Subclass value:
///     return ...;
///   case _:
///     return null;
/// }
/// ```

@optionalTypeArgs TResult? mapOrNull<TResult extends Object?>(TResult? Function( _ReferralPartner value)?  $default,){
final _that = this;
switch (_that) {
case _ReferralPartner() when $default != null:
return $default(_that);case _:
  return null;

}
}
/// A variant of `when` that fallback to an `orElse` callback.
///
/// It is equivalent to doing:
/// ```dart
/// switch (sealedClass) {
///   case Subclass(:final field):
///     return ...;
///   case _:
///     return orElse();
/// }
/// ```

@optionalTypeArgs TResult maybeWhen<TResult extends Object?>(TResult Function( String id,  String partnerCode,  ReferralPartnerStatus status,  String? displayName,  String totalAccruedAmount,  String totalPaidAmount,  String createdAt)?  $default,{required TResult orElse(),}) {final _that = this;
switch (_that) {
case _ReferralPartner() when $default != null:
return $default(_that.id,_that.partnerCode,_that.status,_that.displayName,_that.totalAccruedAmount,_that.totalPaidAmount,_that.createdAt);case _:
  return orElse();

}
}
/// A `switch`-like method, using callbacks.
///
/// As opposed to `map`, this offers destructuring.
/// It is equivalent to doing:
/// ```dart
/// switch (sealedClass) {
///   case Subclass(:final field):
///     return ...;
///   case Subclass2(:final field2):
///     return ...;
/// }
/// ```

@optionalTypeArgs TResult when<TResult extends Object?>(TResult Function( String id,  String partnerCode,  ReferralPartnerStatus status,  String? displayName,  String totalAccruedAmount,  String totalPaidAmount,  String createdAt)  $default,) {final _that = this;
switch (_that) {
case _ReferralPartner():
return $default(_that.id,_that.partnerCode,_that.status,_that.displayName,_that.totalAccruedAmount,_that.totalPaidAmount,_that.createdAt);case _:
  throw StateError('Unexpected subclass');

}
}
/// A variant of `when` that fallback to returning `null`
///
/// It is equivalent to doing:
/// ```dart
/// switch (sealedClass) {
///   case Subclass(:final field):
///     return ...;
///   case _:
///     return null;
/// }
/// ```

@optionalTypeArgs TResult? whenOrNull<TResult extends Object?>(TResult? Function( String id,  String partnerCode,  ReferralPartnerStatus status,  String? displayName,  String totalAccruedAmount,  String totalPaidAmount,  String createdAt)?  $default,) {final _that = this;
switch (_that) {
case _ReferralPartner() when $default != null:
return $default(_that.id,_that.partnerCode,_that.status,_that.displayName,_that.totalAccruedAmount,_that.totalPaidAmount,_that.createdAt);case _:
  return null;

}
}

}

/// @nodoc
@JsonSerializable()

class _ReferralPartner implements ReferralPartner {
  const _ReferralPartner({required this.id, required this.partnerCode, required this.status, this.displayName, required this.totalAccruedAmount, required this.totalPaidAmount, required this.createdAt});
  factory _ReferralPartner.fromJson(Map<String, dynamic> json) => _$ReferralPartnerFromJson(json);

@override final  String id;
@override final  String partnerCode;
@override final  ReferralPartnerStatus status;
@override final  String? displayName;
@override final  String totalAccruedAmount;
@override final  String totalPaidAmount;
@override final  String createdAt;

/// Create a copy of ReferralPartner
/// with the given fields replaced by the non-null parameter values.
@override @JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
_$ReferralPartnerCopyWith<_ReferralPartner> get copyWith => __$ReferralPartnerCopyWithImpl<_ReferralPartner>(this, _$identity);

@override
Map<String, dynamic> toJson() {
  return _$ReferralPartnerToJson(this, );
}

@override
bool operator ==(Object other) {
  return identical(this, other) || (other.runtimeType == runtimeType&&other is _ReferralPartner&&(identical(other.id, id) || other.id == id)&&(identical(other.partnerCode, partnerCode) || other.partnerCode == partnerCode)&&(identical(other.status, status) || other.status == status)&&(identical(other.displayName, displayName) || other.displayName == displayName)&&(identical(other.totalAccruedAmount, totalAccruedAmount) || other.totalAccruedAmount == totalAccruedAmount)&&(identical(other.totalPaidAmount, totalPaidAmount) || other.totalPaidAmount == totalPaidAmount)&&(identical(other.createdAt, createdAt) || other.createdAt == createdAt));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode => Object.hash(runtimeType,id,partnerCode,status,displayName,totalAccruedAmount,totalPaidAmount,createdAt);

@override
String toString() {
  return 'ReferralPartner(id: $id, partnerCode: $partnerCode, status: $status, displayName: $displayName, totalAccruedAmount: $totalAccruedAmount, totalPaidAmount: $totalPaidAmount, createdAt: $createdAt)';
}


}

/// @nodoc
abstract mixin class _$ReferralPartnerCopyWith<$Res> implements $ReferralPartnerCopyWith<$Res> {
  factory _$ReferralPartnerCopyWith(_ReferralPartner value, $Res Function(_ReferralPartner) _then) = __$ReferralPartnerCopyWithImpl;
@override @useResult
$Res call({
 String id, String partnerCode, ReferralPartnerStatus status, String? displayName, String totalAccruedAmount, String totalPaidAmount, String createdAt
});




}
/// @nodoc
class __$ReferralPartnerCopyWithImpl<$Res>
    implements _$ReferralPartnerCopyWith<$Res> {
  __$ReferralPartnerCopyWithImpl(this._self, this._then);

  final _ReferralPartner _self;
  final $Res Function(_ReferralPartner) _then;

/// Create a copy of ReferralPartner
/// with the given fields replaced by the non-null parameter values.
@override @pragma('vm:prefer-inline') $Res call({Object? id = null,Object? partnerCode = null,Object? status = null,Object? displayName = freezed,Object? totalAccruedAmount = null,Object? totalPaidAmount = null,Object? createdAt = null,}) {
  return _then(_ReferralPartner(
id: null == id ? _self.id : id // ignore: cast_nullable_to_non_nullable
as String,partnerCode: null == partnerCode ? _self.partnerCode : partnerCode // ignore: cast_nullable_to_non_nullable
as String,status: null == status ? _self.status : status // ignore: cast_nullable_to_non_nullable
as ReferralPartnerStatus,displayName: freezed == displayName ? _self.displayName : displayName // ignore: cast_nullable_to_non_nullable
as String?,totalAccruedAmount: null == totalAccruedAmount ? _self.totalAccruedAmount : totalAccruedAmount // ignore: cast_nullable_to_non_nullable
as String,totalPaidAmount: null == totalPaidAmount ? _self.totalPaidAmount : totalPaidAmount // ignore: cast_nullable_to_non_nullable
as String,createdAt: null == createdAt ? _self.createdAt : createdAt // ignore: cast_nullable_to_non_nullable
as String,
  ));
}


}

// dart format on
