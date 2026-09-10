// GENERATED CODE - DO NOT MODIFY BY HAND
// coverage:ignore-file
// ignore_for_file: type=lint
// ignore_for_file: unused_element, deprecated_member_use, deprecated_member_use_from_same_package, use_function_type_syntax_for_parameters, unnecessary_const, avoid_init_to_null, invalid_override_different_default_values_named, prefer_expression_function_bodies, annotate_overrides, invalid_annotation_target, unnecessary_question_mark

part of 'landlord_summary.dart';

// **************************************************************************
// FreezedGenerator
// **************************************************************************

// dart format off
T _$identity<T>(T value) => value;

/// @nodoc
mixin _$LandlordSummary {

 String get id; String get displayName; String get primaryPhone; bool get isSelf;
/// Create a copy of LandlordSummary
/// with the given fields replaced by the non-null parameter values.
@JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
$LandlordSummaryCopyWith<LandlordSummary> get copyWith => _$LandlordSummaryCopyWithImpl<LandlordSummary>(this as LandlordSummary, _$identity);

  /// Serializes this LandlordSummary to a JSON map.
  Map<String, dynamic> toJson();


@override
bool operator ==(Object other) {
  return identical(this, other) || (other.runtimeType == runtimeType&&other is LandlordSummary&&(identical(other.id, id) || other.id == id)&&(identical(other.displayName, displayName) || other.displayName == displayName)&&(identical(other.primaryPhone, primaryPhone) || other.primaryPhone == primaryPhone)&&(identical(other.isSelf, isSelf) || other.isSelf == isSelf));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode => Object.hash(runtimeType,id,displayName,primaryPhone,isSelf);

@override
String toString() {
  return 'LandlordSummary(id: $id, displayName: $displayName, primaryPhone: $primaryPhone, isSelf: $isSelf)';
}


}

/// @nodoc
abstract mixin class $LandlordSummaryCopyWith<$Res>  {
  factory $LandlordSummaryCopyWith(LandlordSummary value, $Res Function(LandlordSummary) _then) = _$LandlordSummaryCopyWithImpl;
@useResult
$Res call({
 String id, String displayName, String primaryPhone, bool isSelf
});




}
/// @nodoc
class _$LandlordSummaryCopyWithImpl<$Res>
    implements $LandlordSummaryCopyWith<$Res> {
  _$LandlordSummaryCopyWithImpl(this._self, this._then);

  final LandlordSummary _self;
  final $Res Function(LandlordSummary) _then;

/// Create a copy of LandlordSummary
/// with the given fields replaced by the non-null parameter values.
@pragma('vm:prefer-inline') @override $Res call({Object? id = null,Object? displayName = null,Object? primaryPhone = null,Object? isSelf = null,}) {
  return _then(_self.copyWith(
id: null == id ? _self.id : id // ignore: cast_nullable_to_non_nullable
as String,displayName: null == displayName ? _self.displayName : displayName // ignore: cast_nullable_to_non_nullable
as String,primaryPhone: null == primaryPhone ? _self.primaryPhone : primaryPhone // ignore: cast_nullable_to_non_nullable
as String,isSelf: null == isSelf ? _self.isSelf : isSelf // ignore: cast_nullable_to_non_nullable
as bool,
  ));
}

}


/// Adds pattern-matching-related methods to [LandlordSummary].
extension LandlordSummaryPatterns on LandlordSummary {
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

@optionalTypeArgs TResult maybeMap<TResult extends Object?>(TResult Function( _LandlordSummary value)?  $default,{required TResult orElse(),}){
final _that = this;
switch (_that) {
case _LandlordSummary() when $default != null:
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

@optionalTypeArgs TResult map<TResult extends Object?>(TResult Function( _LandlordSummary value)  $default,){
final _that = this;
switch (_that) {
case _LandlordSummary():
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

@optionalTypeArgs TResult? mapOrNull<TResult extends Object?>(TResult? Function( _LandlordSummary value)?  $default,){
final _that = this;
switch (_that) {
case _LandlordSummary() when $default != null:
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

@optionalTypeArgs TResult maybeWhen<TResult extends Object?>(TResult Function( String id,  String displayName,  String primaryPhone,  bool isSelf)?  $default,{required TResult orElse(),}) {final _that = this;
switch (_that) {
case _LandlordSummary() when $default != null:
return $default(_that.id,_that.displayName,_that.primaryPhone,_that.isSelf);case _:
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

@optionalTypeArgs TResult when<TResult extends Object?>(TResult Function( String id,  String displayName,  String primaryPhone,  bool isSelf)  $default,) {final _that = this;
switch (_that) {
case _LandlordSummary():
return $default(_that.id,_that.displayName,_that.primaryPhone,_that.isSelf);case _:
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

@optionalTypeArgs TResult? whenOrNull<TResult extends Object?>(TResult? Function( String id,  String displayName,  String primaryPhone,  bool isSelf)?  $default,) {final _that = this;
switch (_that) {
case _LandlordSummary() when $default != null:
return $default(_that.id,_that.displayName,_that.primaryPhone,_that.isSelf);case _:
  return null;

}
}

}

/// @nodoc
@JsonSerializable()

class _LandlordSummary implements LandlordSummary {
  const _LandlordSummary({required this.id, required this.displayName, required this.primaryPhone, required this.isSelf});
  factory _LandlordSummary.fromJson(Map<String, dynamic> json) => _$LandlordSummaryFromJson(json);

@override final  String id;
@override final  String displayName;
@override final  String primaryPhone;
@override final  bool isSelf;

/// Create a copy of LandlordSummary
/// with the given fields replaced by the non-null parameter values.
@override @JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
_$LandlordSummaryCopyWith<_LandlordSummary> get copyWith => __$LandlordSummaryCopyWithImpl<_LandlordSummary>(this, _$identity);

@override
Map<String, dynamic> toJson() {
  return _$LandlordSummaryToJson(this, );
}

@override
bool operator ==(Object other) {
  return identical(this, other) || (other.runtimeType == runtimeType&&other is _LandlordSummary&&(identical(other.id, id) || other.id == id)&&(identical(other.displayName, displayName) || other.displayName == displayName)&&(identical(other.primaryPhone, primaryPhone) || other.primaryPhone == primaryPhone)&&(identical(other.isSelf, isSelf) || other.isSelf == isSelf));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode => Object.hash(runtimeType,id,displayName,primaryPhone,isSelf);

@override
String toString() {
  return 'LandlordSummary(id: $id, displayName: $displayName, primaryPhone: $primaryPhone, isSelf: $isSelf)';
}


}

/// @nodoc
abstract mixin class _$LandlordSummaryCopyWith<$Res> implements $LandlordSummaryCopyWith<$Res> {
  factory _$LandlordSummaryCopyWith(_LandlordSummary value, $Res Function(_LandlordSummary) _then) = __$LandlordSummaryCopyWithImpl;
@override @useResult
$Res call({
 String id, String displayName, String primaryPhone, bool isSelf
});




}
/// @nodoc
class __$LandlordSummaryCopyWithImpl<$Res>
    implements _$LandlordSummaryCopyWith<$Res> {
  __$LandlordSummaryCopyWithImpl(this._self, this._then);

  final _LandlordSummary _self;
  final $Res Function(_LandlordSummary) _then;

/// Create a copy of LandlordSummary
/// with the given fields replaced by the non-null parameter values.
@override @pragma('vm:prefer-inline') $Res call({Object? id = null,Object? displayName = null,Object? primaryPhone = null,Object? isSelf = null,}) {
  return _then(_LandlordSummary(
id: null == id ? _self.id : id // ignore: cast_nullable_to_non_nullable
as String,displayName: null == displayName ? _self.displayName : displayName // ignore: cast_nullable_to_non_nullable
as String,primaryPhone: null == primaryPhone ? _self.primaryPhone : primaryPhone // ignore: cast_nullable_to_non_nullable
as String,isSelf: null == isSelf ? _self.isSelf : isSelf // ignore: cast_nullable_to_non_nullable
as bool,
  ));
}


}

// dart format on
