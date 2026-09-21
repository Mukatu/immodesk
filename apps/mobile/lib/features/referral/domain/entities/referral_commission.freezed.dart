// GENERATED CODE - DO NOT MODIFY BY HAND
// coverage:ignore-file
// ignore_for_file: type=lint
// ignore_for_file: unused_element, deprecated_member_use, deprecated_member_use_from_same_package, use_function_type_syntax_for_parameters, unnecessary_const, avoid_init_to_null, invalid_override_different_default_values_named, prefer_expression_function_bodies, annotate_overrides, invalid_annotation_target, unnecessary_question_mark

part of 'referral_commission.dart';

// **************************************************************************
// FreezedGenerator
// **************************************************************************

// dart format off
T _$identity<T>(T value) => value;

/// @nodoc
mixin _$ReferralCommission {

 String get id; String get referralId; String get baseAmount; int get rateBps; String get commissionAmount; ReferralCommissionStatus get status; String? get periodMonth; String get accruedAt; String? get reversalOfId;
/// Create a copy of ReferralCommission
/// with the given fields replaced by the non-null parameter values.
@JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
$ReferralCommissionCopyWith<ReferralCommission> get copyWith => _$ReferralCommissionCopyWithImpl<ReferralCommission>(this as ReferralCommission, _$identity);

  /// Serializes this ReferralCommission to a JSON map.
  Map<String, dynamic> toJson();


@override
bool operator ==(Object other) {
  return identical(this, other) || (other.runtimeType == runtimeType&&other is ReferralCommission&&(identical(other.id, id) || other.id == id)&&(identical(other.referralId, referralId) || other.referralId == referralId)&&(identical(other.baseAmount, baseAmount) || other.baseAmount == baseAmount)&&(identical(other.rateBps, rateBps) || other.rateBps == rateBps)&&(identical(other.commissionAmount, commissionAmount) || other.commissionAmount == commissionAmount)&&(identical(other.status, status) || other.status == status)&&(identical(other.periodMonth, periodMonth) || other.periodMonth == periodMonth)&&(identical(other.accruedAt, accruedAt) || other.accruedAt == accruedAt)&&(identical(other.reversalOfId, reversalOfId) || other.reversalOfId == reversalOfId));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode => Object.hash(runtimeType,id,referralId,baseAmount,rateBps,commissionAmount,status,periodMonth,accruedAt,reversalOfId);

@override
String toString() {
  return 'ReferralCommission(id: $id, referralId: $referralId, baseAmount: $baseAmount, rateBps: $rateBps, commissionAmount: $commissionAmount, status: $status, periodMonth: $periodMonth, accruedAt: $accruedAt, reversalOfId: $reversalOfId)';
}


}

/// @nodoc
abstract mixin class $ReferralCommissionCopyWith<$Res>  {
  factory $ReferralCommissionCopyWith(ReferralCommission value, $Res Function(ReferralCommission) _then) = _$ReferralCommissionCopyWithImpl;
@useResult
$Res call({
 String id, String referralId, String baseAmount, int rateBps, String commissionAmount, ReferralCommissionStatus status, String? periodMonth, String accruedAt, String? reversalOfId
});




}
/// @nodoc
class _$ReferralCommissionCopyWithImpl<$Res>
    implements $ReferralCommissionCopyWith<$Res> {
  _$ReferralCommissionCopyWithImpl(this._self, this._then);

  final ReferralCommission _self;
  final $Res Function(ReferralCommission) _then;

/// Create a copy of ReferralCommission
/// with the given fields replaced by the non-null parameter values.
@pragma('vm:prefer-inline') @override $Res call({Object? id = null,Object? referralId = null,Object? baseAmount = null,Object? rateBps = null,Object? commissionAmount = null,Object? status = null,Object? periodMonth = freezed,Object? accruedAt = null,Object? reversalOfId = freezed,}) {
  return _then(_self.copyWith(
id: null == id ? _self.id : id // ignore: cast_nullable_to_non_nullable
as String,referralId: null == referralId ? _self.referralId : referralId // ignore: cast_nullable_to_non_nullable
as String,baseAmount: null == baseAmount ? _self.baseAmount : baseAmount // ignore: cast_nullable_to_non_nullable
as String,rateBps: null == rateBps ? _self.rateBps : rateBps // ignore: cast_nullable_to_non_nullable
as int,commissionAmount: null == commissionAmount ? _self.commissionAmount : commissionAmount // ignore: cast_nullable_to_non_nullable
as String,status: null == status ? _self.status : status // ignore: cast_nullable_to_non_nullable
as ReferralCommissionStatus,periodMonth: freezed == periodMonth ? _self.periodMonth : periodMonth // ignore: cast_nullable_to_non_nullable
as String?,accruedAt: null == accruedAt ? _self.accruedAt : accruedAt // ignore: cast_nullable_to_non_nullable
as String,reversalOfId: freezed == reversalOfId ? _self.reversalOfId : reversalOfId // ignore: cast_nullable_to_non_nullable
as String?,
  ));
}

}


/// Adds pattern-matching-related methods to [ReferralCommission].
extension ReferralCommissionPatterns on ReferralCommission {
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

@optionalTypeArgs TResult maybeMap<TResult extends Object?>(TResult Function( _ReferralCommission value)?  $default,{required TResult orElse(),}){
final _that = this;
switch (_that) {
case _ReferralCommission() when $default != null:
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

@optionalTypeArgs TResult map<TResult extends Object?>(TResult Function( _ReferralCommission value)  $default,){
final _that = this;
switch (_that) {
case _ReferralCommission():
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

@optionalTypeArgs TResult? mapOrNull<TResult extends Object?>(TResult? Function( _ReferralCommission value)?  $default,){
final _that = this;
switch (_that) {
case _ReferralCommission() when $default != null:
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

@optionalTypeArgs TResult maybeWhen<TResult extends Object?>(TResult Function( String id,  String referralId,  String baseAmount,  int rateBps,  String commissionAmount,  ReferralCommissionStatus status,  String? periodMonth,  String accruedAt,  String? reversalOfId)?  $default,{required TResult orElse(),}) {final _that = this;
switch (_that) {
case _ReferralCommission() when $default != null:
return $default(_that.id,_that.referralId,_that.baseAmount,_that.rateBps,_that.commissionAmount,_that.status,_that.periodMonth,_that.accruedAt,_that.reversalOfId);case _:
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

@optionalTypeArgs TResult when<TResult extends Object?>(TResult Function( String id,  String referralId,  String baseAmount,  int rateBps,  String commissionAmount,  ReferralCommissionStatus status,  String? periodMonth,  String accruedAt,  String? reversalOfId)  $default,) {final _that = this;
switch (_that) {
case _ReferralCommission():
return $default(_that.id,_that.referralId,_that.baseAmount,_that.rateBps,_that.commissionAmount,_that.status,_that.periodMonth,_that.accruedAt,_that.reversalOfId);case _:
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

@optionalTypeArgs TResult? whenOrNull<TResult extends Object?>(TResult? Function( String id,  String referralId,  String baseAmount,  int rateBps,  String commissionAmount,  ReferralCommissionStatus status,  String? periodMonth,  String accruedAt,  String? reversalOfId)?  $default,) {final _that = this;
switch (_that) {
case _ReferralCommission() when $default != null:
return $default(_that.id,_that.referralId,_that.baseAmount,_that.rateBps,_that.commissionAmount,_that.status,_that.periodMonth,_that.accruedAt,_that.reversalOfId);case _:
  return null;

}
}

}

/// @nodoc
@JsonSerializable()

class _ReferralCommission implements ReferralCommission {
  const _ReferralCommission({required this.id, required this.referralId, required this.baseAmount, required this.rateBps, required this.commissionAmount, required this.status, this.periodMonth, required this.accruedAt, this.reversalOfId});
  factory _ReferralCommission.fromJson(Map<String, dynamic> json) => _$ReferralCommissionFromJson(json);

@override final  String id;
@override final  String referralId;
@override final  String baseAmount;
@override final  int rateBps;
@override final  String commissionAmount;
@override final  ReferralCommissionStatus status;
@override final  String? periodMonth;
@override final  String accruedAt;
@override final  String? reversalOfId;

/// Create a copy of ReferralCommission
/// with the given fields replaced by the non-null parameter values.
@override @JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
_$ReferralCommissionCopyWith<_ReferralCommission> get copyWith => __$ReferralCommissionCopyWithImpl<_ReferralCommission>(this, _$identity);

@override
Map<String, dynamic> toJson() {
  return _$ReferralCommissionToJson(this, );
}

@override
bool operator ==(Object other) {
  return identical(this, other) || (other.runtimeType == runtimeType&&other is _ReferralCommission&&(identical(other.id, id) || other.id == id)&&(identical(other.referralId, referralId) || other.referralId == referralId)&&(identical(other.baseAmount, baseAmount) || other.baseAmount == baseAmount)&&(identical(other.rateBps, rateBps) || other.rateBps == rateBps)&&(identical(other.commissionAmount, commissionAmount) || other.commissionAmount == commissionAmount)&&(identical(other.status, status) || other.status == status)&&(identical(other.periodMonth, periodMonth) || other.periodMonth == periodMonth)&&(identical(other.accruedAt, accruedAt) || other.accruedAt == accruedAt)&&(identical(other.reversalOfId, reversalOfId) || other.reversalOfId == reversalOfId));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode => Object.hash(runtimeType,id,referralId,baseAmount,rateBps,commissionAmount,status,periodMonth,accruedAt,reversalOfId);

@override
String toString() {
  return 'ReferralCommission(id: $id, referralId: $referralId, baseAmount: $baseAmount, rateBps: $rateBps, commissionAmount: $commissionAmount, status: $status, periodMonth: $periodMonth, accruedAt: $accruedAt, reversalOfId: $reversalOfId)';
}


}

/// @nodoc
abstract mixin class _$ReferralCommissionCopyWith<$Res> implements $ReferralCommissionCopyWith<$Res> {
  factory _$ReferralCommissionCopyWith(_ReferralCommission value, $Res Function(_ReferralCommission) _then) = __$ReferralCommissionCopyWithImpl;
@override @useResult
$Res call({
 String id, String referralId, String baseAmount, int rateBps, String commissionAmount, ReferralCommissionStatus status, String? periodMonth, String accruedAt, String? reversalOfId
});




}
/// @nodoc
class __$ReferralCommissionCopyWithImpl<$Res>
    implements _$ReferralCommissionCopyWith<$Res> {
  __$ReferralCommissionCopyWithImpl(this._self, this._then);

  final _ReferralCommission _self;
  final $Res Function(_ReferralCommission) _then;

/// Create a copy of ReferralCommission
/// with the given fields replaced by the non-null parameter values.
@override @pragma('vm:prefer-inline') $Res call({Object? id = null,Object? referralId = null,Object? baseAmount = null,Object? rateBps = null,Object? commissionAmount = null,Object? status = null,Object? periodMonth = freezed,Object? accruedAt = null,Object? reversalOfId = freezed,}) {
  return _then(_ReferralCommission(
id: null == id ? _self.id : id // ignore: cast_nullable_to_non_nullable
as String,referralId: null == referralId ? _self.referralId : referralId // ignore: cast_nullable_to_non_nullable
as String,baseAmount: null == baseAmount ? _self.baseAmount : baseAmount // ignore: cast_nullable_to_non_nullable
as String,rateBps: null == rateBps ? _self.rateBps : rateBps // ignore: cast_nullable_to_non_nullable
as int,commissionAmount: null == commissionAmount ? _self.commissionAmount : commissionAmount // ignore: cast_nullable_to_non_nullable
as String,status: null == status ? _self.status : status // ignore: cast_nullable_to_non_nullable
as ReferralCommissionStatus,periodMonth: freezed == periodMonth ? _self.periodMonth : periodMonth // ignore: cast_nullable_to_non_nullable
as String?,accruedAt: null == accruedAt ? _self.accruedAt : accruedAt // ignore: cast_nullable_to_non_nullable
as String,reversalOfId: freezed == reversalOfId ? _self.reversalOfId : reversalOfId // ignore: cast_nullable_to_non_nullable
as String?,
  ));
}


}

// dart format on
