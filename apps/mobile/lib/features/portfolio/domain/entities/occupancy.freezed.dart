// GENERATED CODE - DO NOT MODIFY BY HAND
// coverage:ignore-file
// ignore_for_file: type=lint
// ignore_for_file: unused_element, deprecated_member_use, deprecated_member_use_from_same_package, use_function_type_syntax_for_parameters, unnecessary_const, avoid_init_to_null, invalid_override_different_default_values_named, prefer_expression_function_bodies, annotate_overrides, invalid_annotation_target, unnecessary_question_mark

part of 'occupancy.dart';

// **************************************************************************
// FreezedGenerator
// **************************************************************************

// dart format off
T _$identity<T>(T value) => value;

/// @nodoc
mixin _$Occupancy {

 int get unitsCount; int get occupiedCount; int get availableCount; int get occupancyRateBps;
/// Create a copy of Occupancy
/// with the given fields replaced by the non-null parameter values.
@JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
$OccupancyCopyWith<Occupancy> get copyWith => _$OccupancyCopyWithImpl<Occupancy>(this as Occupancy, _$identity);

  /// Serializes this Occupancy to a JSON map.
  Map<String, dynamic> toJson();


@override
bool operator ==(Object other) {
  return identical(this, other) || (other.runtimeType == runtimeType&&other is Occupancy&&(identical(other.unitsCount, unitsCount) || other.unitsCount == unitsCount)&&(identical(other.occupiedCount, occupiedCount) || other.occupiedCount == occupiedCount)&&(identical(other.availableCount, availableCount) || other.availableCount == availableCount)&&(identical(other.occupancyRateBps, occupancyRateBps) || other.occupancyRateBps == occupancyRateBps));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode => Object.hash(runtimeType,unitsCount,occupiedCount,availableCount,occupancyRateBps);

@override
String toString() {
  return 'Occupancy(unitsCount: $unitsCount, occupiedCount: $occupiedCount, availableCount: $availableCount, occupancyRateBps: $occupancyRateBps)';
}


}

/// @nodoc
abstract mixin class $OccupancyCopyWith<$Res>  {
  factory $OccupancyCopyWith(Occupancy value, $Res Function(Occupancy) _then) = _$OccupancyCopyWithImpl;
@useResult
$Res call({
 int unitsCount, int occupiedCount, int availableCount, int occupancyRateBps
});




}
/// @nodoc
class _$OccupancyCopyWithImpl<$Res>
    implements $OccupancyCopyWith<$Res> {
  _$OccupancyCopyWithImpl(this._self, this._then);

  final Occupancy _self;
  final $Res Function(Occupancy) _then;

/// Create a copy of Occupancy
/// with the given fields replaced by the non-null parameter values.
@pragma('vm:prefer-inline') @override $Res call({Object? unitsCount = null,Object? occupiedCount = null,Object? availableCount = null,Object? occupancyRateBps = null,}) {
  return _then(_self.copyWith(
unitsCount: null == unitsCount ? _self.unitsCount : unitsCount // ignore: cast_nullable_to_non_nullable
as int,occupiedCount: null == occupiedCount ? _self.occupiedCount : occupiedCount // ignore: cast_nullable_to_non_nullable
as int,availableCount: null == availableCount ? _self.availableCount : availableCount // ignore: cast_nullable_to_non_nullable
as int,occupancyRateBps: null == occupancyRateBps ? _self.occupancyRateBps : occupancyRateBps // ignore: cast_nullable_to_non_nullable
as int,
  ));
}

}


/// Adds pattern-matching-related methods to [Occupancy].
extension OccupancyPatterns on Occupancy {
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

@optionalTypeArgs TResult maybeMap<TResult extends Object?>(TResult Function( _Occupancy value)?  $default,{required TResult orElse(),}){
final _that = this;
switch (_that) {
case _Occupancy() when $default != null:
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

@optionalTypeArgs TResult map<TResult extends Object?>(TResult Function( _Occupancy value)  $default,){
final _that = this;
switch (_that) {
case _Occupancy():
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

@optionalTypeArgs TResult? mapOrNull<TResult extends Object?>(TResult? Function( _Occupancy value)?  $default,){
final _that = this;
switch (_that) {
case _Occupancy() when $default != null:
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

@optionalTypeArgs TResult maybeWhen<TResult extends Object?>(TResult Function( int unitsCount,  int occupiedCount,  int availableCount,  int occupancyRateBps)?  $default,{required TResult orElse(),}) {final _that = this;
switch (_that) {
case _Occupancy() when $default != null:
return $default(_that.unitsCount,_that.occupiedCount,_that.availableCount,_that.occupancyRateBps);case _:
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

@optionalTypeArgs TResult when<TResult extends Object?>(TResult Function( int unitsCount,  int occupiedCount,  int availableCount,  int occupancyRateBps)  $default,) {final _that = this;
switch (_that) {
case _Occupancy():
return $default(_that.unitsCount,_that.occupiedCount,_that.availableCount,_that.occupancyRateBps);case _:
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

@optionalTypeArgs TResult? whenOrNull<TResult extends Object?>(TResult? Function( int unitsCount,  int occupiedCount,  int availableCount,  int occupancyRateBps)?  $default,) {final _that = this;
switch (_that) {
case _Occupancy() when $default != null:
return $default(_that.unitsCount,_that.occupiedCount,_that.availableCount,_that.occupancyRateBps);case _:
  return null;

}
}

}

/// @nodoc
@JsonSerializable()

class _Occupancy implements Occupancy {
  const _Occupancy({required this.unitsCount, required this.occupiedCount, required this.availableCount, required this.occupancyRateBps});
  factory _Occupancy.fromJson(Map<String, dynamic> json) => _$OccupancyFromJson(json);

@override final  int unitsCount;
@override final  int occupiedCount;
@override final  int availableCount;
@override final  int occupancyRateBps;

/// Create a copy of Occupancy
/// with the given fields replaced by the non-null parameter values.
@override @JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
_$OccupancyCopyWith<_Occupancy> get copyWith => __$OccupancyCopyWithImpl<_Occupancy>(this, _$identity);

@override
Map<String, dynamic> toJson() {
  return _$OccupancyToJson(this, );
}

@override
bool operator ==(Object other) {
  return identical(this, other) || (other.runtimeType == runtimeType&&other is _Occupancy&&(identical(other.unitsCount, unitsCount) || other.unitsCount == unitsCount)&&(identical(other.occupiedCount, occupiedCount) || other.occupiedCount == occupiedCount)&&(identical(other.availableCount, availableCount) || other.availableCount == availableCount)&&(identical(other.occupancyRateBps, occupancyRateBps) || other.occupancyRateBps == occupancyRateBps));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode => Object.hash(runtimeType,unitsCount,occupiedCount,availableCount,occupancyRateBps);

@override
String toString() {
  return 'Occupancy(unitsCount: $unitsCount, occupiedCount: $occupiedCount, availableCount: $availableCount, occupancyRateBps: $occupancyRateBps)';
}


}

/// @nodoc
abstract mixin class _$OccupancyCopyWith<$Res> implements $OccupancyCopyWith<$Res> {
  factory _$OccupancyCopyWith(_Occupancy value, $Res Function(_Occupancy) _then) = __$OccupancyCopyWithImpl;
@override @useResult
$Res call({
 int unitsCount, int occupiedCount, int availableCount, int occupancyRateBps
});




}
/// @nodoc
class __$OccupancyCopyWithImpl<$Res>
    implements _$OccupancyCopyWith<$Res> {
  __$OccupancyCopyWithImpl(this._self, this._then);

  final _Occupancy _self;
  final $Res Function(_Occupancy) _then;

/// Create a copy of Occupancy
/// with the given fields replaced by the non-null parameter values.
@override @pragma('vm:prefer-inline') $Res call({Object? unitsCount = null,Object? occupiedCount = null,Object? availableCount = null,Object? occupancyRateBps = null,}) {
  return _then(_Occupancy(
unitsCount: null == unitsCount ? _self.unitsCount : unitsCount // ignore: cast_nullable_to_non_nullable
as int,occupiedCount: null == occupiedCount ? _self.occupiedCount : occupiedCount // ignore: cast_nullable_to_non_nullable
as int,availableCount: null == availableCount ? _self.availableCount : availableCount // ignore: cast_nullable_to_non_nullable
as int,occupancyRateBps: null == occupancyRateBps ? _self.occupancyRateBps : occupancyRateBps // ignore: cast_nullable_to_non_nullable
as int,
  ));
}


}

// dart format on
