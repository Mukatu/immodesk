// GENERATED CODE - DO NOT MODIFY BY HAND
// coverage:ignore-file
// ignore_for_file: type=lint
// ignore_for_file: unused_element, deprecated_member_use, deprecated_member_use_from_same_package, use_function_type_syntax_for_parameters, unnecessary_const, avoid_init_to_null, invalid_override_different_default_values_named, prefer_expression_function_bodies, annotate_overrides, invalid_annotation_target, unnecessary_question_mark

part of 'upload_url_result.dart';

// **************************************************************************
// FreezedGenerator
// **************************************************************************

// dart format off
T _$identity<T>(T value) => value;

/// @nodoc
mixin _$UploadUrlResult {

 String get uploadUrl; String get objectKey; String get expiresAt; int get maxSizeBytes;
/// Create a copy of UploadUrlResult
/// with the given fields replaced by the non-null parameter values.
@JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
$UploadUrlResultCopyWith<UploadUrlResult> get copyWith => _$UploadUrlResultCopyWithImpl<UploadUrlResult>(this as UploadUrlResult, _$identity);

  /// Serializes this UploadUrlResult to a JSON map.
  Map<String, dynamic> toJson();


@override
bool operator ==(Object other) {
  return identical(this, other) || (other.runtimeType == runtimeType&&other is UploadUrlResult&&(identical(other.uploadUrl, uploadUrl) || other.uploadUrl == uploadUrl)&&(identical(other.objectKey, objectKey) || other.objectKey == objectKey)&&(identical(other.expiresAt, expiresAt) || other.expiresAt == expiresAt)&&(identical(other.maxSizeBytes, maxSizeBytes) || other.maxSizeBytes == maxSizeBytes));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode => Object.hash(runtimeType,uploadUrl,objectKey,expiresAt,maxSizeBytes);

@override
String toString() {
  return 'UploadUrlResult(uploadUrl: $uploadUrl, objectKey: $objectKey, expiresAt: $expiresAt, maxSizeBytes: $maxSizeBytes)';
}


}

/// @nodoc
abstract mixin class $UploadUrlResultCopyWith<$Res>  {
  factory $UploadUrlResultCopyWith(UploadUrlResult value, $Res Function(UploadUrlResult) _then) = _$UploadUrlResultCopyWithImpl;
@useResult
$Res call({
 String uploadUrl, String objectKey, String expiresAt, int maxSizeBytes
});




}
/// @nodoc
class _$UploadUrlResultCopyWithImpl<$Res>
    implements $UploadUrlResultCopyWith<$Res> {
  _$UploadUrlResultCopyWithImpl(this._self, this._then);

  final UploadUrlResult _self;
  final $Res Function(UploadUrlResult) _then;

/// Create a copy of UploadUrlResult
/// with the given fields replaced by the non-null parameter values.
@pragma('vm:prefer-inline') @override $Res call({Object? uploadUrl = null,Object? objectKey = null,Object? expiresAt = null,Object? maxSizeBytes = null,}) {
  return _then(_self.copyWith(
uploadUrl: null == uploadUrl ? _self.uploadUrl : uploadUrl // ignore: cast_nullable_to_non_nullable
as String,objectKey: null == objectKey ? _self.objectKey : objectKey // ignore: cast_nullable_to_non_nullable
as String,expiresAt: null == expiresAt ? _self.expiresAt : expiresAt // ignore: cast_nullable_to_non_nullable
as String,maxSizeBytes: null == maxSizeBytes ? _self.maxSizeBytes : maxSizeBytes // ignore: cast_nullable_to_non_nullable
as int,
  ));
}

}


/// Adds pattern-matching-related methods to [UploadUrlResult].
extension UploadUrlResultPatterns on UploadUrlResult {
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

@optionalTypeArgs TResult maybeMap<TResult extends Object?>(TResult Function( _UploadUrlResult value)?  $default,{required TResult orElse(),}){
final _that = this;
switch (_that) {
case _UploadUrlResult() when $default != null:
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

@optionalTypeArgs TResult map<TResult extends Object?>(TResult Function( _UploadUrlResult value)  $default,){
final _that = this;
switch (_that) {
case _UploadUrlResult():
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

@optionalTypeArgs TResult? mapOrNull<TResult extends Object?>(TResult? Function( _UploadUrlResult value)?  $default,){
final _that = this;
switch (_that) {
case _UploadUrlResult() when $default != null:
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

@optionalTypeArgs TResult maybeWhen<TResult extends Object?>(TResult Function( String uploadUrl,  String objectKey,  String expiresAt,  int maxSizeBytes)?  $default,{required TResult orElse(),}) {final _that = this;
switch (_that) {
case _UploadUrlResult() when $default != null:
return $default(_that.uploadUrl,_that.objectKey,_that.expiresAt,_that.maxSizeBytes);case _:
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

@optionalTypeArgs TResult when<TResult extends Object?>(TResult Function( String uploadUrl,  String objectKey,  String expiresAt,  int maxSizeBytes)  $default,) {final _that = this;
switch (_that) {
case _UploadUrlResult():
return $default(_that.uploadUrl,_that.objectKey,_that.expiresAt,_that.maxSizeBytes);case _:
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

@optionalTypeArgs TResult? whenOrNull<TResult extends Object?>(TResult? Function( String uploadUrl,  String objectKey,  String expiresAt,  int maxSizeBytes)?  $default,) {final _that = this;
switch (_that) {
case _UploadUrlResult() when $default != null:
return $default(_that.uploadUrl,_that.objectKey,_that.expiresAt,_that.maxSizeBytes);case _:
  return null;

}
}

}

/// @nodoc
@JsonSerializable()

class _UploadUrlResult implements UploadUrlResult {
  const _UploadUrlResult({required this.uploadUrl, required this.objectKey, required this.expiresAt, required this.maxSizeBytes});
  factory _UploadUrlResult.fromJson(Map<String, dynamic> json) => _$UploadUrlResultFromJson(json);

@override final  String uploadUrl;
@override final  String objectKey;
@override final  String expiresAt;
@override final  int maxSizeBytes;

/// Create a copy of UploadUrlResult
/// with the given fields replaced by the non-null parameter values.
@override @JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
_$UploadUrlResultCopyWith<_UploadUrlResult> get copyWith => __$UploadUrlResultCopyWithImpl<_UploadUrlResult>(this, _$identity);

@override
Map<String, dynamic> toJson() {
  return _$UploadUrlResultToJson(this, );
}

@override
bool operator ==(Object other) {
  return identical(this, other) || (other.runtimeType == runtimeType&&other is _UploadUrlResult&&(identical(other.uploadUrl, uploadUrl) || other.uploadUrl == uploadUrl)&&(identical(other.objectKey, objectKey) || other.objectKey == objectKey)&&(identical(other.expiresAt, expiresAt) || other.expiresAt == expiresAt)&&(identical(other.maxSizeBytes, maxSizeBytes) || other.maxSizeBytes == maxSizeBytes));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode => Object.hash(runtimeType,uploadUrl,objectKey,expiresAt,maxSizeBytes);

@override
String toString() {
  return 'UploadUrlResult(uploadUrl: $uploadUrl, objectKey: $objectKey, expiresAt: $expiresAt, maxSizeBytes: $maxSizeBytes)';
}


}

/// @nodoc
abstract mixin class _$UploadUrlResultCopyWith<$Res> implements $UploadUrlResultCopyWith<$Res> {
  factory _$UploadUrlResultCopyWith(_UploadUrlResult value, $Res Function(_UploadUrlResult) _then) = __$UploadUrlResultCopyWithImpl;
@override @useResult
$Res call({
 String uploadUrl, String objectKey, String expiresAt, int maxSizeBytes
});




}
/// @nodoc
class __$UploadUrlResultCopyWithImpl<$Res>
    implements _$UploadUrlResultCopyWith<$Res> {
  __$UploadUrlResultCopyWithImpl(this._self, this._then);

  final _UploadUrlResult _self;
  final $Res Function(_UploadUrlResult) _then;

/// Create a copy of UploadUrlResult
/// with the given fields replaced by the non-null parameter values.
@override @pragma('vm:prefer-inline') $Res call({Object? uploadUrl = null,Object? objectKey = null,Object? expiresAt = null,Object? maxSizeBytes = null,}) {
  return _then(_UploadUrlResult(
uploadUrl: null == uploadUrl ? _self.uploadUrl : uploadUrl // ignore: cast_nullable_to_non_nullable
as String,objectKey: null == objectKey ? _self.objectKey : objectKey // ignore: cast_nullable_to_non_nullable
as String,expiresAt: null == expiresAt ? _self.expiresAt : expiresAt // ignore: cast_nullable_to_non_nullable
as String,maxSizeBytes: null == maxSizeBytes ? _self.maxSizeBytes : maxSizeBytes // ignore: cast_nullable_to_non_nullable
as int,
  ));
}


}


/// @nodoc
mixin _$DownloadUrlResult {

 String get downloadUrl; String get expiresAt;
/// Create a copy of DownloadUrlResult
/// with the given fields replaced by the non-null parameter values.
@JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
$DownloadUrlResultCopyWith<DownloadUrlResult> get copyWith => _$DownloadUrlResultCopyWithImpl<DownloadUrlResult>(this as DownloadUrlResult, _$identity);

  /// Serializes this DownloadUrlResult to a JSON map.
  Map<String, dynamic> toJson();


@override
bool operator ==(Object other) {
  return identical(this, other) || (other.runtimeType == runtimeType&&other is DownloadUrlResult&&(identical(other.downloadUrl, downloadUrl) || other.downloadUrl == downloadUrl)&&(identical(other.expiresAt, expiresAt) || other.expiresAt == expiresAt));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode => Object.hash(runtimeType,downloadUrl,expiresAt);

@override
String toString() {
  return 'DownloadUrlResult(downloadUrl: $downloadUrl, expiresAt: $expiresAt)';
}


}

/// @nodoc
abstract mixin class $DownloadUrlResultCopyWith<$Res>  {
  factory $DownloadUrlResultCopyWith(DownloadUrlResult value, $Res Function(DownloadUrlResult) _then) = _$DownloadUrlResultCopyWithImpl;
@useResult
$Res call({
 String downloadUrl, String expiresAt
});




}
/// @nodoc
class _$DownloadUrlResultCopyWithImpl<$Res>
    implements $DownloadUrlResultCopyWith<$Res> {
  _$DownloadUrlResultCopyWithImpl(this._self, this._then);

  final DownloadUrlResult _self;
  final $Res Function(DownloadUrlResult) _then;

/// Create a copy of DownloadUrlResult
/// with the given fields replaced by the non-null parameter values.
@pragma('vm:prefer-inline') @override $Res call({Object? downloadUrl = null,Object? expiresAt = null,}) {
  return _then(_self.copyWith(
downloadUrl: null == downloadUrl ? _self.downloadUrl : downloadUrl // ignore: cast_nullable_to_non_nullable
as String,expiresAt: null == expiresAt ? _self.expiresAt : expiresAt // ignore: cast_nullable_to_non_nullable
as String,
  ));
}

}


/// Adds pattern-matching-related methods to [DownloadUrlResult].
extension DownloadUrlResultPatterns on DownloadUrlResult {
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

@optionalTypeArgs TResult maybeMap<TResult extends Object?>(TResult Function( _DownloadUrlResult value)?  $default,{required TResult orElse(),}){
final _that = this;
switch (_that) {
case _DownloadUrlResult() when $default != null:
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

@optionalTypeArgs TResult map<TResult extends Object?>(TResult Function( _DownloadUrlResult value)  $default,){
final _that = this;
switch (_that) {
case _DownloadUrlResult():
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

@optionalTypeArgs TResult? mapOrNull<TResult extends Object?>(TResult? Function( _DownloadUrlResult value)?  $default,){
final _that = this;
switch (_that) {
case _DownloadUrlResult() when $default != null:
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

@optionalTypeArgs TResult maybeWhen<TResult extends Object?>(TResult Function( String downloadUrl,  String expiresAt)?  $default,{required TResult orElse(),}) {final _that = this;
switch (_that) {
case _DownloadUrlResult() when $default != null:
return $default(_that.downloadUrl,_that.expiresAt);case _:
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

@optionalTypeArgs TResult when<TResult extends Object?>(TResult Function( String downloadUrl,  String expiresAt)  $default,) {final _that = this;
switch (_that) {
case _DownloadUrlResult():
return $default(_that.downloadUrl,_that.expiresAt);case _:
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

@optionalTypeArgs TResult? whenOrNull<TResult extends Object?>(TResult? Function( String downloadUrl,  String expiresAt)?  $default,) {final _that = this;
switch (_that) {
case _DownloadUrlResult() when $default != null:
return $default(_that.downloadUrl,_that.expiresAt);case _:
  return null;

}
}

}

/// @nodoc
@JsonSerializable()

class _DownloadUrlResult implements DownloadUrlResult {
  const _DownloadUrlResult({required this.downloadUrl, required this.expiresAt});
  factory _DownloadUrlResult.fromJson(Map<String, dynamic> json) => _$DownloadUrlResultFromJson(json);

@override final  String downloadUrl;
@override final  String expiresAt;

/// Create a copy of DownloadUrlResult
/// with the given fields replaced by the non-null parameter values.
@override @JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
_$DownloadUrlResultCopyWith<_DownloadUrlResult> get copyWith => __$DownloadUrlResultCopyWithImpl<_DownloadUrlResult>(this, _$identity);

@override
Map<String, dynamic> toJson() {
  return _$DownloadUrlResultToJson(this, );
}

@override
bool operator ==(Object other) {
  return identical(this, other) || (other.runtimeType == runtimeType&&other is _DownloadUrlResult&&(identical(other.downloadUrl, downloadUrl) || other.downloadUrl == downloadUrl)&&(identical(other.expiresAt, expiresAt) || other.expiresAt == expiresAt));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode => Object.hash(runtimeType,downloadUrl,expiresAt);

@override
String toString() {
  return 'DownloadUrlResult(downloadUrl: $downloadUrl, expiresAt: $expiresAt)';
}


}

/// @nodoc
abstract mixin class _$DownloadUrlResultCopyWith<$Res> implements $DownloadUrlResultCopyWith<$Res> {
  factory _$DownloadUrlResultCopyWith(_DownloadUrlResult value, $Res Function(_DownloadUrlResult) _then) = __$DownloadUrlResultCopyWithImpl;
@override @useResult
$Res call({
 String downloadUrl, String expiresAt
});




}
/// @nodoc
class __$DownloadUrlResultCopyWithImpl<$Res>
    implements _$DownloadUrlResultCopyWith<$Res> {
  __$DownloadUrlResultCopyWithImpl(this._self, this._then);

  final _DownloadUrlResult _self;
  final $Res Function(_DownloadUrlResult) _then;

/// Create a copy of DownloadUrlResult
/// with the given fields replaced by the non-null parameter values.
@override @pragma('vm:prefer-inline') $Res call({Object? downloadUrl = null,Object? expiresAt = null,}) {
  return _then(_DownloadUrlResult(
downloadUrl: null == downloadUrl ? _self.downloadUrl : downloadUrl // ignore: cast_nullable_to_non_nullable
as String,expiresAt: null == expiresAt ? _self.expiresAt : expiresAt // ignore: cast_nullable_to_non_nullable
as String,
  ));
}


}

// dart format on
