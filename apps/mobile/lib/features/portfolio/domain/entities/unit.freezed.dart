// GENERATED CODE - DO NOT MODIFY BY HAND
// coverage:ignore-file
// ignore_for_file: type=lint
// ignore_for_file: unused_element, deprecated_member_use, deprecated_member_use_from_same_package, use_function_type_syntax_for_parameters, unnecessary_const, avoid_init_to_null, invalid_override_different_default_values_named, prefer_expression_function_bodies, annotate_overrides, invalid_annotation_target, unnecessary_question_mark

part of 'unit.dart';

// **************************************************************************
// FreezedGenerator
// **************************************************************************

// dart format off
T _$identity<T>(T value) => value;

/// @nodoc
mixin _$Unit {

 String get id; String get propertyId; String get code; String? get label; UnitType? get unitType; UnitStatus get status; int? get floorNumber; int? get roomsCount; int? get bedroomsCount; int? get bathroomsCount; double? get areaSqm; bool? get isFurnished; int get baseRentAmount; int? get baseChargesAmount;
/// Create a copy of Unit
/// with the given fields replaced by the non-null parameter values.
@JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
$UnitCopyWith<Unit> get copyWith => _$UnitCopyWithImpl<Unit>(this as Unit, _$identity);

  /// Serializes this Unit to a JSON map.
  Map<String, dynamic> toJson();


@override
bool operator ==(Object other) {
  return identical(this, other) || (other.runtimeType == runtimeType&&other is Unit&&(identical(other.id, id) || other.id == id)&&(identical(other.propertyId, propertyId) || other.propertyId == propertyId)&&(identical(other.code, code) || other.code == code)&&(identical(other.label, label) || other.label == label)&&(identical(other.unitType, unitType) || other.unitType == unitType)&&(identical(other.status, status) || other.status == status)&&(identical(other.floorNumber, floorNumber) || other.floorNumber == floorNumber)&&(identical(other.roomsCount, roomsCount) || other.roomsCount == roomsCount)&&(identical(other.bedroomsCount, bedroomsCount) || other.bedroomsCount == bedroomsCount)&&(identical(other.bathroomsCount, bathroomsCount) || other.bathroomsCount == bathroomsCount)&&(identical(other.areaSqm, areaSqm) || other.areaSqm == areaSqm)&&(identical(other.isFurnished, isFurnished) || other.isFurnished == isFurnished)&&(identical(other.baseRentAmount, baseRentAmount) || other.baseRentAmount == baseRentAmount)&&(identical(other.baseChargesAmount, baseChargesAmount) || other.baseChargesAmount == baseChargesAmount));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode => Object.hash(runtimeType,id,propertyId,code,label,unitType,status,floorNumber,roomsCount,bedroomsCount,bathroomsCount,areaSqm,isFurnished,baseRentAmount,baseChargesAmount);

@override
String toString() {
  return 'Unit(id: $id, propertyId: $propertyId, code: $code, label: $label, unitType: $unitType, status: $status, floorNumber: $floorNumber, roomsCount: $roomsCount, bedroomsCount: $bedroomsCount, bathroomsCount: $bathroomsCount, areaSqm: $areaSqm, isFurnished: $isFurnished, baseRentAmount: $baseRentAmount, baseChargesAmount: $baseChargesAmount)';
}


}

/// @nodoc
abstract mixin class $UnitCopyWith<$Res>  {
  factory $UnitCopyWith(Unit value, $Res Function(Unit) _then) = _$UnitCopyWithImpl;
@useResult
$Res call({
 String id, String propertyId, String code, String? label, UnitType? unitType, UnitStatus status, int? floorNumber, int? roomsCount, int? bedroomsCount, int? bathroomsCount, double? areaSqm, bool? isFurnished, int baseRentAmount, int? baseChargesAmount
});




}
/// @nodoc
class _$UnitCopyWithImpl<$Res>
    implements $UnitCopyWith<$Res> {
  _$UnitCopyWithImpl(this._self, this._then);

  final Unit _self;
  final $Res Function(Unit) _then;

/// Create a copy of Unit
/// with the given fields replaced by the non-null parameter values.
@pragma('vm:prefer-inline') @override $Res call({Object? id = null,Object? propertyId = null,Object? code = null,Object? label = freezed,Object? unitType = freezed,Object? status = null,Object? floorNumber = freezed,Object? roomsCount = freezed,Object? bedroomsCount = freezed,Object? bathroomsCount = freezed,Object? areaSqm = freezed,Object? isFurnished = freezed,Object? baseRentAmount = null,Object? baseChargesAmount = freezed,}) {
  return _then(_self.copyWith(
id: null == id ? _self.id : id // ignore: cast_nullable_to_non_nullable
as String,propertyId: null == propertyId ? _self.propertyId : propertyId // ignore: cast_nullable_to_non_nullable
as String,code: null == code ? _self.code : code // ignore: cast_nullable_to_non_nullable
as String,label: freezed == label ? _self.label : label // ignore: cast_nullable_to_non_nullable
as String?,unitType: freezed == unitType ? _self.unitType : unitType // ignore: cast_nullable_to_non_nullable
as UnitType?,status: null == status ? _self.status : status // ignore: cast_nullable_to_non_nullable
as UnitStatus,floorNumber: freezed == floorNumber ? _self.floorNumber : floorNumber // ignore: cast_nullable_to_non_nullable
as int?,roomsCount: freezed == roomsCount ? _self.roomsCount : roomsCount // ignore: cast_nullable_to_non_nullable
as int?,bedroomsCount: freezed == bedroomsCount ? _self.bedroomsCount : bedroomsCount // ignore: cast_nullable_to_non_nullable
as int?,bathroomsCount: freezed == bathroomsCount ? _self.bathroomsCount : bathroomsCount // ignore: cast_nullable_to_non_nullable
as int?,areaSqm: freezed == areaSqm ? _self.areaSqm : areaSqm // ignore: cast_nullable_to_non_nullable
as double?,isFurnished: freezed == isFurnished ? _self.isFurnished : isFurnished // ignore: cast_nullable_to_non_nullable
as bool?,baseRentAmount: null == baseRentAmount ? _self.baseRentAmount : baseRentAmount // ignore: cast_nullable_to_non_nullable
as int,baseChargesAmount: freezed == baseChargesAmount ? _self.baseChargesAmount : baseChargesAmount // ignore: cast_nullable_to_non_nullable
as int?,
  ));
}

}


/// Adds pattern-matching-related methods to [Unit].
extension UnitPatterns on Unit {
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

@optionalTypeArgs TResult maybeMap<TResult extends Object?>(TResult Function( _Unit value)?  $default,{required TResult orElse(),}){
final _that = this;
switch (_that) {
case _Unit() when $default != null:
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

@optionalTypeArgs TResult map<TResult extends Object?>(TResult Function( _Unit value)  $default,){
final _that = this;
switch (_that) {
case _Unit():
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

@optionalTypeArgs TResult? mapOrNull<TResult extends Object?>(TResult? Function( _Unit value)?  $default,){
final _that = this;
switch (_that) {
case _Unit() when $default != null:
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

@optionalTypeArgs TResult maybeWhen<TResult extends Object?>(TResult Function( String id,  String propertyId,  String code,  String? label,  UnitType? unitType,  UnitStatus status,  int? floorNumber,  int? roomsCount,  int? bedroomsCount,  int? bathroomsCount,  double? areaSqm,  bool? isFurnished,  int baseRentAmount,  int? baseChargesAmount)?  $default,{required TResult orElse(),}) {final _that = this;
switch (_that) {
case _Unit() when $default != null:
return $default(_that.id,_that.propertyId,_that.code,_that.label,_that.unitType,_that.status,_that.floorNumber,_that.roomsCount,_that.bedroomsCount,_that.bathroomsCount,_that.areaSqm,_that.isFurnished,_that.baseRentAmount,_that.baseChargesAmount);case _:
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

@optionalTypeArgs TResult when<TResult extends Object?>(TResult Function( String id,  String propertyId,  String code,  String? label,  UnitType? unitType,  UnitStatus status,  int? floorNumber,  int? roomsCount,  int? bedroomsCount,  int? bathroomsCount,  double? areaSqm,  bool? isFurnished,  int baseRentAmount,  int? baseChargesAmount)  $default,) {final _that = this;
switch (_that) {
case _Unit():
return $default(_that.id,_that.propertyId,_that.code,_that.label,_that.unitType,_that.status,_that.floorNumber,_that.roomsCount,_that.bedroomsCount,_that.bathroomsCount,_that.areaSqm,_that.isFurnished,_that.baseRentAmount,_that.baseChargesAmount);case _:
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

@optionalTypeArgs TResult? whenOrNull<TResult extends Object?>(TResult? Function( String id,  String propertyId,  String code,  String? label,  UnitType? unitType,  UnitStatus status,  int? floorNumber,  int? roomsCount,  int? bedroomsCount,  int? bathroomsCount,  double? areaSqm,  bool? isFurnished,  int baseRentAmount,  int? baseChargesAmount)?  $default,) {final _that = this;
switch (_that) {
case _Unit() when $default != null:
return $default(_that.id,_that.propertyId,_that.code,_that.label,_that.unitType,_that.status,_that.floorNumber,_that.roomsCount,_that.bedroomsCount,_that.bathroomsCount,_that.areaSqm,_that.isFurnished,_that.baseRentAmount,_that.baseChargesAmount);case _:
  return null;

}
}

}

/// @nodoc
@JsonSerializable()

class _Unit implements Unit {
  const _Unit({required this.id, required this.propertyId, required this.code, this.label, this.unitType, required this.status, this.floorNumber, this.roomsCount, this.bedroomsCount, this.bathroomsCount, this.areaSqm, this.isFurnished, required this.baseRentAmount, this.baseChargesAmount});
  factory _Unit.fromJson(Map<String, dynamic> json) => _$UnitFromJson(json);

@override final  String id;
@override final  String propertyId;
@override final  String code;
@override final  String? label;
@override final  UnitType? unitType;
@override final  UnitStatus status;
@override final  int? floorNumber;
@override final  int? roomsCount;
@override final  int? bedroomsCount;
@override final  int? bathroomsCount;
@override final  double? areaSqm;
@override final  bool? isFurnished;
@override final  int baseRentAmount;
@override final  int? baseChargesAmount;

/// Create a copy of Unit
/// with the given fields replaced by the non-null parameter values.
@override @JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
_$UnitCopyWith<_Unit> get copyWith => __$UnitCopyWithImpl<_Unit>(this, _$identity);

@override
Map<String, dynamic> toJson() {
  return _$UnitToJson(this, );
}

@override
bool operator ==(Object other) {
  return identical(this, other) || (other.runtimeType == runtimeType&&other is _Unit&&(identical(other.id, id) || other.id == id)&&(identical(other.propertyId, propertyId) || other.propertyId == propertyId)&&(identical(other.code, code) || other.code == code)&&(identical(other.label, label) || other.label == label)&&(identical(other.unitType, unitType) || other.unitType == unitType)&&(identical(other.status, status) || other.status == status)&&(identical(other.floorNumber, floorNumber) || other.floorNumber == floorNumber)&&(identical(other.roomsCount, roomsCount) || other.roomsCount == roomsCount)&&(identical(other.bedroomsCount, bedroomsCount) || other.bedroomsCount == bedroomsCount)&&(identical(other.bathroomsCount, bathroomsCount) || other.bathroomsCount == bathroomsCount)&&(identical(other.areaSqm, areaSqm) || other.areaSqm == areaSqm)&&(identical(other.isFurnished, isFurnished) || other.isFurnished == isFurnished)&&(identical(other.baseRentAmount, baseRentAmount) || other.baseRentAmount == baseRentAmount)&&(identical(other.baseChargesAmount, baseChargesAmount) || other.baseChargesAmount == baseChargesAmount));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode => Object.hash(runtimeType,id,propertyId,code,label,unitType,status,floorNumber,roomsCount,bedroomsCount,bathroomsCount,areaSqm,isFurnished,baseRentAmount,baseChargesAmount);

@override
String toString() {
  return 'Unit(id: $id, propertyId: $propertyId, code: $code, label: $label, unitType: $unitType, status: $status, floorNumber: $floorNumber, roomsCount: $roomsCount, bedroomsCount: $bedroomsCount, bathroomsCount: $bathroomsCount, areaSqm: $areaSqm, isFurnished: $isFurnished, baseRentAmount: $baseRentAmount, baseChargesAmount: $baseChargesAmount)';
}


}

/// @nodoc
abstract mixin class _$UnitCopyWith<$Res> implements $UnitCopyWith<$Res> {
  factory _$UnitCopyWith(_Unit value, $Res Function(_Unit) _then) = __$UnitCopyWithImpl;
@override @useResult
$Res call({
 String id, String propertyId, String code, String? label, UnitType? unitType, UnitStatus status, int? floorNumber, int? roomsCount, int? bedroomsCount, int? bathroomsCount, double? areaSqm, bool? isFurnished, int baseRentAmount, int? baseChargesAmount
});




}
/// @nodoc
class __$UnitCopyWithImpl<$Res>
    implements _$UnitCopyWith<$Res> {
  __$UnitCopyWithImpl(this._self, this._then);

  final _Unit _self;
  final $Res Function(_Unit) _then;

/// Create a copy of Unit
/// with the given fields replaced by the non-null parameter values.
@override @pragma('vm:prefer-inline') $Res call({Object? id = null,Object? propertyId = null,Object? code = null,Object? label = freezed,Object? unitType = freezed,Object? status = null,Object? floorNumber = freezed,Object? roomsCount = freezed,Object? bedroomsCount = freezed,Object? bathroomsCount = freezed,Object? areaSqm = freezed,Object? isFurnished = freezed,Object? baseRentAmount = null,Object? baseChargesAmount = freezed,}) {
  return _then(_Unit(
id: null == id ? _self.id : id // ignore: cast_nullable_to_non_nullable
as String,propertyId: null == propertyId ? _self.propertyId : propertyId // ignore: cast_nullable_to_non_nullable
as String,code: null == code ? _self.code : code // ignore: cast_nullable_to_non_nullable
as String,label: freezed == label ? _self.label : label // ignore: cast_nullable_to_non_nullable
as String?,unitType: freezed == unitType ? _self.unitType : unitType // ignore: cast_nullable_to_non_nullable
as UnitType?,status: null == status ? _self.status : status // ignore: cast_nullable_to_non_nullable
as UnitStatus,floorNumber: freezed == floorNumber ? _self.floorNumber : floorNumber // ignore: cast_nullable_to_non_nullable
as int?,roomsCount: freezed == roomsCount ? _self.roomsCount : roomsCount // ignore: cast_nullable_to_non_nullable
as int?,bedroomsCount: freezed == bedroomsCount ? _self.bedroomsCount : bedroomsCount // ignore: cast_nullable_to_non_nullable
as int?,bathroomsCount: freezed == bathroomsCount ? _self.bathroomsCount : bathroomsCount // ignore: cast_nullable_to_non_nullable
as int?,areaSqm: freezed == areaSqm ? _self.areaSqm : areaSqm // ignore: cast_nullable_to_non_nullable
as double?,isFurnished: freezed == isFurnished ? _self.isFurnished : isFurnished // ignore: cast_nullable_to_non_nullable
as bool?,baseRentAmount: null == baseRentAmount ? _self.baseRentAmount : baseRentAmount // ignore: cast_nullable_to_non_nullable
as int,baseChargesAmount: freezed == baseChargesAmount ? _self.baseChargesAmount : baseChargesAmount // ignore: cast_nullable_to_non_nullable
as int?,
  ));
}


}

// dart format on
