// GENERATED CODE - DO NOT MODIFY BY HAND
// coverage:ignore-file
// ignore_for_file: type=lint
// ignore_for_file: unused_element, deprecated_member_use, deprecated_member_use_from_same_package, use_function_type_syntax_for_parameters, unnecessary_const, avoid_init_to_null, invalid_override_different_default_values_named, prefer_expression_function_bodies, annotate_overrides, invalid_annotation_target, unnecessary_question_mark

part of 'inspection_submit_result.dart';

// **************************************************************************
// FreezedGenerator
// **************************************************************************

// dart format off
T _$identity<T>(T value) => value;

/// @nodoc
mixin _$InspectionSubmitResult {

 String get id; String get reference; String get status;
/// Create a copy of InspectionSubmitResult
/// with the given fields replaced by the non-null parameter values.
@JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
$InspectionSubmitResultCopyWith<InspectionSubmitResult> get copyWith => _$InspectionSubmitResultCopyWithImpl<InspectionSubmitResult>(this as InspectionSubmitResult, _$identity);

  /// Serializes this InspectionSubmitResult to a JSON map.
  Map<String, dynamic> toJson();


@override
bool operator ==(Object other) {
  return identical(this, other) || (other.runtimeType == runtimeType&&other is InspectionSubmitResult&&(identical(other.id, id) || other.id == id)&&(identical(other.reference, reference) || other.reference == reference)&&(identical(other.status, status) || other.status == status));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode => Object.hash(runtimeType,id,reference,status);

@override
String toString() {
  return 'InspectionSubmitResult(id: $id, reference: $reference, status: $status)';
}


}

/// @nodoc
abstract mixin class $InspectionSubmitResultCopyWith<$Res>  {
  factory $InspectionSubmitResultCopyWith(InspectionSubmitResult value, $Res Function(InspectionSubmitResult) _then) = _$InspectionSubmitResultCopyWithImpl;
@useResult
$Res call({
 String id, String reference, String status
});




}
/// @nodoc
class _$InspectionSubmitResultCopyWithImpl<$Res>
    implements $InspectionSubmitResultCopyWith<$Res> {
  _$InspectionSubmitResultCopyWithImpl(this._self, this._then);

  final InspectionSubmitResult _self;
  final $Res Function(InspectionSubmitResult) _then;

/// Create a copy of InspectionSubmitResult
/// with the given fields replaced by the non-null parameter values.
@pragma('vm:prefer-inline') @override $Res call({Object? id = null,Object? reference = null,Object? status = null,}) {
  return _then(_self.copyWith(
id: null == id ? _self.id : id // ignore: cast_nullable_to_non_nullable
as String,reference: null == reference ? _self.reference : reference // ignore: cast_nullable_to_non_nullable
as String,status: null == status ? _self.status : status // ignore: cast_nullable_to_non_nullable
as String,
  ));
}

}


/// Adds pattern-matching-related methods to [InspectionSubmitResult].
extension InspectionSubmitResultPatterns on InspectionSubmitResult {
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

@optionalTypeArgs TResult maybeMap<TResult extends Object?>(TResult Function( _InspectionSubmitResult value)?  $default,{required TResult orElse(),}){
final _that = this;
switch (_that) {
case _InspectionSubmitResult() when $default != null:
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

@optionalTypeArgs TResult map<TResult extends Object?>(TResult Function( _InspectionSubmitResult value)  $default,){
final _that = this;
switch (_that) {
case _InspectionSubmitResult():
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

@optionalTypeArgs TResult? mapOrNull<TResult extends Object?>(TResult? Function( _InspectionSubmitResult value)?  $default,){
final _that = this;
switch (_that) {
case _InspectionSubmitResult() when $default != null:
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

@optionalTypeArgs TResult maybeWhen<TResult extends Object?>(TResult Function( String id,  String reference,  String status)?  $default,{required TResult orElse(),}) {final _that = this;
switch (_that) {
case _InspectionSubmitResult() when $default != null:
return $default(_that.id,_that.reference,_that.status);case _:
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

@optionalTypeArgs TResult when<TResult extends Object?>(TResult Function( String id,  String reference,  String status)  $default,) {final _that = this;
switch (_that) {
case _InspectionSubmitResult():
return $default(_that.id,_that.reference,_that.status);case _:
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

@optionalTypeArgs TResult? whenOrNull<TResult extends Object?>(TResult? Function( String id,  String reference,  String status)?  $default,) {final _that = this;
switch (_that) {
case _InspectionSubmitResult() when $default != null:
return $default(_that.id,_that.reference,_that.status);case _:
  return null;

}
}

}

/// @nodoc
@JsonSerializable()

class _InspectionSubmitResult implements InspectionSubmitResult {
  const _InspectionSubmitResult({required this.id, required this.reference, required this.status});
  factory _InspectionSubmitResult.fromJson(Map<String, dynamic> json) => _$InspectionSubmitResultFromJson(json);

@override final  String id;
@override final  String reference;
@override final  String status;

/// Create a copy of InspectionSubmitResult
/// with the given fields replaced by the non-null parameter values.
@override @JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
_$InspectionSubmitResultCopyWith<_InspectionSubmitResult> get copyWith => __$InspectionSubmitResultCopyWithImpl<_InspectionSubmitResult>(this, _$identity);

@override
Map<String, dynamic> toJson() {
  return _$InspectionSubmitResultToJson(this, );
}

@override
bool operator ==(Object other) {
  return identical(this, other) || (other.runtimeType == runtimeType&&other is _InspectionSubmitResult&&(identical(other.id, id) || other.id == id)&&(identical(other.reference, reference) || other.reference == reference)&&(identical(other.status, status) || other.status == status));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode => Object.hash(runtimeType,id,reference,status);

@override
String toString() {
  return 'InspectionSubmitResult(id: $id, reference: $reference, status: $status)';
}


}

/// @nodoc
abstract mixin class _$InspectionSubmitResultCopyWith<$Res> implements $InspectionSubmitResultCopyWith<$Res> {
  factory _$InspectionSubmitResultCopyWith(_InspectionSubmitResult value, $Res Function(_InspectionSubmitResult) _then) = __$InspectionSubmitResultCopyWithImpl;
@override @useResult
$Res call({
 String id, String reference, String status
});




}
/// @nodoc
class __$InspectionSubmitResultCopyWithImpl<$Res>
    implements _$InspectionSubmitResultCopyWith<$Res> {
  __$InspectionSubmitResultCopyWithImpl(this._self, this._then);

  final _InspectionSubmitResult _self;
  final $Res Function(_InspectionSubmitResult) _then;

/// Create a copy of InspectionSubmitResult
/// with the given fields replaced by the non-null parameter values.
@override @pragma('vm:prefer-inline') $Res call({Object? id = null,Object? reference = null,Object? status = null,}) {
  return _then(_InspectionSubmitResult(
id: null == id ? _self.id : id // ignore: cast_nullable_to_non_nullable
as String,reference: null == reference ? _self.reference : reference // ignore: cast_nullable_to_non_nullable
as String,status: null == status ? _self.status : status // ignore: cast_nullable_to_non_nullable
as String,
  ));
}


}

// dart format on
