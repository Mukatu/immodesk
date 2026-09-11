// GENERATED CODE - DO NOT MODIFY BY HAND
// coverage:ignore-file
// ignore_for_file: type=lint
// ignore_for_file: unused_element, deprecated_member_use, deprecated_member_use_from_same_package, use_function_type_syntax_for_parameters, unnecessary_const, avoid_init_to_null, invalid_override_different_default_values_named, prefer_expression_function_bodies, annotate_overrides, invalid_annotation_target, unnecessary_question_mark

part of 'collector_balance.dart';

// **************************************************************************
// FreezedGenerator
// **************************************************************************

// dart format off
T _$identity<T>(T value) => value;

/// @nodoc
mixin _$CollectorBalance {

 String get userId; String get fullName; int get heldAmount; int get receiptsCount; String? get oldestReceiptAt; int get capAmount; bool get overCap; String? get lastRemittanceAt;
/// Create a copy of CollectorBalance
/// with the given fields replaced by the non-null parameter values.
@JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
$CollectorBalanceCopyWith<CollectorBalance> get copyWith => _$CollectorBalanceCopyWithImpl<CollectorBalance>(this as CollectorBalance, _$identity);

  /// Serializes this CollectorBalance to a JSON map.
  Map<String, dynamic> toJson();


@override
bool operator ==(Object other) {
  return identical(this, other) || (other.runtimeType == runtimeType&&other is CollectorBalance&&(identical(other.userId, userId) || other.userId == userId)&&(identical(other.fullName, fullName) || other.fullName == fullName)&&(identical(other.heldAmount, heldAmount) || other.heldAmount == heldAmount)&&(identical(other.receiptsCount, receiptsCount) || other.receiptsCount == receiptsCount)&&(identical(other.oldestReceiptAt, oldestReceiptAt) || other.oldestReceiptAt == oldestReceiptAt)&&(identical(other.capAmount, capAmount) || other.capAmount == capAmount)&&(identical(other.overCap, overCap) || other.overCap == overCap)&&(identical(other.lastRemittanceAt, lastRemittanceAt) || other.lastRemittanceAt == lastRemittanceAt));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode => Object.hash(runtimeType,userId,fullName,heldAmount,receiptsCount,oldestReceiptAt,capAmount,overCap,lastRemittanceAt);

@override
String toString() {
  return 'CollectorBalance(userId: $userId, fullName: $fullName, heldAmount: $heldAmount, receiptsCount: $receiptsCount, oldestReceiptAt: $oldestReceiptAt, capAmount: $capAmount, overCap: $overCap, lastRemittanceAt: $lastRemittanceAt)';
}


}

/// @nodoc
abstract mixin class $CollectorBalanceCopyWith<$Res>  {
  factory $CollectorBalanceCopyWith(CollectorBalance value, $Res Function(CollectorBalance) _then) = _$CollectorBalanceCopyWithImpl;
@useResult
$Res call({
 String userId, String fullName, int heldAmount, int receiptsCount, String? oldestReceiptAt, int capAmount, bool overCap, String? lastRemittanceAt
});




}
/// @nodoc
class _$CollectorBalanceCopyWithImpl<$Res>
    implements $CollectorBalanceCopyWith<$Res> {
  _$CollectorBalanceCopyWithImpl(this._self, this._then);

  final CollectorBalance _self;
  final $Res Function(CollectorBalance) _then;

/// Create a copy of CollectorBalance
/// with the given fields replaced by the non-null parameter values.
@pragma('vm:prefer-inline') @override $Res call({Object? userId = null,Object? fullName = null,Object? heldAmount = null,Object? receiptsCount = null,Object? oldestReceiptAt = freezed,Object? capAmount = null,Object? overCap = null,Object? lastRemittanceAt = freezed,}) {
  return _then(_self.copyWith(
userId: null == userId ? _self.userId : userId // ignore: cast_nullable_to_non_nullable
as String,fullName: null == fullName ? _self.fullName : fullName // ignore: cast_nullable_to_non_nullable
as String,heldAmount: null == heldAmount ? _self.heldAmount : heldAmount // ignore: cast_nullable_to_non_nullable
as int,receiptsCount: null == receiptsCount ? _self.receiptsCount : receiptsCount // ignore: cast_nullable_to_non_nullable
as int,oldestReceiptAt: freezed == oldestReceiptAt ? _self.oldestReceiptAt : oldestReceiptAt // ignore: cast_nullable_to_non_nullable
as String?,capAmount: null == capAmount ? _self.capAmount : capAmount // ignore: cast_nullable_to_non_nullable
as int,overCap: null == overCap ? _self.overCap : overCap // ignore: cast_nullable_to_non_nullable
as bool,lastRemittanceAt: freezed == lastRemittanceAt ? _self.lastRemittanceAt : lastRemittanceAt // ignore: cast_nullable_to_non_nullable
as String?,
  ));
}

}


/// Adds pattern-matching-related methods to [CollectorBalance].
extension CollectorBalancePatterns on CollectorBalance {
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

@optionalTypeArgs TResult maybeMap<TResult extends Object?>(TResult Function( _CollectorBalance value)?  $default,{required TResult orElse(),}){
final _that = this;
switch (_that) {
case _CollectorBalance() when $default != null:
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

@optionalTypeArgs TResult map<TResult extends Object?>(TResult Function( _CollectorBalance value)  $default,){
final _that = this;
switch (_that) {
case _CollectorBalance():
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

@optionalTypeArgs TResult? mapOrNull<TResult extends Object?>(TResult? Function( _CollectorBalance value)?  $default,){
final _that = this;
switch (_that) {
case _CollectorBalance() when $default != null:
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

@optionalTypeArgs TResult maybeWhen<TResult extends Object?>(TResult Function( String userId,  String fullName,  int heldAmount,  int receiptsCount,  String? oldestReceiptAt,  int capAmount,  bool overCap,  String? lastRemittanceAt)?  $default,{required TResult orElse(),}) {final _that = this;
switch (_that) {
case _CollectorBalance() when $default != null:
return $default(_that.userId,_that.fullName,_that.heldAmount,_that.receiptsCount,_that.oldestReceiptAt,_that.capAmount,_that.overCap,_that.lastRemittanceAt);case _:
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

@optionalTypeArgs TResult when<TResult extends Object?>(TResult Function( String userId,  String fullName,  int heldAmount,  int receiptsCount,  String? oldestReceiptAt,  int capAmount,  bool overCap,  String? lastRemittanceAt)  $default,) {final _that = this;
switch (_that) {
case _CollectorBalance():
return $default(_that.userId,_that.fullName,_that.heldAmount,_that.receiptsCount,_that.oldestReceiptAt,_that.capAmount,_that.overCap,_that.lastRemittanceAt);case _:
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

@optionalTypeArgs TResult? whenOrNull<TResult extends Object?>(TResult? Function( String userId,  String fullName,  int heldAmount,  int receiptsCount,  String? oldestReceiptAt,  int capAmount,  bool overCap,  String? lastRemittanceAt)?  $default,) {final _that = this;
switch (_that) {
case _CollectorBalance() when $default != null:
return $default(_that.userId,_that.fullName,_that.heldAmount,_that.receiptsCount,_that.oldestReceiptAt,_that.capAmount,_that.overCap,_that.lastRemittanceAt);case _:
  return null;

}
}

}

/// @nodoc
@JsonSerializable()

class _CollectorBalance implements CollectorBalance {
  const _CollectorBalance({required this.userId, required this.fullName, required this.heldAmount, required this.receiptsCount, this.oldestReceiptAt, required this.capAmount, required this.overCap, this.lastRemittanceAt});
  factory _CollectorBalance.fromJson(Map<String, dynamic> json) => _$CollectorBalanceFromJson(json);

@override final  String userId;
@override final  String fullName;
@override final  int heldAmount;
@override final  int receiptsCount;
@override final  String? oldestReceiptAt;
@override final  int capAmount;
@override final  bool overCap;
@override final  String? lastRemittanceAt;

/// Create a copy of CollectorBalance
/// with the given fields replaced by the non-null parameter values.
@override @JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
_$CollectorBalanceCopyWith<_CollectorBalance> get copyWith => __$CollectorBalanceCopyWithImpl<_CollectorBalance>(this, _$identity);

@override
Map<String, dynamic> toJson() {
  return _$CollectorBalanceToJson(this, );
}

@override
bool operator ==(Object other) {
  return identical(this, other) || (other.runtimeType == runtimeType&&other is _CollectorBalance&&(identical(other.userId, userId) || other.userId == userId)&&(identical(other.fullName, fullName) || other.fullName == fullName)&&(identical(other.heldAmount, heldAmount) || other.heldAmount == heldAmount)&&(identical(other.receiptsCount, receiptsCount) || other.receiptsCount == receiptsCount)&&(identical(other.oldestReceiptAt, oldestReceiptAt) || other.oldestReceiptAt == oldestReceiptAt)&&(identical(other.capAmount, capAmount) || other.capAmount == capAmount)&&(identical(other.overCap, overCap) || other.overCap == overCap)&&(identical(other.lastRemittanceAt, lastRemittanceAt) || other.lastRemittanceAt == lastRemittanceAt));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode => Object.hash(runtimeType,userId,fullName,heldAmount,receiptsCount,oldestReceiptAt,capAmount,overCap,lastRemittanceAt);

@override
String toString() {
  return 'CollectorBalance(userId: $userId, fullName: $fullName, heldAmount: $heldAmount, receiptsCount: $receiptsCount, oldestReceiptAt: $oldestReceiptAt, capAmount: $capAmount, overCap: $overCap, lastRemittanceAt: $lastRemittanceAt)';
}


}

/// @nodoc
abstract mixin class _$CollectorBalanceCopyWith<$Res> implements $CollectorBalanceCopyWith<$Res> {
  factory _$CollectorBalanceCopyWith(_CollectorBalance value, $Res Function(_CollectorBalance) _then) = __$CollectorBalanceCopyWithImpl;
@override @useResult
$Res call({
 String userId, String fullName, int heldAmount, int receiptsCount, String? oldestReceiptAt, int capAmount, bool overCap, String? lastRemittanceAt
});




}
/// @nodoc
class __$CollectorBalanceCopyWithImpl<$Res>
    implements _$CollectorBalanceCopyWith<$Res> {
  __$CollectorBalanceCopyWithImpl(this._self, this._then);

  final _CollectorBalance _self;
  final $Res Function(_CollectorBalance) _then;

/// Create a copy of CollectorBalance
/// with the given fields replaced by the non-null parameter values.
@override @pragma('vm:prefer-inline') $Res call({Object? userId = null,Object? fullName = null,Object? heldAmount = null,Object? receiptsCount = null,Object? oldestReceiptAt = freezed,Object? capAmount = null,Object? overCap = null,Object? lastRemittanceAt = freezed,}) {
  return _then(_CollectorBalance(
userId: null == userId ? _self.userId : userId // ignore: cast_nullable_to_non_nullable
as String,fullName: null == fullName ? _self.fullName : fullName // ignore: cast_nullable_to_non_nullable
as String,heldAmount: null == heldAmount ? _self.heldAmount : heldAmount // ignore: cast_nullable_to_non_nullable
as int,receiptsCount: null == receiptsCount ? _self.receiptsCount : receiptsCount // ignore: cast_nullable_to_non_nullable
as int,oldestReceiptAt: freezed == oldestReceiptAt ? _self.oldestReceiptAt : oldestReceiptAt // ignore: cast_nullable_to_non_nullable
as String?,capAmount: null == capAmount ? _self.capAmount : capAmount // ignore: cast_nullable_to_non_nullable
as int,overCap: null == overCap ? _self.overCap : overCap // ignore: cast_nullable_to_non_nullable
as bool,lastRemittanceAt: freezed == lastRemittanceAt ? _self.lastRemittanceAt : lastRemittanceAt // ignore: cast_nullable_to_non_nullable
as String?,
  ));
}


}

// dart format on
