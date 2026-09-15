// GENERATED CODE - DO NOT MODIFY BY HAND
// coverage:ignore-file
// ignore_for_file: type=lint
// ignore_for_file: unused_element, deprecated_member_use, deprecated_member_use_from_same_package, use_function_type_syntax_for_parameters, unnecessary_const, avoid_init_to_null, invalid_override_different_default_values_named, prefer_expression_function_bodies, annotate_overrides, invalid_annotation_target, unnecessary_question_mark

part of 'owner_payout.dart';

// **************************************************************************
// FreezedGenerator
// **************************************************************************

// dart format off
T _$identity<T>(T value) => value;

/// @nodoc
mixin _$OwnerPayout {

 String get id; String get reference; String? get statementId; PayoutStatus get status; PaymentMethod get method; int get amount; int get feeAmount; int get netAmount; String? get scheduledDate; String? get approvedAt; String? get paidAt; String? get failureReason;
/// Create a copy of OwnerPayout
/// with the given fields replaced by the non-null parameter values.
@JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
$OwnerPayoutCopyWith<OwnerPayout> get copyWith => _$OwnerPayoutCopyWithImpl<OwnerPayout>(this as OwnerPayout, _$identity);

  /// Serializes this OwnerPayout to a JSON map.
  Map<String, dynamic> toJson();


@override
bool operator ==(Object other) {
  return identical(this, other) || (other.runtimeType == runtimeType&&other is OwnerPayout&&(identical(other.id, id) || other.id == id)&&(identical(other.reference, reference) || other.reference == reference)&&(identical(other.statementId, statementId) || other.statementId == statementId)&&(identical(other.status, status) || other.status == status)&&(identical(other.method, method) || other.method == method)&&(identical(other.amount, amount) || other.amount == amount)&&(identical(other.feeAmount, feeAmount) || other.feeAmount == feeAmount)&&(identical(other.netAmount, netAmount) || other.netAmount == netAmount)&&(identical(other.scheduledDate, scheduledDate) || other.scheduledDate == scheduledDate)&&(identical(other.approvedAt, approvedAt) || other.approvedAt == approvedAt)&&(identical(other.paidAt, paidAt) || other.paidAt == paidAt)&&(identical(other.failureReason, failureReason) || other.failureReason == failureReason));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode => Object.hash(runtimeType,id,reference,statementId,status,method,amount,feeAmount,netAmount,scheduledDate,approvedAt,paidAt,failureReason);

@override
String toString() {
  return 'OwnerPayout(id: $id, reference: $reference, statementId: $statementId, status: $status, method: $method, amount: $amount, feeAmount: $feeAmount, netAmount: $netAmount, scheduledDate: $scheduledDate, approvedAt: $approvedAt, paidAt: $paidAt, failureReason: $failureReason)';
}


}

/// @nodoc
abstract mixin class $OwnerPayoutCopyWith<$Res>  {
  factory $OwnerPayoutCopyWith(OwnerPayout value, $Res Function(OwnerPayout) _then) = _$OwnerPayoutCopyWithImpl;
@useResult
$Res call({
 String id, String reference, String? statementId, PayoutStatus status, PaymentMethod method, int amount, int feeAmount, int netAmount, String? scheduledDate, String? approvedAt, String? paidAt, String? failureReason
});




}
/// @nodoc
class _$OwnerPayoutCopyWithImpl<$Res>
    implements $OwnerPayoutCopyWith<$Res> {
  _$OwnerPayoutCopyWithImpl(this._self, this._then);

  final OwnerPayout _self;
  final $Res Function(OwnerPayout) _then;

/// Create a copy of OwnerPayout
/// with the given fields replaced by the non-null parameter values.
@pragma('vm:prefer-inline') @override $Res call({Object? id = null,Object? reference = null,Object? statementId = freezed,Object? status = null,Object? method = null,Object? amount = null,Object? feeAmount = null,Object? netAmount = null,Object? scheduledDate = freezed,Object? approvedAt = freezed,Object? paidAt = freezed,Object? failureReason = freezed,}) {
  return _then(_self.copyWith(
id: null == id ? _self.id : id // ignore: cast_nullable_to_non_nullable
as String,reference: null == reference ? _self.reference : reference // ignore: cast_nullable_to_non_nullable
as String,statementId: freezed == statementId ? _self.statementId : statementId // ignore: cast_nullable_to_non_nullable
as String?,status: null == status ? _self.status : status // ignore: cast_nullable_to_non_nullable
as PayoutStatus,method: null == method ? _self.method : method // ignore: cast_nullable_to_non_nullable
as PaymentMethod,amount: null == amount ? _self.amount : amount // ignore: cast_nullable_to_non_nullable
as int,feeAmount: null == feeAmount ? _self.feeAmount : feeAmount // ignore: cast_nullable_to_non_nullable
as int,netAmount: null == netAmount ? _self.netAmount : netAmount // ignore: cast_nullable_to_non_nullable
as int,scheduledDate: freezed == scheduledDate ? _self.scheduledDate : scheduledDate // ignore: cast_nullable_to_non_nullable
as String?,approvedAt: freezed == approvedAt ? _self.approvedAt : approvedAt // ignore: cast_nullable_to_non_nullable
as String?,paidAt: freezed == paidAt ? _self.paidAt : paidAt // ignore: cast_nullable_to_non_nullable
as String?,failureReason: freezed == failureReason ? _self.failureReason : failureReason // ignore: cast_nullable_to_non_nullable
as String?,
  ));
}

}


/// Adds pattern-matching-related methods to [OwnerPayout].
extension OwnerPayoutPatterns on OwnerPayout {
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

@optionalTypeArgs TResult maybeMap<TResult extends Object?>(TResult Function( _OwnerPayout value)?  $default,{required TResult orElse(),}){
final _that = this;
switch (_that) {
case _OwnerPayout() when $default != null:
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

@optionalTypeArgs TResult map<TResult extends Object?>(TResult Function( _OwnerPayout value)  $default,){
final _that = this;
switch (_that) {
case _OwnerPayout():
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

@optionalTypeArgs TResult? mapOrNull<TResult extends Object?>(TResult? Function( _OwnerPayout value)?  $default,){
final _that = this;
switch (_that) {
case _OwnerPayout() when $default != null:
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

@optionalTypeArgs TResult maybeWhen<TResult extends Object?>(TResult Function( String id,  String reference,  String? statementId,  PayoutStatus status,  PaymentMethod method,  int amount,  int feeAmount,  int netAmount,  String? scheduledDate,  String? approvedAt,  String? paidAt,  String? failureReason)?  $default,{required TResult orElse(),}) {final _that = this;
switch (_that) {
case _OwnerPayout() when $default != null:
return $default(_that.id,_that.reference,_that.statementId,_that.status,_that.method,_that.amount,_that.feeAmount,_that.netAmount,_that.scheduledDate,_that.approvedAt,_that.paidAt,_that.failureReason);case _:
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

@optionalTypeArgs TResult when<TResult extends Object?>(TResult Function( String id,  String reference,  String? statementId,  PayoutStatus status,  PaymentMethod method,  int amount,  int feeAmount,  int netAmount,  String? scheduledDate,  String? approvedAt,  String? paidAt,  String? failureReason)  $default,) {final _that = this;
switch (_that) {
case _OwnerPayout():
return $default(_that.id,_that.reference,_that.statementId,_that.status,_that.method,_that.amount,_that.feeAmount,_that.netAmount,_that.scheduledDate,_that.approvedAt,_that.paidAt,_that.failureReason);case _:
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

@optionalTypeArgs TResult? whenOrNull<TResult extends Object?>(TResult? Function( String id,  String reference,  String? statementId,  PayoutStatus status,  PaymentMethod method,  int amount,  int feeAmount,  int netAmount,  String? scheduledDate,  String? approvedAt,  String? paidAt,  String? failureReason)?  $default,) {final _that = this;
switch (_that) {
case _OwnerPayout() when $default != null:
return $default(_that.id,_that.reference,_that.statementId,_that.status,_that.method,_that.amount,_that.feeAmount,_that.netAmount,_that.scheduledDate,_that.approvedAt,_that.paidAt,_that.failureReason);case _:
  return null;

}
}

}

/// @nodoc
@JsonSerializable()

class _OwnerPayout implements OwnerPayout {
  const _OwnerPayout({required this.id, required this.reference, this.statementId, required this.status, required this.method, required this.amount, this.feeAmount = 0, required this.netAmount, this.scheduledDate, this.approvedAt, this.paidAt, this.failureReason});
  factory _OwnerPayout.fromJson(Map<String, dynamic> json) => _$OwnerPayoutFromJson(json);

@override final  String id;
@override final  String reference;
@override final  String? statementId;
@override final  PayoutStatus status;
@override final  PaymentMethod method;
@override final  int amount;
@override@JsonKey() final  int feeAmount;
@override final  int netAmount;
@override final  String? scheduledDate;
@override final  String? approvedAt;
@override final  String? paidAt;
@override final  String? failureReason;

/// Create a copy of OwnerPayout
/// with the given fields replaced by the non-null parameter values.
@override @JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
_$OwnerPayoutCopyWith<_OwnerPayout> get copyWith => __$OwnerPayoutCopyWithImpl<_OwnerPayout>(this, _$identity);

@override
Map<String, dynamic> toJson() {
  return _$OwnerPayoutToJson(this, );
}

@override
bool operator ==(Object other) {
  return identical(this, other) || (other.runtimeType == runtimeType&&other is _OwnerPayout&&(identical(other.id, id) || other.id == id)&&(identical(other.reference, reference) || other.reference == reference)&&(identical(other.statementId, statementId) || other.statementId == statementId)&&(identical(other.status, status) || other.status == status)&&(identical(other.method, method) || other.method == method)&&(identical(other.amount, amount) || other.amount == amount)&&(identical(other.feeAmount, feeAmount) || other.feeAmount == feeAmount)&&(identical(other.netAmount, netAmount) || other.netAmount == netAmount)&&(identical(other.scheduledDate, scheduledDate) || other.scheduledDate == scheduledDate)&&(identical(other.approvedAt, approvedAt) || other.approvedAt == approvedAt)&&(identical(other.paidAt, paidAt) || other.paidAt == paidAt)&&(identical(other.failureReason, failureReason) || other.failureReason == failureReason));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode => Object.hash(runtimeType,id,reference,statementId,status,method,amount,feeAmount,netAmount,scheduledDate,approvedAt,paidAt,failureReason);

@override
String toString() {
  return 'OwnerPayout(id: $id, reference: $reference, statementId: $statementId, status: $status, method: $method, amount: $amount, feeAmount: $feeAmount, netAmount: $netAmount, scheduledDate: $scheduledDate, approvedAt: $approvedAt, paidAt: $paidAt, failureReason: $failureReason)';
}


}

/// @nodoc
abstract mixin class _$OwnerPayoutCopyWith<$Res> implements $OwnerPayoutCopyWith<$Res> {
  factory _$OwnerPayoutCopyWith(_OwnerPayout value, $Res Function(_OwnerPayout) _then) = __$OwnerPayoutCopyWithImpl;
@override @useResult
$Res call({
 String id, String reference, String? statementId, PayoutStatus status, PaymentMethod method, int amount, int feeAmount, int netAmount, String? scheduledDate, String? approvedAt, String? paidAt, String? failureReason
});




}
/// @nodoc
class __$OwnerPayoutCopyWithImpl<$Res>
    implements _$OwnerPayoutCopyWith<$Res> {
  __$OwnerPayoutCopyWithImpl(this._self, this._then);

  final _OwnerPayout _self;
  final $Res Function(_OwnerPayout) _then;

/// Create a copy of OwnerPayout
/// with the given fields replaced by the non-null parameter values.
@override @pragma('vm:prefer-inline') $Res call({Object? id = null,Object? reference = null,Object? statementId = freezed,Object? status = null,Object? method = null,Object? amount = null,Object? feeAmount = null,Object? netAmount = null,Object? scheduledDate = freezed,Object? approvedAt = freezed,Object? paidAt = freezed,Object? failureReason = freezed,}) {
  return _then(_OwnerPayout(
id: null == id ? _self.id : id // ignore: cast_nullable_to_non_nullable
as String,reference: null == reference ? _self.reference : reference // ignore: cast_nullable_to_non_nullable
as String,statementId: freezed == statementId ? _self.statementId : statementId // ignore: cast_nullable_to_non_nullable
as String?,status: null == status ? _self.status : status // ignore: cast_nullable_to_non_nullable
as PayoutStatus,method: null == method ? _self.method : method // ignore: cast_nullable_to_non_nullable
as PaymentMethod,amount: null == amount ? _self.amount : amount // ignore: cast_nullable_to_non_nullable
as int,feeAmount: null == feeAmount ? _self.feeAmount : feeAmount // ignore: cast_nullable_to_non_nullable
as int,netAmount: null == netAmount ? _self.netAmount : netAmount // ignore: cast_nullable_to_non_nullable
as int,scheduledDate: freezed == scheduledDate ? _self.scheduledDate : scheduledDate // ignore: cast_nullable_to_non_nullable
as String?,approvedAt: freezed == approvedAt ? _self.approvedAt : approvedAt // ignore: cast_nullable_to_non_nullable
as String?,paidAt: freezed == paidAt ? _self.paidAt : paidAt // ignore: cast_nullable_to_non_nullable
as String?,failureReason: freezed == failureReason ? _self.failureReason : failureReason // ignore: cast_nullable_to_non_nullable
as String?,
  ));
}


}

// dart format on
