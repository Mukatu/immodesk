// GENERATED CODE - DO NOT MODIFY BY HAND
// coverage:ignore-file
// ignore_for_file: type=lint
// ignore_for_file: unused_element, deprecated_member_use, deprecated_member_use_from_same_package, use_function_type_syntax_for_parameters, unnecessary_const, avoid_init_to_null, invalid_override_different_default_values_named, prefer_expression_function_bodies, annotate_overrides, invalid_annotation_target, unnecessary_question_mark

part of 'property_lead_result.dart';

// **************************************************************************
// FreezedGenerator
// **************************************************************************

// dart format off
T _$identity<T>(T value) => value;

/// @nodoc
mixin _$PropertyLeadResult {

 String get id; String get confirmationSentTo;
/// Create a copy of PropertyLeadResult
/// with the given fields replaced by the non-null parameter values.
@JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
$PropertyLeadResultCopyWith<PropertyLeadResult> get copyWith => _$PropertyLeadResultCopyWithImpl<PropertyLeadResult>(this as PropertyLeadResult, _$identity);

  /// Serializes this PropertyLeadResult to a JSON map.
  Map<String, dynamic> toJson();


@override
bool operator ==(Object other) {
  return identical(this, other) || (other.runtimeType == runtimeType&&other is PropertyLeadResult&&(identical(other.id, id) || other.id == id)&&(identical(other.confirmationSentTo, confirmationSentTo) || other.confirmationSentTo == confirmationSentTo));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode => Object.hash(runtimeType,id,confirmationSentTo);

@override
String toString() {
  return 'PropertyLeadResult(id: $id, confirmationSentTo: $confirmationSentTo)';
}


}

/// @nodoc
abstract mixin class $PropertyLeadResultCopyWith<$Res>  {
  factory $PropertyLeadResultCopyWith(PropertyLeadResult value, $Res Function(PropertyLeadResult) _then) = _$PropertyLeadResultCopyWithImpl;
@useResult
$Res call({
 String id, String confirmationSentTo
});




}
/// @nodoc
class _$PropertyLeadResultCopyWithImpl<$Res>
    implements $PropertyLeadResultCopyWith<$Res> {
  _$PropertyLeadResultCopyWithImpl(this._self, this._then);

  final PropertyLeadResult _self;
  final $Res Function(PropertyLeadResult) _then;

/// Create a copy of PropertyLeadResult
/// with the given fields replaced by the non-null parameter values.
@pragma('vm:prefer-inline') @override $Res call({Object? id = null,Object? confirmationSentTo = null,}) {
  return _then(_self.copyWith(
id: null == id ? _self.id : id // ignore: cast_nullable_to_non_nullable
as String,confirmationSentTo: null == confirmationSentTo ? _self.confirmationSentTo : confirmationSentTo // ignore: cast_nullable_to_non_nullable
as String,
  ));
}

}


/// Adds pattern-matching-related methods to [PropertyLeadResult].
extension PropertyLeadResultPatterns on PropertyLeadResult {
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

@optionalTypeArgs TResult maybeMap<TResult extends Object?>(TResult Function( _PropertyLeadResult value)?  $default,{required TResult orElse(),}){
final _that = this;
switch (_that) {
case _PropertyLeadResult() when $default != null:
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

@optionalTypeArgs TResult map<TResult extends Object?>(TResult Function( _PropertyLeadResult value)  $default,){
final _that = this;
switch (_that) {
case _PropertyLeadResult():
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

@optionalTypeArgs TResult? mapOrNull<TResult extends Object?>(TResult? Function( _PropertyLeadResult value)?  $default,){
final _that = this;
switch (_that) {
case _PropertyLeadResult() when $default != null:
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

@optionalTypeArgs TResult maybeWhen<TResult extends Object?>(TResult Function( String id,  String confirmationSentTo)?  $default,{required TResult orElse(),}) {final _that = this;
switch (_that) {
case _PropertyLeadResult() when $default != null:
return $default(_that.id,_that.confirmationSentTo);case _:
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

@optionalTypeArgs TResult when<TResult extends Object?>(TResult Function( String id,  String confirmationSentTo)  $default,) {final _that = this;
switch (_that) {
case _PropertyLeadResult():
return $default(_that.id,_that.confirmationSentTo);case _:
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

@optionalTypeArgs TResult? whenOrNull<TResult extends Object?>(TResult? Function( String id,  String confirmationSentTo)?  $default,) {final _that = this;
switch (_that) {
case _PropertyLeadResult() when $default != null:
return $default(_that.id,_that.confirmationSentTo);case _:
  return null;

}
}

}

/// @nodoc
@JsonSerializable()

class _PropertyLeadResult implements PropertyLeadResult {
  const _PropertyLeadResult({required this.id, required this.confirmationSentTo});
  factory _PropertyLeadResult.fromJson(Map<String, dynamic> json) => _$PropertyLeadResultFromJson(json);

@override final  String id;
@override final  String confirmationSentTo;

/// Create a copy of PropertyLeadResult
/// with the given fields replaced by the non-null parameter values.
@override @JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
_$PropertyLeadResultCopyWith<_PropertyLeadResult> get copyWith => __$PropertyLeadResultCopyWithImpl<_PropertyLeadResult>(this, _$identity);

@override
Map<String, dynamic> toJson() {
  return _$PropertyLeadResultToJson(this, );
}

@override
bool operator ==(Object other) {
  return identical(this, other) || (other.runtimeType == runtimeType&&other is _PropertyLeadResult&&(identical(other.id, id) || other.id == id)&&(identical(other.confirmationSentTo, confirmationSentTo) || other.confirmationSentTo == confirmationSentTo));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode => Object.hash(runtimeType,id,confirmationSentTo);

@override
String toString() {
  return 'PropertyLeadResult(id: $id, confirmationSentTo: $confirmationSentTo)';
}


}

/// @nodoc
abstract mixin class _$PropertyLeadResultCopyWith<$Res> implements $PropertyLeadResultCopyWith<$Res> {
  factory _$PropertyLeadResultCopyWith(_PropertyLeadResult value, $Res Function(_PropertyLeadResult) _then) = __$PropertyLeadResultCopyWithImpl;
@override @useResult
$Res call({
 String id, String confirmationSentTo
});




}
/// @nodoc
class __$PropertyLeadResultCopyWithImpl<$Res>
    implements _$PropertyLeadResultCopyWith<$Res> {
  __$PropertyLeadResultCopyWithImpl(this._self, this._then);

  final _PropertyLeadResult _self;
  final $Res Function(_PropertyLeadResult) _then;

/// Create a copy of PropertyLeadResult
/// with the given fields replaced by the non-null parameter values.
@override @pragma('vm:prefer-inline') $Res call({Object? id = null,Object? confirmationSentTo = null,}) {
  return _then(_PropertyLeadResult(
id: null == id ? _self.id : id // ignore: cast_nullable_to_non_nullable
as String,confirmationSentTo: null == confirmationSentTo ? _self.confirmationSentTo : confirmationSentTo // ignore: cast_nullable_to_non_nullable
as String,
  ));
}


}

// dart format on
