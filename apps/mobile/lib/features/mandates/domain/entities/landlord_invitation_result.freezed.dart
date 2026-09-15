// GENERATED CODE - DO NOT MODIFY BY HAND
// coverage:ignore-file
// ignore_for_file: type=lint
// ignore_for_file: unused_element, deprecated_member_use, deprecated_member_use_from_same_package, use_function_type_syntax_for_parameters, unnecessary_const, avoid_init_to_null, invalid_override_different_default_values_named, prefer_expression_function_bodies, annotate_overrides, invalid_annotation_target, unnecessary_question_mark

part of 'landlord_invitation_result.dart';

// **************************************************************************
// FreezedGenerator
// **************************************************************************

// dart format off
T _$identity<T>(T value) => value;

/// @nodoc
mixin _$LandlordInvitationResult {

 String get notificationId; String get invitationStatus;
/// Create a copy of LandlordInvitationResult
/// with the given fields replaced by the non-null parameter values.
@JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
$LandlordInvitationResultCopyWith<LandlordInvitationResult> get copyWith => _$LandlordInvitationResultCopyWithImpl<LandlordInvitationResult>(this as LandlordInvitationResult, _$identity);

  /// Serializes this LandlordInvitationResult to a JSON map.
  Map<String, dynamic> toJson();


@override
bool operator ==(Object other) {
  return identical(this, other) || (other.runtimeType == runtimeType&&other is LandlordInvitationResult&&(identical(other.notificationId, notificationId) || other.notificationId == notificationId)&&(identical(other.invitationStatus, invitationStatus) || other.invitationStatus == invitationStatus));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode => Object.hash(runtimeType,notificationId,invitationStatus);

@override
String toString() {
  return 'LandlordInvitationResult(notificationId: $notificationId, invitationStatus: $invitationStatus)';
}


}

/// @nodoc
abstract mixin class $LandlordInvitationResultCopyWith<$Res>  {
  factory $LandlordInvitationResultCopyWith(LandlordInvitationResult value, $Res Function(LandlordInvitationResult) _then) = _$LandlordInvitationResultCopyWithImpl;
@useResult
$Res call({
 String notificationId, String invitationStatus
});




}
/// @nodoc
class _$LandlordInvitationResultCopyWithImpl<$Res>
    implements $LandlordInvitationResultCopyWith<$Res> {
  _$LandlordInvitationResultCopyWithImpl(this._self, this._then);

  final LandlordInvitationResult _self;
  final $Res Function(LandlordInvitationResult) _then;

/// Create a copy of LandlordInvitationResult
/// with the given fields replaced by the non-null parameter values.
@pragma('vm:prefer-inline') @override $Res call({Object? notificationId = null,Object? invitationStatus = null,}) {
  return _then(_self.copyWith(
notificationId: null == notificationId ? _self.notificationId : notificationId // ignore: cast_nullable_to_non_nullable
as String,invitationStatus: null == invitationStatus ? _self.invitationStatus : invitationStatus // ignore: cast_nullable_to_non_nullable
as String,
  ));
}

}


/// Adds pattern-matching-related methods to [LandlordInvitationResult].
extension LandlordInvitationResultPatterns on LandlordInvitationResult {
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

@optionalTypeArgs TResult maybeMap<TResult extends Object?>(TResult Function( _LandlordInvitationResult value)?  $default,{required TResult orElse(),}){
final _that = this;
switch (_that) {
case _LandlordInvitationResult() when $default != null:
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

@optionalTypeArgs TResult map<TResult extends Object?>(TResult Function( _LandlordInvitationResult value)  $default,){
final _that = this;
switch (_that) {
case _LandlordInvitationResult():
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

@optionalTypeArgs TResult? mapOrNull<TResult extends Object?>(TResult? Function( _LandlordInvitationResult value)?  $default,){
final _that = this;
switch (_that) {
case _LandlordInvitationResult() when $default != null:
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

@optionalTypeArgs TResult maybeWhen<TResult extends Object?>(TResult Function( String notificationId,  String invitationStatus)?  $default,{required TResult orElse(),}) {final _that = this;
switch (_that) {
case _LandlordInvitationResult() when $default != null:
return $default(_that.notificationId,_that.invitationStatus);case _:
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

@optionalTypeArgs TResult when<TResult extends Object?>(TResult Function( String notificationId,  String invitationStatus)  $default,) {final _that = this;
switch (_that) {
case _LandlordInvitationResult():
return $default(_that.notificationId,_that.invitationStatus);case _:
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

@optionalTypeArgs TResult? whenOrNull<TResult extends Object?>(TResult? Function( String notificationId,  String invitationStatus)?  $default,) {final _that = this;
switch (_that) {
case _LandlordInvitationResult() when $default != null:
return $default(_that.notificationId,_that.invitationStatus);case _:
  return null;

}
}

}

/// @nodoc
@JsonSerializable()

class _LandlordInvitationResult implements LandlordInvitationResult {
  const _LandlordInvitationResult({required this.notificationId, required this.invitationStatus});
  factory _LandlordInvitationResult.fromJson(Map<String, dynamic> json) => _$LandlordInvitationResultFromJson(json);

@override final  String notificationId;
@override final  String invitationStatus;

/// Create a copy of LandlordInvitationResult
/// with the given fields replaced by the non-null parameter values.
@override @JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
_$LandlordInvitationResultCopyWith<_LandlordInvitationResult> get copyWith => __$LandlordInvitationResultCopyWithImpl<_LandlordInvitationResult>(this, _$identity);

@override
Map<String, dynamic> toJson() {
  return _$LandlordInvitationResultToJson(this, );
}

@override
bool operator ==(Object other) {
  return identical(this, other) || (other.runtimeType == runtimeType&&other is _LandlordInvitationResult&&(identical(other.notificationId, notificationId) || other.notificationId == notificationId)&&(identical(other.invitationStatus, invitationStatus) || other.invitationStatus == invitationStatus));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode => Object.hash(runtimeType,notificationId,invitationStatus);

@override
String toString() {
  return 'LandlordInvitationResult(notificationId: $notificationId, invitationStatus: $invitationStatus)';
}


}

/// @nodoc
abstract mixin class _$LandlordInvitationResultCopyWith<$Res> implements $LandlordInvitationResultCopyWith<$Res> {
  factory _$LandlordInvitationResultCopyWith(_LandlordInvitationResult value, $Res Function(_LandlordInvitationResult) _then) = __$LandlordInvitationResultCopyWithImpl;
@override @useResult
$Res call({
 String notificationId, String invitationStatus
});




}
/// @nodoc
class __$LandlordInvitationResultCopyWithImpl<$Res>
    implements _$LandlordInvitationResultCopyWith<$Res> {
  __$LandlordInvitationResultCopyWithImpl(this._self, this._then);

  final _LandlordInvitationResult _self;
  final $Res Function(_LandlordInvitationResult) _then;

/// Create a copy of LandlordInvitationResult
/// with the given fields replaced by the non-null parameter values.
@override @pragma('vm:prefer-inline') $Res call({Object? notificationId = null,Object? invitationStatus = null,}) {
  return _then(_LandlordInvitationResult(
notificationId: null == notificationId ? _self.notificationId : notificationId // ignore: cast_nullable_to_non_nullable
as String,invitationStatus: null == invitationStatus ? _self.invitationStatus : invitationStatus // ignore: cast_nullable_to_non_nullable
as String,
  ));
}


}

// dart format on
