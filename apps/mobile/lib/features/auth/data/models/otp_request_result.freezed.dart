// GENERATED CODE - DO NOT MODIFY BY HAND
// coverage:ignore-file
// ignore_for_file: type=lint
// ignore_for_file: unused_element, deprecated_member_use, deprecated_member_use_from_same_package, use_function_type_syntax_for_parameters, unnecessary_const, avoid_init_to_null, invalid_override_different_default_values_named, prefer_expression_function_bodies, annotate_overrides, invalid_annotation_target, unnecessary_question_mark

part of 'otp_request_result.dart';

// **************************************************************************
// FreezedGenerator
// **************************************************************************

// dart format off
T _$identity<T>(T value) => value;

/// @nodoc
mixin _$OtpRequestResult {

 String get requestId; String get channel; int get expiresInSeconds; int get resendAfterSeconds;
/// Create a copy of OtpRequestResult
/// with the given fields replaced by the non-null parameter values.
@JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
$OtpRequestResultCopyWith<OtpRequestResult> get copyWith => _$OtpRequestResultCopyWithImpl<OtpRequestResult>(this as OtpRequestResult, _$identity);

  /// Serializes this OtpRequestResult to a JSON map.
  Map<String, dynamic> toJson();


@override
bool operator ==(Object other) {
  return identical(this, other) || (other.runtimeType == runtimeType&&other is OtpRequestResult&&(identical(other.requestId, requestId) || other.requestId == requestId)&&(identical(other.channel, channel) || other.channel == channel)&&(identical(other.expiresInSeconds, expiresInSeconds) || other.expiresInSeconds == expiresInSeconds)&&(identical(other.resendAfterSeconds, resendAfterSeconds) || other.resendAfterSeconds == resendAfterSeconds));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode => Object.hash(runtimeType,requestId,channel,expiresInSeconds,resendAfterSeconds);

@override
String toString() {
  return 'OtpRequestResult(requestId: $requestId, channel: $channel, expiresInSeconds: $expiresInSeconds, resendAfterSeconds: $resendAfterSeconds)';
}


}

/// @nodoc
abstract mixin class $OtpRequestResultCopyWith<$Res>  {
  factory $OtpRequestResultCopyWith(OtpRequestResult value, $Res Function(OtpRequestResult) _then) = _$OtpRequestResultCopyWithImpl;
@useResult
$Res call({
 String requestId, String channel, int expiresInSeconds, int resendAfterSeconds
});




}
/// @nodoc
class _$OtpRequestResultCopyWithImpl<$Res>
    implements $OtpRequestResultCopyWith<$Res> {
  _$OtpRequestResultCopyWithImpl(this._self, this._then);

  final OtpRequestResult _self;
  final $Res Function(OtpRequestResult) _then;

/// Create a copy of OtpRequestResult
/// with the given fields replaced by the non-null parameter values.
@pragma('vm:prefer-inline') @override $Res call({Object? requestId = null,Object? channel = null,Object? expiresInSeconds = null,Object? resendAfterSeconds = null,}) {
  return _then(_self.copyWith(
requestId: null == requestId ? _self.requestId : requestId // ignore: cast_nullable_to_non_nullable
as String,channel: null == channel ? _self.channel : channel // ignore: cast_nullable_to_non_nullable
as String,expiresInSeconds: null == expiresInSeconds ? _self.expiresInSeconds : expiresInSeconds // ignore: cast_nullable_to_non_nullable
as int,resendAfterSeconds: null == resendAfterSeconds ? _self.resendAfterSeconds : resendAfterSeconds // ignore: cast_nullable_to_non_nullable
as int,
  ));
}

}


/// Adds pattern-matching-related methods to [OtpRequestResult].
extension OtpRequestResultPatterns on OtpRequestResult {
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

@optionalTypeArgs TResult maybeMap<TResult extends Object?>(TResult Function( _OtpRequestResult value)?  $default,{required TResult orElse(),}){
final _that = this;
switch (_that) {
case _OtpRequestResult() when $default != null:
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

@optionalTypeArgs TResult map<TResult extends Object?>(TResult Function( _OtpRequestResult value)  $default,){
final _that = this;
switch (_that) {
case _OtpRequestResult():
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

@optionalTypeArgs TResult? mapOrNull<TResult extends Object?>(TResult? Function( _OtpRequestResult value)?  $default,){
final _that = this;
switch (_that) {
case _OtpRequestResult() when $default != null:
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

@optionalTypeArgs TResult maybeWhen<TResult extends Object?>(TResult Function( String requestId,  String channel,  int expiresInSeconds,  int resendAfterSeconds)?  $default,{required TResult orElse(),}) {final _that = this;
switch (_that) {
case _OtpRequestResult() when $default != null:
return $default(_that.requestId,_that.channel,_that.expiresInSeconds,_that.resendAfterSeconds);case _:
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

@optionalTypeArgs TResult when<TResult extends Object?>(TResult Function( String requestId,  String channel,  int expiresInSeconds,  int resendAfterSeconds)  $default,) {final _that = this;
switch (_that) {
case _OtpRequestResult():
return $default(_that.requestId,_that.channel,_that.expiresInSeconds,_that.resendAfterSeconds);case _:
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

@optionalTypeArgs TResult? whenOrNull<TResult extends Object?>(TResult? Function( String requestId,  String channel,  int expiresInSeconds,  int resendAfterSeconds)?  $default,) {final _that = this;
switch (_that) {
case _OtpRequestResult() when $default != null:
return $default(_that.requestId,_that.channel,_that.expiresInSeconds,_that.resendAfterSeconds);case _:
  return null;

}
}

}

/// @nodoc
@JsonSerializable()

class _OtpRequestResult implements OtpRequestResult {
  const _OtpRequestResult({required this.requestId, required this.channel, required this.expiresInSeconds, required this.resendAfterSeconds});
  factory _OtpRequestResult.fromJson(Map<String, dynamic> json) => _$OtpRequestResultFromJson(json);

@override final  String requestId;
@override final  String channel;
@override final  int expiresInSeconds;
@override final  int resendAfterSeconds;

/// Create a copy of OtpRequestResult
/// with the given fields replaced by the non-null parameter values.
@override @JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
_$OtpRequestResultCopyWith<_OtpRequestResult> get copyWith => __$OtpRequestResultCopyWithImpl<_OtpRequestResult>(this, _$identity);

@override
Map<String, dynamic> toJson() {
  return _$OtpRequestResultToJson(this, );
}

@override
bool operator ==(Object other) {
  return identical(this, other) || (other.runtimeType == runtimeType&&other is _OtpRequestResult&&(identical(other.requestId, requestId) || other.requestId == requestId)&&(identical(other.channel, channel) || other.channel == channel)&&(identical(other.expiresInSeconds, expiresInSeconds) || other.expiresInSeconds == expiresInSeconds)&&(identical(other.resendAfterSeconds, resendAfterSeconds) || other.resendAfterSeconds == resendAfterSeconds));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode => Object.hash(runtimeType,requestId,channel,expiresInSeconds,resendAfterSeconds);

@override
String toString() {
  return 'OtpRequestResult(requestId: $requestId, channel: $channel, expiresInSeconds: $expiresInSeconds, resendAfterSeconds: $resendAfterSeconds)';
}


}

/// @nodoc
abstract mixin class _$OtpRequestResultCopyWith<$Res> implements $OtpRequestResultCopyWith<$Res> {
  factory _$OtpRequestResultCopyWith(_OtpRequestResult value, $Res Function(_OtpRequestResult) _then) = __$OtpRequestResultCopyWithImpl;
@override @useResult
$Res call({
 String requestId, String channel, int expiresInSeconds, int resendAfterSeconds
});




}
/// @nodoc
class __$OtpRequestResultCopyWithImpl<$Res>
    implements _$OtpRequestResultCopyWith<$Res> {
  __$OtpRequestResultCopyWithImpl(this._self, this._then);

  final _OtpRequestResult _self;
  final $Res Function(_OtpRequestResult) _then;

/// Create a copy of OtpRequestResult
/// with the given fields replaced by the non-null parameter values.
@override @pragma('vm:prefer-inline') $Res call({Object? requestId = null,Object? channel = null,Object? expiresInSeconds = null,Object? resendAfterSeconds = null,}) {
  return _then(_OtpRequestResult(
requestId: null == requestId ? _self.requestId : requestId // ignore: cast_nullable_to_non_nullable
as String,channel: null == channel ? _self.channel : channel // ignore: cast_nullable_to_non_nullable
as String,expiresInSeconds: null == expiresInSeconds ? _self.expiresInSeconds : expiresInSeconds // ignore: cast_nullable_to_non_nullable
as int,resendAfterSeconds: null == resendAfterSeconds ? _self.resendAfterSeconds : resendAfterSeconds // ignore: cast_nullable_to_non_nullable
as int,
  ));
}


}

// dart format on
