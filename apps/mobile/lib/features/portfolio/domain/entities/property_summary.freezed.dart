// GENERATED CODE - DO NOT MODIFY BY HAND
// coverage:ignore-file
// ignore_for_file: type=lint
// ignore_for_file: unused_element, deprecated_member_use, deprecated_member_use_from_same_package, use_function_type_syntax_for_parameters, unnecessary_const, avoid_init_to_null, invalid_override_different_default_values_named, prefer_expression_function_bodies, annotate_overrides, invalid_annotation_target, unnecessary_question_mark

part of 'property_summary.dart';

// **************************************************************************
// FreezedGenerator
// **************************************************************************

// dart format off
T _$identity<T>(T value) => value;

/// @nodoc
mixin _$PropertySummary {

 String get id; String? get code; String get name; PropertyType get propertyType; String get district; String get city; LandlordSummary get landlord; Occupancy get occupancy; String? get coverDocumentId;
/// Create a copy of PropertySummary
/// with the given fields replaced by the non-null parameter values.
@JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
$PropertySummaryCopyWith<PropertySummary> get copyWith => _$PropertySummaryCopyWithImpl<PropertySummary>(this as PropertySummary, _$identity);

  /// Serializes this PropertySummary to a JSON map.
  Map<String, dynamic> toJson();


@override
bool operator ==(Object other) {
  return identical(this, other) || (other.runtimeType == runtimeType&&other is PropertySummary&&(identical(other.id, id) || other.id == id)&&(identical(other.code, code) || other.code == code)&&(identical(other.name, name) || other.name == name)&&(identical(other.propertyType, propertyType) || other.propertyType == propertyType)&&(identical(other.district, district) || other.district == district)&&(identical(other.city, city) || other.city == city)&&(identical(other.landlord, landlord) || other.landlord == landlord)&&(identical(other.occupancy, occupancy) || other.occupancy == occupancy)&&(identical(other.coverDocumentId, coverDocumentId) || other.coverDocumentId == coverDocumentId));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode => Object.hash(runtimeType,id,code,name,propertyType,district,city,landlord,occupancy,coverDocumentId);

@override
String toString() {
  return 'PropertySummary(id: $id, code: $code, name: $name, propertyType: $propertyType, district: $district, city: $city, landlord: $landlord, occupancy: $occupancy, coverDocumentId: $coverDocumentId)';
}


}

/// @nodoc
abstract mixin class $PropertySummaryCopyWith<$Res>  {
  factory $PropertySummaryCopyWith(PropertySummary value, $Res Function(PropertySummary) _then) = _$PropertySummaryCopyWithImpl;
@useResult
$Res call({
 String id, String? code, String name, PropertyType propertyType, String district, String city, LandlordSummary landlord, Occupancy occupancy, String? coverDocumentId
});


$LandlordSummaryCopyWith<$Res> get landlord;$OccupancyCopyWith<$Res> get occupancy;

}
/// @nodoc
class _$PropertySummaryCopyWithImpl<$Res>
    implements $PropertySummaryCopyWith<$Res> {
  _$PropertySummaryCopyWithImpl(this._self, this._then);

  final PropertySummary _self;
  final $Res Function(PropertySummary) _then;

/// Create a copy of PropertySummary
/// with the given fields replaced by the non-null parameter values.
@pragma('vm:prefer-inline') @override $Res call({Object? id = null,Object? code = freezed,Object? name = null,Object? propertyType = null,Object? district = null,Object? city = null,Object? landlord = null,Object? occupancy = null,Object? coverDocumentId = freezed,}) {
  return _then(_self.copyWith(
id: null == id ? _self.id : id // ignore: cast_nullable_to_non_nullable
as String,code: freezed == code ? _self.code : code // ignore: cast_nullable_to_non_nullable
as String?,name: null == name ? _self.name : name // ignore: cast_nullable_to_non_nullable
as String,propertyType: null == propertyType ? _self.propertyType : propertyType // ignore: cast_nullable_to_non_nullable
as PropertyType,district: null == district ? _self.district : district // ignore: cast_nullable_to_non_nullable
as String,city: null == city ? _self.city : city // ignore: cast_nullable_to_non_nullable
as String,landlord: null == landlord ? _self.landlord : landlord // ignore: cast_nullable_to_non_nullable
as LandlordSummary,occupancy: null == occupancy ? _self.occupancy : occupancy // ignore: cast_nullable_to_non_nullable
as Occupancy,coverDocumentId: freezed == coverDocumentId ? _self.coverDocumentId : coverDocumentId // ignore: cast_nullable_to_non_nullable
as String?,
  ));
}
/// Create a copy of PropertySummary
/// with the given fields replaced by the non-null parameter values.
@override
@pragma('vm:prefer-inline')
$LandlordSummaryCopyWith<$Res> get landlord {
  
  return $LandlordSummaryCopyWith<$Res>(_self.landlord, (value) {
    return _then(_self.copyWith(landlord: value));
  });
}/// Create a copy of PropertySummary
/// with the given fields replaced by the non-null parameter values.
@override
@pragma('vm:prefer-inline')
$OccupancyCopyWith<$Res> get occupancy {
  
  return $OccupancyCopyWith<$Res>(_self.occupancy, (value) {
    return _then(_self.copyWith(occupancy: value));
  });
}
}


/// Adds pattern-matching-related methods to [PropertySummary].
extension PropertySummaryPatterns on PropertySummary {
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

@optionalTypeArgs TResult maybeMap<TResult extends Object?>(TResult Function( _PropertySummary value)?  $default,{required TResult orElse(),}){
final _that = this;
switch (_that) {
case _PropertySummary() when $default != null:
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

@optionalTypeArgs TResult map<TResult extends Object?>(TResult Function( _PropertySummary value)  $default,){
final _that = this;
switch (_that) {
case _PropertySummary():
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

@optionalTypeArgs TResult? mapOrNull<TResult extends Object?>(TResult? Function( _PropertySummary value)?  $default,){
final _that = this;
switch (_that) {
case _PropertySummary() when $default != null:
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

@optionalTypeArgs TResult maybeWhen<TResult extends Object?>(TResult Function( String id,  String? code,  String name,  PropertyType propertyType,  String district,  String city,  LandlordSummary landlord,  Occupancy occupancy,  String? coverDocumentId)?  $default,{required TResult orElse(),}) {final _that = this;
switch (_that) {
case _PropertySummary() when $default != null:
return $default(_that.id,_that.code,_that.name,_that.propertyType,_that.district,_that.city,_that.landlord,_that.occupancy,_that.coverDocumentId);case _:
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

@optionalTypeArgs TResult when<TResult extends Object?>(TResult Function( String id,  String? code,  String name,  PropertyType propertyType,  String district,  String city,  LandlordSummary landlord,  Occupancy occupancy,  String? coverDocumentId)  $default,) {final _that = this;
switch (_that) {
case _PropertySummary():
return $default(_that.id,_that.code,_that.name,_that.propertyType,_that.district,_that.city,_that.landlord,_that.occupancy,_that.coverDocumentId);case _:
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

@optionalTypeArgs TResult? whenOrNull<TResult extends Object?>(TResult? Function( String id,  String? code,  String name,  PropertyType propertyType,  String district,  String city,  LandlordSummary landlord,  Occupancy occupancy,  String? coverDocumentId)?  $default,) {final _that = this;
switch (_that) {
case _PropertySummary() when $default != null:
return $default(_that.id,_that.code,_that.name,_that.propertyType,_that.district,_that.city,_that.landlord,_that.occupancy,_that.coverDocumentId);case _:
  return null;

}
}

}

/// @nodoc
@JsonSerializable()

class _PropertySummary implements PropertySummary {
  const _PropertySummary({required this.id, this.code, required this.name, required this.propertyType, required this.district, required this.city, required this.landlord, required this.occupancy, this.coverDocumentId});
  factory _PropertySummary.fromJson(Map<String, dynamic> json) => _$PropertySummaryFromJson(json);

@override final  String id;
@override final  String? code;
@override final  String name;
@override final  PropertyType propertyType;
@override final  String district;
@override final  String city;
@override final  LandlordSummary landlord;
@override final  Occupancy occupancy;
@override final  String? coverDocumentId;

/// Create a copy of PropertySummary
/// with the given fields replaced by the non-null parameter values.
@override @JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
_$PropertySummaryCopyWith<_PropertySummary> get copyWith => __$PropertySummaryCopyWithImpl<_PropertySummary>(this, _$identity);

@override
Map<String, dynamic> toJson() {
  return _$PropertySummaryToJson(this, );
}

@override
bool operator ==(Object other) {
  return identical(this, other) || (other.runtimeType == runtimeType&&other is _PropertySummary&&(identical(other.id, id) || other.id == id)&&(identical(other.code, code) || other.code == code)&&(identical(other.name, name) || other.name == name)&&(identical(other.propertyType, propertyType) || other.propertyType == propertyType)&&(identical(other.district, district) || other.district == district)&&(identical(other.city, city) || other.city == city)&&(identical(other.landlord, landlord) || other.landlord == landlord)&&(identical(other.occupancy, occupancy) || other.occupancy == occupancy)&&(identical(other.coverDocumentId, coverDocumentId) || other.coverDocumentId == coverDocumentId));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode => Object.hash(runtimeType,id,code,name,propertyType,district,city,landlord,occupancy,coverDocumentId);

@override
String toString() {
  return 'PropertySummary(id: $id, code: $code, name: $name, propertyType: $propertyType, district: $district, city: $city, landlord: $landlord, occupancy: $occupancy, coverDocumentId: $coverDocumentId)';
}


}

/// @nodoc
abstract mixin class _$PropertySummaryCopyWith<$Res> implements $PropertySummaryCopyWith<$Res> {
  factory _$PropertySummaryCopyWith(_PropertySummary value, $Res Function(_PropertySummary) _then) = __$PropertySummaryCopyWithImpl;
@override @useResult
$Res call({
 String id, String? code, String name, PropertyType propertyType, String district, String city, LandlordSummary landlord, Occupancy occupancy, String? coverDocumentId
});


@override $LandlordSummaryCopyWith<$Res> get landlord;@override $OccupancyCopyWith<$Res> get occupancy;

}
/// @nodoc
class __$PropertySummaryCopyWithImpl<$Res>
    implements _$PropertySummaryCopyWith<$Res> {
  __$PropertySummaryCopyWithImpl(this._self, this._then);

  final _PropertySummary _self;
  final $Res Function(_PropertySummary) _then;

/// Create a copy of PropertySummary
/// with the given fields replaced by the non-null parameter values.
@override @pragma('vm:prefer-inline') $Res call({Object? id = null,Object? code = freezed,Object? name = null,Object? propertyType = null,Object? district = null,Object? city = null,Object? landlord = null,Object? occupancy = null,Object? coverDocumentId = freezed,}) {
  return _then(_PropertySummary(
id: null == id ? _self.id : id // ignore: cast_nullable_to_non_nullable
as String,code: freezed == code ? _self.code : code // ignore: cast_nullable_to_non_nullable
as String?,name: null == name ? _self.name : name // ignore: cast_nullable_to_non_nullable
as String,propertyType: null == propertyType ? _self.propertyType : propertyType // ignore: cast_nullable_to_non_nullable
as PropertyType,district: null == district ? _self.district : district // ignore: cast_nullable_to_non_nullable
as String,city: null == city ? _self.city : city // ignore: cast_nullable_to_non_nullable
as String,landlord: null == landlord ? _self.landlord : landlord // ignore: cast_nullable_to_non_nullable
as LandlordSummary,occupancy: null == occupancy ? _self.occupancy : occupancy // ignore: cast_nullable_to_non_nullable
as Occupancy,coverDocumentId: freezed == coverDocumentId ? _self.coverDocumentId : coverDocumentId // ignore: cast_nullable_to_non_nullable
as String?,
  ));
}

/// Create a copy of PropertySummary
/// with the given fields replaced by the non-null parameter values.
@override
@pragma('vm:prefer-inline')
$LandlordSummaryCopyWith<$Res> get landlord {
  
  return $LandlordSummaryCopyWith<$Res>(_self.landlord, (value) {
    return _then(_self.copyWith(landlord: value));
  });
}/// Create a copy of PropertySummary
/// with the given fields replaced by the non-null parameter values.
@override
@pragma('vm:prefer-inline')
$OccupancyCopyWith<$Res> get occupancy {
  
  return $OccupancyCopyWith<$Res>(_self.occupancy, (value) {
    return _then(_self.copyWith(occupancy: value));
  });
}
}

// dart format on
