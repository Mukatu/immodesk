// GENERATED CODE - DO NOT MODIFY BY HAND
// coverage:ignore-file
// ignore_for_file: type=lint
// ignore_for_file: unused_element, deprecated_member_use, deprecated_member_use_from_same_package, use_function_type_syntax_for_parameters, unnecessary_const, avoid_init_to_null, invalid_override_different_default_values_named, prefer_expression_function_bodies, annotate_overrides, invalid_annotation_target, unnecessary_question_mark

part of 'rent_revision.dart';

// **************************************************************************
// FreezedGenerator
// **************************************************************************

// dart format off
T _$identity<T>(T value) => value;

/// @nodoc
mixin _$RentRevision {

 String get id; String get leaseId; String get effectiveDate; int get previousRentAmount; int get newRentAmount; int get previousChargesAmount; int get newChargesAmount; String? get reason;
/// Create a copy of RentRevision
/// with the given fields replaced by the non-null parameter values.
@JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
$RentRevisionCopyWith<RentRevision> get copyWith => _$RentRevisionCopyWithImpl<RentRevision>(this as RentRevision, _$identity);

  /// Serializes this RentRevision to a JSON map.
  Map<String, dynamic> toJson();


@override
bool operator ==(Object other) {
  return identical(this, other) || (other.runtimeType == runtimeType&&other is RentRevision&&(identical(other.id, id) || other.id == id)&&(identical(other.leaseId, leaseId) || other.leaseId == leaseId)&&(identical(other.effectiveDate, effectiveDate) || other.effectiveDate == effectiveDate)&&(identical(other.previousRentAmount, previousRentAmount) || other.previousRentAmount == previousRentAmount)&&(identical(other.newRentAmount, newRentAmount) || other.newRentAmount == newRentAmount)&&(identical(other.previousChargesAmount, previousChargesAmount) || other.previousChargesAmount == previousChargesAmount)&&(identical(other.newChargesAmount, newChargesAmount) || other.newChargesAmount == newChargesAmount)&&(identical(other.reason, reason) || other.reason == reason));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode => Object.hash(runtimeType,id,leaseId,effectiveDate,previousRentAmount,newRentAmount,previousChargesAmount,newChargesAmount,reason);

@override
String toString() {
  return 'RentRevision(id: $id, leaseId: $leaseId, effectiveDate: $effectiveDate, previousRentAmount: $previousRentAmount, newRentAmount: $newRentAmount, previousChargesAmount: $previousChargesAmount, newChargesAmount: $newChargesAmount, reason: $reason)';
}


}

/// @nodoc
abstract mixin class $RentRevisionCopyWith<$Res>  {
  factory $RentRevisionCopyWith(RentRevision value, $Res Function(RentRevision) _then) = _$RentRevisionCopyWithImpl;
@useResult
$Res call({
 String id, String leaseId, String effectiveDate, int previousRentAmount, int newRentAmount, int previousChargesAmount, int newChargesAmount, String? reason
});




}
/// @nodoc
class _$RentRevisionCopyWithImpl<$Res>
    implements $RentRevisionCopyWith<$Res> {
  _$RentRevisionCopyWithImpl(this._self, this._then);

  final RentRevision _self;
  final $Res Function(RentRevision) _then;

/// Create a copy of RentRevision
/// with the given fields replaced by the non-null parameter values.
@pragma('vm:prefer-inline') @override $Res call({Object? id = null,Object? leaseId = null,Object? effectiveDate = null,Object? previousRentAmount = null,Object? newRentAmount = null,Object? previousChargesAmount = null,Object? newChargesAmount = null,Object? reason = freezed,}) {
  return _then(_self.copyWith(
id: null == id ? _self.id : id // ignore: cast_nullable_to_non_nullable
as String,leaseId: null == leaseId ? _self.leaseId : leaseId // ignore: cast_nullable_to_non_nullable
as String,effectiveDate: null == effectiveDate ? _self.effectiveDate : effectiveDate // ignore: cast_nullable_to_non_nullable
as String,previousRentAmount: null == previousRentAmount ? _self.previousRentAmount : previousRentAmount // ignore: cast_nullable_to_non_nullable
as int,newRentAmount: null == newRentAmount ? _self.newRentAmount : newRentAmount // ignore: cast_nullable_to_non_nullable
as int,previousChargesAmount: null == previousChargesAmount ? _self.previousChargesAmount : previousChargesAmount // ignore: cast_nullable_to_non_nullable
as int,newChargesAmount: null == newChargesAmount ? _self.newChargesAmount : newChargesAmount // ignore: cast_nullable_to_non_nullable
as int,reason: freezed == reason ? _self.reason : reason // ignore: cast_nullable_to_non_nullable
as String?,
  ));
}

}


/// Adds pattern-matching-related methods to [RentRevision].
extension RentRevisionPatterns on RentRevision {
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

@optionalTypeArgs TResult maybeMap<TResult extends Object?>(TResult Function( _RentRevision value)?  $default,{required TResult orElse(),}){
final _that = this;
switch (_that) {
case _RentRevision() when $default != null:
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

@optionalTypeArgs TResult map<TResult extends Object?>(TResult Function( _RentRevision value)  $default,){
final _that = this;
switch (_that) {
case _RentRevision():
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

@optionalTypeArgs TResult? mapOrNull<TResult extends Object?>(TResult? Function( _RentRevision value)?  $default,){
final _that = this;
switch (_that) {
case _RentRevision() when $default != null:
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

@optionalTypeArgs TResult maybeWhen<TResult extends Object?>(TResult Function( String id,  String leaseId,  String effectiveDate,  int previousRentAmount,  int newRentAmount,  int previousChargesAmount,  int newChargesAmount,  String? reason)?  $default,{required TResult orElse(),}) {final _that = this;
switch (_that) {
case _RentRevision() when $default != null:
return $default(_that.id,_that.leaseId,_that.effectiveDate,_that.previousRentAmount,_that.newRentAmount,_that.previousChargesAmount,_that.newChargesAmount,_that.reason);case _:
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

@optionalTypeArgs TResult when<TResult extends Object?>(TResult Function( String id,  String leaseId,  String effectiveDate,  int previousRentAmount,  int newRentAmount,  int previousChargesAmount,  int newChargesAmount,  String? reason)  $default,) {final _that = this;
switch (_that) {
case _RentRevision():
return $default(_that.id,_that.leaseId,_that.effectiveDate,_that.previousRentAmount,_that.newRentAmount,_that.previousChargesAmount,_that.newChargesAmount,_that.reason);case _:
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

@optionalTypeArgs TResult? whenOrNull<TResult extends Object?>(TResult? Function( String id,  String leaseId,  String effectiveDate,  int previousRentAmount,  int newRentAmount,  int previousChargesAmount,  int newChargesAmount,  String? reason)?  $default,) {final _that = this;
switch (_that) {
case _RentRevision() when $default != null:
return $default(_that.id,_that.leaseId,_that.effectiveDate,_that.previousRentAmount,_that.newRentAmount,_that.previousChargesAmount,_that.newChargesAmount,_that.reason);case _:
  return null;

}
}

}

/// @nodoc
@JsonSerializable()

class _RentRevision implements RentRevision {
  const _RentRevision({required this.id, required this.leaseId, required this.effectiveDate, required this.previousRentAmount, required this.newRentAmount, required this.previousChargesAmount, required this.newChargesAmount, this.reason});
  factory _RentRevision.fromJson(Map<String, dynamic> json) => _$RentRevisionFromJson(json);

@override final  String id;
@override final  String leaseId;
@override final  String effectiveDate;
@override final  int previousRentAmount;
@override final  int newRentAmount;
@override final  int previousChargesAmount;
@override final  int newChargesAmount;
@override final  String? reason;

/// Create a copy of RentRevision
/// with the given fields replaced by the non-null parameter values.
@override @JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
_$RentRevisionCopyWith<_RentRevision> get copyWith => __$RentRevisionCopyWithImpl<_RentRevision>(this, _$identity);

@override
Map<String, dynamic> toJson() {
  return _$RentRevisionToJson(this, );
}

@override
bool operator ==(Object other) {
  return identical(this, other) || (other.runtimeType == runtimeType&&other is _RentRevision&&(identical(other.id, id) || other.id == id)&&(identical(other.leaseId, leaseId) || other.leaseId == leaseId)&&(identical(other.effectiveDate, effectiveDate) || other.effectiveDate == effectiveDate)&&(identical(other.previousRentAmount, previousRentAmount) || other.previousRentAmount == previousRentAmount)&&(identical(other.newRentAmount, newRentAmount) || other.newRentAmount == newRentAmount)&&(identical(other.previousChargesAmount, previousChargesAmount) || other.previousChargesAmount == previousChargesAmount)&&(identical(other.newChargesAmount, newChargesAmount) || other.newChargesAmount == newChargesAmount)&&(identical(other.reason, reason) || other.reason == reason));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode => Object.hash(runtimeType,id,leaseId,effectiveDate,previousRentAmount,newRentAmount,previousChargesAmount,newChargesAmount,reason);

@override
String toString() {
  return 'RentRevision(id: $id, leaseId: $leaseId, effectiveDate: $effectiveDate, previousRentAmount: $previousRentAmount, newRentAmount: $newRentAmount, previousChargesAmount: $previousChargesAmount, newChargesAmount: $newChargesAmount, reason: $reason)';
}


}

/// @nodoc
abstract mixin class _$RentRevisionCopyWith<$Res> implements $RentRevisionCopyWith<$Res> {
  factory _$RentRevisionCopyWith(_RentRevision value, $Res Function(_RentRevision) _then) = __$RentRevisionCopyWithImpl;
@override @useResult
$Res call({
 String id, String leaseId, String effectiveDate, int previousRentAmount, int newRentAmount, int previousChargesAmount, int newChargesAmount, String? reason
});




}
/// @nodoc
class __$RentRevisionCopyWithImpl<$Res>
    implements _$RentRevisionCopyWith<$Res> {
  __$RentRevisionCopyWithImpl(this._self, this._then);

  final _RentRevision _self;
  final $Res Function(_RentRevision) _then;

/// Create a copy of RentRevision
/// with the given fields replaced by the non-null parameter values.
@override @pragma('vm:prefer-inline') $Res call({Object? id = null,Object? leaseId = null,Object? effectiveDate = null,Object? previousRentAmount = null,Object? newRentAmount = null,Object? previousChargesAmount = null,Object? newChargesAmount = null,Object? reason = freezed,}) {
  return _then(_RentRevision(
id: null == id ? _self.id : id // ignore: cast_nullable_to_non_nullable
as String,leaseId: null == leaseId ? _self.leaseId : leaseId // ignore: cast_nullable_to_non_nullable
as String,effectiveDate: null == effectiveDate ? _self.effectiveDate : effectiveDate // ignore: cast_nullable_to_non_nullable
as String,previousRentAmount: null == previousRentAmount ? _self.previousRentAmount : previousRentAmount // ignore: cast_nullable_to_non_nullable
as int,newRentAmount: null == newRentAmount ? _self.newRentAmount : newRentAmount // ignore: cast_nullable_to_non_nullable
as int,previousChargesAmount: null == previousChargesAmount ? _self.previousChargesAmount : previousChargesAmount // ignore: cast_nullable_to_non_nullable
as int,newChargesAmount: null == newChargesAmount ? _self.newChargesAmount : newChargesAmount // ignore: cast_nullable_to_non_nullable
as int,reason: freezed == reason ? _self.reason : reason // ignore: cast_nullable_to_non_nullable
as String?,
  ));
}


}

// dart format on
