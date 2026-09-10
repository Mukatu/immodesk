// GENERATED CODE - DO NOT MODIFY BY HAND
// coverage:ignore-file
// ignore_for_file: type=lint
// ignore_for_file: unused_element, deprecated_member_use, deprecated_member_use_from_same_package, use_function_type_syntax_for_parameters, unnecessary_const, avoid_init_to_null, invalid_override_different_default_values_named, prefer_expression_function_bodies, annotate_overrides, invalid_annotation_target, unnecessary_question_mark

part of 'tenant.dart';

// **************************************************************************
// FreezedGenerator
// **************************************************************************

// dart format off
T _$identity<T>(T value) => value;

/// @nodoc
mixin _$Tenant {

 String get id; String get displayName; String get primaryPhone; String? get secondaryPhone; String? get whatsappPhone; String? get email; String? get addressLine; String? get district; String? get city;
/// Create a copy of Tenant
/// with the given fields replaced by the non-null parameter values.
@JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
$TenantCopyWith<Tenant> get copyWith => _$TenantCopyWithImpl<Tenant>(this as Tenant, _$identity);

  /// Serializes this Tenant to a JSON map.
  Map<String, dynamic> toJson();


@override
bool operator ==(Object other) {
  return identical(this, other) || (other.runtimeType == runtimeType&&other is Tenant&&(identical(other.id, id) || other.id == id)&&(identical(other.displayName, displayName) || other.displayName == displayName)&&(identical(other.primaryPhone, primaryPhone) || other.primaryPhone == primaryPhone)&&(identical(other.secondaryPhone, secondaryPhone) || other.secondaryPhone == secondaryPhone)&&(identical(other.whatsappPhone, whatsappPhone) || other.whatsappPhone == whatsappPhone)&&(identical(other.email, email) || other.email == email)&&(identical(other.addressLine, addressLine) || other.addressLine == addressLine)&&(identical(other.district, district) || other.district == district)&&(identical(other.city, city) || other.city == city));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode => Object.hash(runtimeType,id,displayName,primaryPhone,secondaryPhone,whatsappPhone,email,addressLine,district,city);

@override
String toString() {
  return 'Tenant(id: $id, displayName: $displayName, primaryPhone: $primaryPhone, secondaryPhone: $secondaryPhone, whatsappPhone: $whatsappPhone, email: $email, addressLine: $addressLine, district: $district, city: $city)';
}


}

/// @nodoc
abstract mixin class $TenantCopyWith<$Res>  {
  factory $TenantCopyWith(Tenant value, $Res Function(Tenant) _then) = _$TenantCopyWithImpl;
@useResult
$Res call({
 String id, String displayName, String primaryPhone, String? secondaryPhone, String? whatsappPhone, String? email, String? addressLine, String? district, String? city
});




}
/// @nodoc
class _$TenantCopyWithImpl<$Res>
    implements $TenantCopyWith<$Res> {
  _$TenantCopyWithImpl(this._self, this._then);

  final Tenant _self;
  final $Res Function(Tenant) _then;

/// Create a copy of Tenant
/// with the given fields replaced by the non-null parameter values.
@pragma('vm:prefer-inline') @override $Res call({Object? id = null,Object? displayName = null,Object? primaryPhone = null,Object? secondaryPhone = freezed,Object? whatsappPhone = freezed,Object? email = freezed,Object? addressLine = freezed,Object? district = freezed,Object? city = freezed,}) {
  return _then(_self.copyWith(
id: null == id ? _self.id : id // ignore: cast_nullable_to_non_nullable
as String,displayName: null == displayName ? _self.displayName : displayName // ignore: cast_nullable_to_non_nullable
as String,primaryPhone: null == primaryPhone ? _self.primaryPhone : primaryPhone // ignore: cast_nullable_to_non_nullable
as String,secondaryPhone: freezed == secondaryPhone ? _self.secondaryPhone : secondaryPhone // ignore: cast_nullable_to_non_nullable
as String?,whatsappPhone: freezed == whatsappPhone ? _self.whatsappPhone : whatsappPhone // ignore: cast_nullable_to_non_nullable
as String?,email: freezed == email ? _self.email : email // ignore: cast_nullable_to_non_nullable
as String?,addressLine: freezed == addressLine ? _self.addressLine : addressLine // ignore: cast_nullable_to_non_nullable
as String?,district: freezed == district ? _self.district : district // ignore: cast_nullable_to_non_nullable
as String?,city: freezed == city ? _self.city : city // ignore: cast_nullable_to_non_nullable
as String?,
  ));
}

}


/// Adds pattern-matching-related methods to [Tenant].
extension TenantPatterns on Tenant {
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

@optionalTypeArgs TResult maybeMap<TResult extends Object?>(TResult Function( _Tenant value)?  $default,{required TResult orElse(),}){
final _that = this;
switch (_that) {
case _Tenant() when $default != null:
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

@optionalTypeArgs TResult map<TResult extends Object?>(TResult Function( _Tenant value)  $default,){
final _that = this;
switch (_that) {
case _Tenant():
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

@optionalTypeArgs TResult? mapOrNull<TResult extends Object?>(TResult? Function( _Tenant value)?  $default,){
final _that = this;
switch (_that) {
case _Tenant() when $default != null:
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

@optionalTypeArgs TResult maybeWhen<TResult extends Object?>(TResult Function( String id,  String displayName,  String primaryPhone,  String? secondaryPhone,  String? whatsappPhone,  String? email,  String? addressLine,  String? district,  String? city)?  $default,{required TResult orElse(),}) {final _that = this;
switch (_that) {
case _Tenant() when $default != null:
return $default(_that.id,_that.displayName,_that.primaryPhone,_that.secondaryPhone,_that.whatsappPhone,_that.email,_that.addressLine,_that.district,_that.city);case _:
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

@optionalTypeArgs TResult when<TResult extends Object?>(TResult Function( String id,  String displayName,  String primaryPhone,  String? secondaryPhone,  String? whatsappPhone,  String? email,  String? addressLine,  String? district,  String? city)  $default,) {final _that = this;
switch (_that) {
case _Tenant():
return $default(_that.id,_that.displayName,_that.primaryPhone,_that.secondaryPhone,_that.whatsappPhone,_that.email,_that.addressLine,_that.district,_that.city);case _:
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

@optionalTypeArgs TResult? whenOrNull<TResult extends Object?>(TResult? Function( String id,  String displayName,  String primaryPhone,  String? secondaryPhone,  String? whatsappPhone,  String? email,  String? addressLine,  String? district,  String? city)?  $default,) {final _that = this;
switch (_that) {
case _Tenant() when $default != null:
return $default(_that.id,_that.displayName,_that.primaryPhone,_that.secondaryPhone,_that.whatsappPhone,_that.email,_that.addressLine,_that.district,_that.city);case _:
  return null;

}
}

}

/// @nodoc
@JsonSerializable()

class _Tenant implements Tenant {
  const _Tenant({required this.id, required this.displayName, required this.primaryPhone, this.secondaryPhone, this.whatsappPhone, this.email, this.addressLine, this.district, this.city});
  factory _Tenant.fromJson(Map<String, dynamic> json) => _$TenantFromJson(json);

@override final  String id;
@override final  String displayName;
@override final  String primaryPhone;
@override final  String? secondaryPhone;
@override final  String? whatsappPhone;
@override final  String? email;
@override final  String? addressLine;
@override final  String? district;
@override final  String? city;

/// Create a copy of Tenant
/// with the given fields replaced by the non-null parameter values.
@override @JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
_$TenantCopyWith<_Tenant> get copyWith => __$TenantCopyWithImpl<_Tenant>(this, _$identity);

@override
Map<String, dynamic> toJson() {
  return _$TenantToJson(this, );
}

@override
bool operator ==(Object other) {
  return identical(this, other) || (other.runtimeType == runtimeType&&other is _Tenant&&(identical(other.id, id) || other.id == id)&&(identical(other.displayName, displayName) || other.displayName == displayName)&&(identical(other.primaryPhone, primaryPhone) || other.primaryPhone == primaryPhone)&&(identical(other.secondaryPhone, secondaryPhone) || other.secondaryPhone == secondaryPhone)&&(identical(other.whatsappPhone, whatsappPhone) || other.whatsappPhone == whatsappPhone)&&(identical(other.email, email) || other.email == email)&&(identical(other.addressLine, addressLine) || other.addressLine == addressLine)&&(identical(other.district, district) || other.district == district)&&(identical(other.city, city) || other.city == city));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode => Object.hash(runtimeType,id,displayName,primaryPhone,secondaryPhone,whatsappPhone,email,addressLine,district,city);

@override
String toString() {
  return 'Tenant(id: $id, displayName: $displayName, primaryPhone: $primaryPhone, secondaryPhone: $secondaryPhone, whatsappPhone: $whatsappPhone, email: $email, addressLine: $addressLine, district: $district, city: $city)';
}


}

/// @nodoc
abstract mixin class _$TenantCopyWith<$Res> implements $TenantCopyWith<$Res> {
  factory _$TenantCopyWith(_Tenant value, $Res Function(_Tenant) _then) = __$TenantCopyWithImpl;
@override @useResult
$Res call({
 String id, String displayName, String primaryPhone, String? secondaryPhone, String? whatsappPhone, String? email, String? addressLine, String? district, String? city
});




}
/// @nodoc
class __$TenantCopyWithImpl<$Res>
    implements _$TenantCopyWith<$Res> {
  __$TenantCopyWithImpl(this._self, this._then);

  final _Tenant _self;
  final $Res Function(_Tenant) _then;

/// Create a copy of Tenant
/// with the given fields replaced by the non-null parameter values.
@override @pragma('vm:prefer-inline') $Res call({Object? id = null,Object? displayName = null,Object? primaryPhone = null,Object? secondaryPhone = freezed,Object? whatsappPhone = freezed,Object? email = freezed,Object? addressLine = freezed,Object? district = freezed,Object? city = freezed,}) {
  return _then(_Tenant(
id: null == id ? _self.id : id // ignore: cast_nullable_to_non_nullable
as String,displayName: null == displayName ? _self.displayName : displayName // ignore: cast_nullable_to_non_nullable
as String,primaryPhone: null == primaryPhone ? _self.primaryPhone : primaryPhone // ignore: cast_nullable_to_non_nullable
as String,secondaryPhone: freezed == secondaryPhone ? _self.secondaryPhone : secondaryPhone // ignore: cast_nullable_to_non_nullable
as String?,whatsappPhone: freezed == whatsappPhone ? _self.whatsappPhone : whatsappPhone // ignore: cast_nullable_to_non_nullable
as String?,email: freezed == email ? _self.email : email // ignore: cast_nullable_to_non_nullable
as String?,addressLine: freezed == addressLine ? _self.addressLine : addressLine // ignore: cast_nullable_to_non_nullable
as String?,district: freezed == district ? _self.district : district // ignore: cast_nullable_to_non_nullable
as String?,city: freezed == city ? _self.city : city // ignore: cast_nullable_to_non_nullable
as String?,
  ));
}


}

// dart format on
