// GENERATED CODE - DO NOT MODIFY BY HAND
// coverage:ignore-file
// ignore_for_file: type=lint
// ignore_for_file: unused_element, deprecated_member_use, deprecated_member_use_from_same_package, use_function_type_syntax_for_parameters, unnecessary_const, avoid_init_to_null, invalid_override_different_default_values_named, prefer_expression_function_bodies, annotate_overrides, invalid_annotation_target, unnecessary_question_mark

part of 'meter.dart';

// **************************************************************************
// FreezedGenerator
// **************************************************************************

// dart format off
T _$identity<T>(T value) => value;

/// @nodoc
mixin _$MeterLastReading {

 String get readingDate; int get currentIndex;
/// Create a copy of MeterLastReading
/// with the given fields replaced by the non-null parameter values.
@JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
$MeterLastReadingCopyWith<MeterLastReading> get copyWith => _$MeterLastReadingCopyWithImpl<MeterLastReading>(this as MeterLastReading, _$identity);

  /// Serializes this MeterLastReading to a JSON map.
  Map<String, dynamic> toJson();


@override
bool operator ==(Object other) {
  return identical(this, other) || (other.runtimeType == runtimeType&&other is MeterLastReading&&(identical(other.readingDate, readingDate) || other.readingDate == readingDate)&&(identical(other.currentIndex, currentIndex) || other.currentIndex == currentIndex));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode => Object.hash(runtimeType,readingDate,currentIndex);

@override
String toString() {
  return 'MeterLastReading(readingDate: $readingDate, currentIndex: $currentIndex)';
}


}

/// @nodoc
abstract mixin class $MeterLastReadingCopyWith<$Res>  {
  factory $MeterLastReadingCopyWith(MeterLastReading value, $Res Function(MeterLastReading) _then) = _$MeterLastReadingCopyWithImpl;
@useResult
$Res call({
 String readingDate, int currentIndex
});




}
/// @nodoc
class _$MeterLastReadingCopyWithImpl<$Res>
    implements $MeterLastReadingCopyWith<$Res> {
  _$MeterLastReadingCopyWithImpl(this._self, this._then);

  final MeterLastReading _self;
  final $Res Function(MeterLastReading) _then;

/// Create a copy of MeterLastReading
/// with the given fields replaced by the non-null parameter values.
@pragma('vm:prefer-inline') @override $Res call({Object? readingDate = null,Object? currentIndex = null,}) {
  return _then(_self.copyWith(
readingDate: null == readingDate ? _self.readingDate : readingDate // ignore: cast_nullable_to_non_nullable
as String,currentIndex: null == currentIndex ? _self.currentIndex : currentIndex // ignore: cast_nullable_to_non_nullable
as int,
  ));
}

}


/// Adds pattern-matching-related methods to [MeterLastReading].
extension MeterLastReadingPatterns on MeterLastReading {
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

@optionalTypeArgs TResult maybeMap<TResult extends Object?>(TResult Function( _MeterLastReading value)?  $default,{required TResult orElse(),}){
final _that = this;
switch (_that) {
case _MeterLastReading() when $default != null:
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

@optionalTypeArgs TResult map<TResult extends Object?>(TResult Function( _MeterLastReading value)  $default,){
final _that = this;
switch (_that) {
case _MeterLastReading():
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

@optionalTypeArgs TResult? mapOrNull<TResult extends Object?>(TResult? Function( _MeterLastReading value)?  $default,){
final _that = this;
switch (_that) {
case _MeterLastReading() when $default != null:
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

@optionalTypeArgs TResult maybeWhen<TResult extends Object?>(TResult Function( String readingDate,  int currentIndex)?  $default,{required TResult orElse(),}) {final _that = this;
switch (_that) {
case _MeterLastReading() when $default != null:
return $default(_that.readingDate,_that.currentIndex);case _:
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

@optionalTypeArgs TResult when<TResult extends Object?>(TResult Function( String readingDate,  int currentIndex)  $default,) {final _that = this;
switch (_that) {
case _MeterLastReading():
return $default(_that.readingDate,_that.currentIndex);case _:
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

@optionalTypeArgs TResult? whenOrNull<TResult extends Object?>(TResult? Function( String readingDate,  int currentIndex)?  $default,) {final _that = this;
switch (_that) {
case _MeterLastReading() when $default != null:
return $default(_that.readingDate,_that.currentIndex);case _:
  return null;

}
}

}

/// @nodoc
@JsonSerializable()

class _MeterLastReading implements MeterLastReading {
  const _MeterLastReading({required this.readingDate, required this.currentIndex});
  factory _MeterLastReading.fromJson(Map<String, dynamic> json) => _$MeterLastReadingFromJson(json);

@override final  String readingDate;
@override final  int currentIndex;

/// Create a copy of MeterLastReading
/// with the given fields replaced by the non-null parameter values.
@override @JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
_$MeterLastReadingCopyWith<_MeterLastReading> get copyWith => __$MeterLastReadingCopyWithImpl<_MeterLastReading>(this, _$identity);

@override
Map<String, dynamic> toJson() {
  return _$MeterLastReadingToJson(this, );
}

@override
bool operator ==(Object other) {
  return identical(this, other) || (other.runtimeType == runtimeType&&other is _MeterLastReading&&(identical(other.readingDate, readingDate) || other.readingDate == readingDate)&&(identical(other.currentIndex, currentIndex) || other.currentIndex == currentIndex));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode => Object.hash(runtimeType,readingDate,currentIndex);

@override
String toString() {
  return 'MeterLastReading(readingDate: $readingDate, currentIndex: $currentIndex)';
}


}

/// @nodoc
abstract mixin class _$MeterLastReadingCopyWith<$Res> implements $MeterLastReadingCopyWith<$Res> {
  factory _$MeterLastReadingCopyWith(_MeterLastReading value, $Res Function(_MeterLastReading) _then) = __$MeterLastReadingCopyWithImpl;
@override @useResult
$Res call({
 String readingDate, int currentIndex
});




}
/// @nodoc
class __$MeterLastReadingCopyWithImpl<$Res>
    implements _$MeterLastReadingCopyWith<$Res> {
  __$MeterLastReadingCopyWithImpl(this._self, this._then);

  final _MeterLastReading _self;
  final $Res Function(_MeterLastReading) _then;

/// Create a copy of MeterLastReading
/// with the given fields replaced by the non-null parameter values.
@override @pragma('vm:prefer-inline') $Res call({Object? readingDate = null,Object? currentIndex = null,}) {
  return _then(_MeterLastReading(
readingDate: null == readingDate ? _self.readingDate : readingDate // ignore: cast_nullable_to_non_nullable
as String,currentIndex: null == currentIndex ? _self.currentIndex : currentIndex // ignore: cast_nullable_to_non_nullable
as int,
  ));
}


}


/// @nodoc
mixin _$Meter {

 String get id; String get propertyId; String? get unitId; MeterType get meterType; String get serialNumber; bool get isPrepaid; bool get isShared; int get digitsCount; String? get measurementUnit; MeterLastReading? get lastReading;
/// Create a copy of Meter
/// with the given fields replaced by the non-null parameter values.
@JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
$MeterCopyWith<Meter> get copyWith => _$MeterCopyWithImpl<Meter>(this as Meter, _$identity);

  /// Serializes this Meter to a JSON map.
  Map<String, dynamic> toJson();


@override
bool operator ==(Object other) {
  return identical(this, other) || (other.runtimeType == runtimeType&&other is Meter&&(identical(other.id, id) || other.id == id)&&(identical(other.propertyId, propertyId) || other.propertyId == propertyId)&&(identical(other.unitId, unitId) || other.unitId == unitId)&&(identical(other.meterType, meterType) || other.meterType == meterType)&&(identical(other.serialNumber, serialNumber) || other.serialNumber == serialNumber)&&(identical(other.isPrepaid, isPrepaid) || other.isPrepaid == isPrepaid)&&(identical(other.isShared, isShared) || other.isShared == isShared)&&(identical(other.digitsCount, digitsCount) || other.digitsCount == digitsCount)&&(identical(other.measurementUnit, measurementUnit) || other.measurementUnit == measurementUnit)&&(identical(other.lastReading, lastReading) || other.lastReading == lastReading));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode => Object.hash(runtimeType,id,propertyId,unitId,meterType,serialNumber,isPrepaid,isShared,digitsCount,measurementUnit,lastReading);

@override
String toString() {
  return 'Meter(id: $id, propertyId: $propertyId, unitId: $unitId, meterType: $meterType, serialNumber: $serialNumber, isPrepaid: $isPrepaid, isShared: $isShared, digitsCount: $digitsCount, measurementUnit: $measurementUnit, lastReading: $lastReading)';
}


}

/// @nodoc
abstract mixin class $MeterCopyWith<$Res>  {
  factory $MeterCopyWith(Meter value, $Res Function(Meter) _then) = _$MeterCopyWithImpl;
@useResult
$Res call({
 String id, String propertyId, String? unitId, MeterType meterType, String serialNumber, bool isPrepaid, bool isShared, int digitsCount, String? measurementUnit, MeterLastReading? lastReading
});


$MeterLastReadingCopyWith<$Res>? get lastReading;

}
/// @nodoc
class _$MeterCopyWithImpl<$Res>
    implements $MeterCopyWith<$Res> {
  _$MeterCopyWithImpl(this._self, this._then);

  final Meter _self;
  final $Res Function(Meter) _then;

/// Create a copy of Meter
/// with the given fields replaced by the non-null parameter values.
@pragma('vm:prefer-inline') @override $Res call({Object? id = null,Object? propertyId = null,Object? unitId = freezed,Object? meterType = null,Object? serialNumber = null,Object? isPrepaid = null,Object? isShared = null,Object? digitsCount = null,Object? measurementUnit = freezed,Object? lastReading = freezed,}) {
  return _then(_self.copyWith(
id: null == id ? _self.id : id // ignore: cast_nullable_to_non_nullable
as String,propertyId: null == propertyId ? _self.propertyId : propertyId // ignore: cast_nullable_to_non_nullable
as String,unitId: freezed == unitId ? _self.unitId : unitId // ignore: cast_nullable_to_non_nullable
as String?,meterType: null == meterType ? _self.meterType : meterType // ignore: cast_nullable_to_non_nullable
as MeterType,serialNumber: null == serialNumber ? _self.serialNumber : serialNumber // ignore: cast_nullable_to_non_nullable
as String,isPrepaid: null == isPrepaid ? _self.isPrepaid : isPrepaid // ignore: cast_nullable_to_non_nullable
as bool,isShared: null == isShared ? _self.isShared : isShared // ignore: cast_nullable_to_non_nullable
as bool,digitsCount: null == digitsCount ? _self.digitsCount : digitsCount // ignore: cast_nullable_to_non_nullable
as int,measurementUnit: freezed == measurementUnit ? _self.measurementUnit : measurementUnit // ignore: cast_nullable_to_non_nullable
as String?,lastReading: freezed == lastReading ? _self.lastReading : lastReading // ignore: cast_nullable_to_non_nullable
as MeterLastReading?,
  ));
}
/// Create a copy of Meter
/// with the given fields replaced by the non-null parameter values.
@override
@pragma('vm:prefer-inline')
$MeterLastReadingCopyWith<$Res>? get lastReading {
    if (_self.lastReading == null) {
    return null;
  }

  return $MeterLastReadingCopyWith<$Res>(_self.lastReading!, (value) {
    return _then(_self.copyWith(lastReading: value));
  });
}
}


/// Adds pattern-matching-related methods to [Meter].
extension MeterPatterns on Meter {
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

@optionalTypeArgs TResult maybeMap<TResult extends Object?>(TResult Function( _Meter value)?  $default,{required TResult orElse(),}){
final _that = this;
switch (_that) {
case _Meter() when $default != null:
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

@optionalTypeArgs TResult map<TResult extends Object?>(TResult Function( _Meter value)  $default,){
final _that = this;
switch (_that) {
case _Meter():
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

@optionalTypeArgs TResult? mapOrNull<TResult extends Object?>(TResult? Function( _Meter value)?  $default,){
final _that = this;
switch (_that) {
case _Meter() when $default != null:
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

@optionalTypeArgs TResult maybeWhen<TResult extends Object?>(TResult Function( String id,  String propertyId,  String? unitId,  MeterType meterType,  String serialNumber,  bool isPrepaid,  bool isShared,  int digitsCount,  String? measurementUnit,  MeterLastReading? lastReading)?  $default,{required TResult orElse(),}) {final _that = this;
switch (_that) {
case _Meter() when $default != null:
return $default(_that.id,_that.propertyId,_that.unitId,_that.meterType,_that.serialNumber,_that.isPrepaid,_that.isShared,_that.digitsCount,_that.measurementUnit,_that.lastReading);case _:
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

@optionalTypeArgs TResult when<TResult extends Object?>(TResult Function( String id,  String propertyId,  String? unitId,  MeterType meterType,  String serialNumber,  bool isPrepaid,  bool isShared,  int digitsCount,  String? measurementUnit,  MeterLastReading? lastReading)  $default,) {final _that = this;
switch (_that) {
case _Meter():
return $default(_that.id,_that.propertyId,_that.unitId,_that.meterType,_that.serialNumber,_that.isPrepaid,_that.isShared,_that.digitsCount,_that.measurementUnit,_that.lastReading);case _:
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

@optionalTypeArgs TResult? whenOrNull<TResult extends Object?>(TResult? Function( String id,  String propertyId,  String? unitId,  MeterType meterType,  String serialNumber,  bool isPrepaid,  bool isShared,  int digitsCount,  String? measurementUnit,  MeterLastReading? lastReading)?  $default,) {final _that = this;
switch (_that) {
case _Meter() when $default != null:
return $default(_that.id,_that.propertyId,_that.unitId,_that.meterType,_that.serialNumber,_that.isPrepaid,_that.isShared,_that.digitsCount,_that.measurementUnit,_that.lastReading);case _:
  return null;

}
}

}

/// @nodoc
@JsonSerializable()

class _Meter implements Meter {
  const _Meter({required this.id, required this.propertyId, this.unitId, required this.meterType, required this.serialNumber, this.isPrepaid = false, this.isShared = false, this.digitsCount = 5, this.measurementUnit, this.lastReading});
  factory _Meter.fromJson(Map<String, dynamic> json) => _$MeterFromJson(json);

@override final  String id;
@override final  String propertyId;
@override final  String? unitId;
@override final  MeterType meterType;
@override final  String serialNumber;
@override@JsonKey() final  bool isPrepaid;
@override@JsonKey() final  bool isShared;
@override@JsonKey() final  int digitsCount;
@override final  String? measurementUnit;
@override final  MeterLastReading? lastReading;

/// Create a copy of Meter
/// with the given fields replaced by the non-null parameter values.
@override @JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
_$MeterCopyWith<_Meter> get copyWith => __$MeterCopyWithImpl<_Meter>(this, _$identity);

@override
Map<String, dynamic> toJson() {
  return _$MeterToJson(this, );
}

@override
bool operator ==(Object other) {
  return identical(this, other) || (other.runtimeType == runtimeType&&other is _Meter&&(identical(other.id, id) || other.id == id)&&(identical(other.propertyId, propertyId) || other.propertyId == propertyId)&&(identical(other.unitId, unitId) || other.unitId == unitId)&&(identical(other.meterType, meterType) || other.meterType == meterType)&&(identical(other.serialNumber, serialNumber) || other.serialNumber == serialNumber)&&(identical(other.isPrepaid, isPrepaid) || other.isPrepaid == isPrepaid)&&(identical(other.isShared, isShared) || other.isShared == isShared)&&(identical(other.digitsCount, digitsCount) || other.digitsCount == digitsCount)&&(identical(other.measurementUnit, measurementUnit) || other.measurementUnit == measurementUnit)&&(identical(other.lastReading, lastReading) || other.lastReading == lastReading));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode => Object.hash(runtimeType,id,propertyId,unitId,meterType,serialNumber,isPrepaid,isShared,digitsCount,measurementUnit,lastReading);

@override
String toString() {
  return 'Meter(id: $id, propertyId: $propertyId, unitId: $unitId, meterType: $meterType, serialNumber: $serialNumber, isPrepaid: $isPrepaid, isShared: $isShared, digitsCount: $digitsCount, measurementUnit: $measurementUnit, lastReading: $lastReading)';
}


}

/// @nodoc
abstract mixin class _$MeterCopyWith<$Res> implements $MeterCopyWith<$Res> {
  factory _$MeterCopyWith(_Meter value, $Res Function(_Meter) _then) = __$MeterCopyWithImpl;
@override @useResult
$Res call({
 String id, String propertyId, String? unitId, MeterType meterType, String serialNumber, bool isPrepaid, bool isShared, int digitsCount, String? measurementUnit, MeterLastReading? lastReading
});


@override $MeterLastReadingCopyWith<$Res>? get lastReading;

}
/// @nodoc
class __$MeterCopyWithImpl<$Res>
    implements _$MeterCopyWith<$Res> {
  __$MeterCopyWithImpl(this._self, this._then);

  final _Meter _self;
  final $Res Function(_Meter) _then;

/// Create a copy of Meter
/// with the given fields replaced by the non-null parameter values.
@override @pragma('vm:prefer-inline') $Res call({Object? id = null,Object? propertyId = null,Object? unitId = freezed,Object? meterType = null,Object? serialNumber = null,Object? isPrepaid = null,Object? isShared = null,Object? digitsCount = null,Object? measurementUnit = freezed,Object? lastReading = freezed,}) {
  return _then(_Meter(
id: null == id ? _self.id : id // ignore: cast_nullable_to_non_nullable
as String,propertyId: null == propertyId ? _self.propertyId : propertyId // ignore: cast_nullable_to_non_nullable
as String,unitId: freezed == unitId ? _self.unitId : unitId // ignore: cast_nullable_to_non_nullable
as String?,meterType: null == meterType ? _self.meterType : meterType // ignore: cast_nullable_to_non_nullable
as MeterType,serialNumber: null == serialNumber ? _self.serialNumber : serialNumber // ignore: cast_nullable_to_non_nullable
as String,isPrepaid: null == isPrepaid ? _self.isPrepaid : isPrepaid // ignore: cast_nullable_to_non_nullable
as bool,isShared: null == isShared ? _self.isShared : isShared // ignore: cast_nullable_to_non_nullable
as bool,digitsCount: null == digitsCount ? _self.digitsCount : digitsCount // ignore: cast_nullable_to_non_nullable
as int,measurementUnit: freezed == measurementUnit ? _self.measurementUnit : measurementUnit // ignore: cast_nullable_to_non_nullable
as String?,lastReading: freezed == lastReading ? _self.lastReading : lastReading // ignore: cast_nullable_to_non_nullable
as MeterLastReading?,
  ));
}

/// Create a copy of Meter
/// with the given fields replaced by the non-null parameter values.
@override
@pragma('vm:prefer-inline')
$MeterLastReadingCopyWith<$Res>? get lastReading {
    if (_self.lastReading == null) {
    return null;
  }

  return $MeterLastReadingCopyWith<$Res>(_self.lastReading!, (value) {
    return _then(_self.copyWith(lastReading: value));
  });
}
}

// dart format on
