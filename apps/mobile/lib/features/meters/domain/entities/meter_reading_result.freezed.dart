// GENERATED CODE - DO NOT MODIFY BY HAND
// coverage:ignore-file
// ignore_for_file: type=lint
// ignore_for_file: unused_element, deprecated_member_use, deprecated_member_use_from_same_package, use_function_type_syntax_for_parameters, unnecessary_const, avoid_init_to_null, invalid_override_different_default_values_named, prefer_expression_function_bodies, annotate_overrides, invalid_annotation_target, unnecessary_question_mark

part of 'meter_reading_result.dart';

// **************************************************************************
// FreezedGenerator
// **************************************************************************

// dart format off
T _$identity<T>(T value) => value;

/// @nodoc
mixin _$MeterReadingResult {

 String get id; int get previousIndex; int get consumption; bool get rolloverApplied; bool get isEstimated;
/// Create a copy of MeterReadingResult
/// with the given fields replaced by the non-null parameter values.
@JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
$MeterReadingResultCopyWith<MeterReadingResult> get copyWith => _$MeterReadingResultCopyWithImpl<MeterReadingResult>(this as MeterReadingResult, _$identity);

  /// Serializes this MeterReadingResult to a JSON map.
  Map<String, dynamic> toJson();


@override
bool operator ==(Object other) {
  return identical(this, other) || (other.runtimeType == runtimeType&&other is MeterReadingResult&&(identical(other.id, id) || other.id == id)&&(identical(other.previousIndex, previousIndex) || other.previousIndex == previousIndex)&&(identical(other.consumption, consumption) || other.consumption == consumption)&&(identical(other.rolloverApplied, rolloverApplied) || other.rolloverApplied == rolloverApplied)&&(identical(other.isEstimated, isEstimated) || other.isEstimated == isEstimated));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode => Object.hash(runtimeType,id,previousIndex,consumption,rolloverApplied,isEstimated);

@override
String toString() {
  return 'MeterReadingResult(id: $id, previousIndex: $previousIndex, consumption: $consumption, rolloverApplied: $rolloverApplied, isEstimated: $isEstimated)';
}


}

/// @nodoc
abstract mixin class $MeterReadingResultCopyWith<$Res>  {
  factory $MeterReadingResultCopyWith(MeterReadingResult value, $Res Function(MeterReadingResult) _then) = _$MeterReadingResultCopyWithImpl;
@useResult
$Res call({
 String id, int previousIndex, int consumption, bool rolloverApplied, bool isEstimated
});




}
/// @nodoc
class _$MeterReadingResultCopyWithImpl<$Res>
    implements $MeterReadingResultCopyWith<$Res> {
  _$MeterReadingResultCopyWithImpl(this._self, this._then);

  final MeterReadingResult _self;
  final $Res Function(MeterReadingResult) _then;

/// Create a copy of MeterReadingResult
/// with the given fields replaced by the non-null parameter values.
@pragma('vm:prefer-inline') @override $Res call({Object? id = null,Object? previousIndex = null,Object? consumption = null,Object? rolloverApplied = null,Object? isEstimated = null,}) {
  return _then(_self.copyWith(
id: null == id ? _self.id : id // ignore: cast_nullable_to_non_nullable
as String,previousIndex: null == previousIndex ? _self.previousIndex : previousIndex // ignore: cast_nullable_to_non_nullable
as int,consumption: null == consumption ? _self.consumption : consumption // ignore: cast_nullable_to_non_nullable
as int,rolloverApplied: null == rolloverApplied ? _self.rolloverApplied : rolloverApplied // ignore: cast_nullable_to_non_nullable
as bool,isEstimated: null == isEstimated ? _self.isEstimated : isEstimated // ignore: cast_nullable_to_non_nullable
as bool,
  ));
}

}


/// Adds pattern-matching-related methods to [MeterReadingResult].
extension MeterReadingResultPatterns on MeterReadingResult {
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

@optionalTypeArgs TResult maybeMap<TResult extends Object?>(TResult Function( _MeterReadingResult value)?  $default,{required TResult orElse(),}){
final _that = this;
switch (_that) {
case _MeterReadingResult() when $default != null:
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

@optionalTypeArgs TResult map<TResult extends Object?>(TResult Function( _MeterReadingResult value)  $default,){
final _that = this;
switch (_that) {
case _MeterReadingResult():
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

@optionalTypeArgs TResult? mapOrNull<TResult extends Object?>(TResult? Function( _MeterReadingResult value)?  $default,){
final _that = this;
switch (_that) {
case _MeterReadingResult() when $default != null:
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

@optionalTypeArgs TResult maybeWhen<TResult extends Object?>(TResult Function( String id,  int previousIndex,  int consumption,  bool rolloverApplied,  bool isEstimated)?  $default,{required TResult orElse(),}) {final _that = this;
switch (_that) {
case _MeterReadingResult() when $default != null:
return $default(_that.id,_that.previousIndex,_that.consumption,_that.rolloverApplied,_that.isEstimated);case _:
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

@optionalTypeArgs TResult when<TResult extends Object?>(TResult Function( String id,  int previousIndex,  int consumption,  bool rolloverApplied,  bool isEstimated)  $default,) {final _that = this;
switch (_that) {
case _MeterReadingResult():
return $default(_that.id,_that.previousIndex,_that.consumption,_that.rolloverApplied,_that.isEstimated);case _:
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

@optionalTypeArgs TResult? whenOrNull<TResult extends Object?>(TResult? Function( String id,  int previousIndex,  int consumption,  bool rolloverApplied,  bool isEstimated)?  $default,) {final _that = this;
switch (_that) {
case _MeterReadingResult() when $default != null:
return $default(_that.id,_that.previousIndex,_that.consumption,_that.rolloverApplied,_that.isEstimated);case _:
  return null;

}
}

}

/// @nodoc
@JsonSerializable()

class _MeterReadingResult implements MeterReadingResult {
  const _MeterReadingResult({required this.id, required this.previousIndex, required this.consumption, this.rolloverApplied = false, this.isEstimated = false});
  factory _MeterReadingResult.fromJson(Map<String, dynamic> json) => _$MeterReadingResultFromJson(json);

@override final  String id;
@override final  int previousIndex;
@override final  int consumption;
@override@JsonKey() final  bool rolloverApplied;
@override@JsonKey() final  bool isEstimated;

/// Create a copy of MeterReadingResult
/// with the given fields replaced by the non-null parameter values.
@override @JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
_$MeterReadingResultCopyWith<_MeterReadingResult> get copyWith => __$MeterReadingResultCopyWithImpl<_MeterReadingResult>(this, _$identity);

@override
Map<String, dynamic> toJson() {
  return _$MeterReadingResultToJson(this, );
}

@override
bool operator ==(Object other) {
  return identical(this, other) || (other.runtimeType == runtimeType&&other is _MeterReadingResult&&(identical(other.id, id) || other.id == id)&&(identical(other.previousIndex, previousIndex) || other.previousIndex == previousIndex)&&(identical(other.consumption, consumption) || other.consumption == consumption)&&(identical(other.rolloverApplied, rolloverApplied) || other.rolloverApplied == rolloverApplied)&&(identical(other.isEstimated, isEstimated) || other.isEstimated == isEstimated));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode => Object.hash(runtimeType,id,previousIndex,consumption,rolloverApplied,isEstimated);

@override
String toString() {
  return 'MeterReadingResult(id: $id, previousIndex: $previousIndex, consumption: $consumption, rolloverApplied: $rolloverApplied, isEstimated: $isEstimated)';
}


}

/// @nodoc
abstract mixin class _$MeterReadingResultCopyWith<$Res> implements $MeterReadingResultCopyWith<$Res> {
  factory _$MeterReadingResultCopyWith(_MeterReadingResult value, $Res Function(_MeterReadingResult) _then) = __$MeterReadingResultCopyWithImpl;
@override @useResult
$Res call({
 String id, int previousIndex, int consumption, bool rolloverApplied, bool isEstimated
});




}
/// @nodoc
class __$MeterReadingResultCopyWithImpl<$Res>
    implements _$MeterReadingResultCopyWith<$Res> {
  __$MeterReadingResultCopyWithImpl(this._self, this._then);

  final _MeterReadingResult _self;
  final $Res Function(_MeterReadingResult) _then;

/// Create a copy of MeterReadingResult
/// with the given fields replaced by the non-null parameter values.
@override @pragma('vm:prefer-inline') $Res call({Object? id = null,Object? previousIndex = null,Object? consumption = null,Object? rolloverApplied = null,Object? isEstimated = null,}) {
  return _then(_MeterReadingResult(
id: null == id ? _self.id : id // ignore: cast_nullable_to_non_nullable
as String,previousIndex: null == previousIndex ? _self.previousIndex : previousIndex // ignore: cast_nullable_to_non_nullable
as int,consumption: null == consumption ? _self.consumption : consumption // ignore: cast_nullable_to_non_nullable
as int,rolloverApplied: null == rolloverApplied ? _self.rolloverApplied : rolloverApplied // ignore: cast_nullable_to_non_nullable
as bool,isEstimated: null == isEstimated ? _self.isEstimated : isEstimated // ignore: cast_nullable_to_non_nullable
as bool,
  ));
}


}

// dart format on
