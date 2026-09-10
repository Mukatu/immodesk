// GENERATED CODE - DO NOT MODIFY BY HAND
// coverage:ignore-file
// ignore_for_file: type=lint
// ignore_for_file: unused_element, deprecated_member_use, deprecated_member_use_from_same_package, use_function_type_syntax_for_parameters, unnecessary_const, avoid_init_to_null, invalid_override_different_default_values_named, prefer_expression_function_bodies, annotate_overrides, invalid_annotation_target, unnecessary_question_mark

part of 'organization.dart';

// **************************************************************************
// FreezedGenerator
// **************************************************************************

// dart format off
T _$identity<T>(T value) => value;

/// @nodoc
mixin _$Organization {

 String get id; OrganizationType get type; String get legalName; String? get tradeName; String get slug; String get city; String? get district; String get contactPhone; String? get contactEmail; String? get logoUrl; OrganizationStatus get status; DateTime get createdAt;
/// Create a copy of Organization
/// with the given fields replaced by the non-null parameter values.
@JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
$OrganizationCopyWith<Organization> get copyWith => _$OrganizationCopyWithImpl<Organization>(this as Organization, _$identity);

  /// Serializes this Organization to a JSON map.
  Map<String, dynamic> toJson();


@override
bool operator ==(Object other) {
  return identical(this, other) || (other.runtimeType == runtimeType&&other is Organization&&(identical(other.id, id) || other.id == id)&&(identical(other.type, type) || other.type == type)&&(identical(other.legalName, legalName) || other.legalName == legalName)&&(identical(other.tradeName, tradeName) || other.tradeName == tradeName)&&(identical(other.slug, slug) || other.slug == slug)&&(identical(other.city, city) || other.city == city)&&(identical(other.district, district) || other.district == district)&&(identical(other.contactPhone, contactPhone) || other.contactPhone == contactPhone)&&(identical(other.contactEmail, contactEmail) || other.contactEmail == contactEmail)&&(identical(other.logoUrl, logoUrl) || other.logoUrl == logoUrl)&&(identical(other.status, status) || other.status == status)&&(identical(other.createdAt, createdAt) || other.createdAt == createdAt));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode => Object.hash(runtimeType,id,type,legalName,tradeName,slug,city,district,contactPhone,contactEmail,logoUrl,status,createdAt);

@override
String toString() {
  return 'Organization(id: $id, type: $type, legalName: $legalName, tradeName: $tradeName, slug: $slug, city: $city, district: $district, contactPhone: $contactPhone, contactEmail: $contactEmail, logoUrl: $logoUrl, status: $status, createdAt: $createdAt)';
}


}

/// @nodoc
abstract mixin class $OrganizationCopyWith<$Res>  {
  factory $OrganizationCopyWith(Organization value, $Res Function(Organization) _then) = _$OrganizationCopyWithImpl;
@useResult
$Res call({
 String id, OrganizationType type, String legalName, String? tradeName, String slug, String city, String? district, String contactPhone, String? contactEmail, String? logoUrl, OrganizationStatus status, DateTime createdAt
});




}
/// @nodoc
class _$OrganizationCopyWithImpl<$Res>
    implements $OrganizationCopyWith<$Res> {
  _$OrganizationCopyWithImpl(this._self, this._then);

  final Organization _self;
  final $Res Function(Organization) _then;

/// Create a copy of Organization
/// with the given fields replaced by the non-null parameter values.
@pragma('vm:prefer-inline') @override $Res call({Object? id = null,Object? type = null,Object? legalName = null,Object? tradeName = freezed,Object? slug = null,Object? city = null,Object? district = freezed,Object? contactPhone = null,Object? contactEmail = freezed,Object? logoUrl = freezed,Object? status = null,Object? createdAt = null,}) {
  return _then(_self.copyWith(
id: null == id ? _self.id : id // ignore: cast_nullable_to_non_nullable
as String,type: null == type ? _self.type : type // ignore: cast_nullable_to_non_nullable
as OrganizationType,legalName: null == legalName ? _self.legalName : legalName // ignore: cast_nullable_to_non_nullable
as String,tradeName: freezed == tradeName ? _self.tradeName : tradeName // ignore: cast_nullable_to_non_nullable
as String?,slug: null == slug ? _self.slug : slug // ignore: cast_nullable_to_non_nullable
as String,city: null == city ? _self.city : city // ignore: cast_nullable_to_non_nullable
as String,district: freezed == district ? _self.district : district // ignore: cast_nullable_to_non_nullable
as String?,contactPhone: null == contactPhone ? _self.contactPhone : contactPhone // ignore: cast_nullable_to_non_nullable
as String,contactEmail: freezed == contactEmail ? _self.contactEmail : contactEmail // ignore: cast_nullable_to_non_nullable
as String?,logoUrl: freezed == logoUrl ? _self.logoUrl : logoUrl // ignore: cast_nullable_to_non_nullable
as String?,status: null == status ? _self.status : status // ignore: cast_nullable_to_non_nullable
as OrganizationStatus,createdAt: null == createdAt ? _self.createdAt : createdAt // ignore: cast_nullable_to_non_nullable
as DateTime,
  ));
}

}


/// Adds pattern-matching-related methods to [Organization].
extension OrganizationPatterns on Organization {
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

@optionalTypeArgs TResult maybeMap<TResult extends Object?>(TResult Function( _Organization value)?  $default,{required TResult orElse(),}){
final _that = this;
switch (_that) {
case _Organization() when $default != null:
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

@optionalTypeArgs TResult map<TResult extends Object?>(TResult Function( _Organization value)  $default,){
final _that = this;
switch (_that) {
case _Organization():
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

@optionalTypeArgs TResult? mapOrNull<TResult extends Object?>(TResult? Function( _Organization value)?  $default,){
final _that = this;
switch (_that) {
case _Organization() when $default != null:
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

@optionalTypeArgs TResult maybeWhen<TResult extends Object?>(TResult Function( String id,  OrganizationType type,  String legalName,  String? tradeName,  String slug,  String city,  String? district,  String contactPhone,  String? contactEmail,  String? logoUrl,  OrganizationStatus status,  DateTime createdAt)?  $default,{required TResult orElse(),}) {final _that = this;
switch (_that) {
case _Organization() when $default != null:
return $default(_that.id,_that.type,_that.legalName,_that.tradeName,_that.slug,_that.city,_that.district,_that.contactPhone,_that.contactEmail,_that.logoUrl,_that.status,_that.createdAt);case _:
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

@optionalTypeArgs TResult when<TResult extends Object?>(TResult Function( String id,  OrganizationType type,  String legalName,  String? tradeName,  String slug,  String city,  String? district,  String contactPhone,  String? contactEmail,  String? logoUrl,  OrganizationStatus status,  DateTime createdAt)  $default,) {final _that = this;
switch (_that) {
case _Organization():
return $default(_that.id,_that.type,_that.legalName,_that.tradeName,_that.slug,_that.city,_that.district,_that.contactPhone,_that.contactEmail,_that.logoUrl,_that.status,_that.createdAt);case _:
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

@optionalTypeArgs TResult? whenOrNull<TResult extends Object?>(TResult? Function( String id,  OrganizationType type,  String legalName,  String? tradeName,  String slug,  String city,  String? district,  String contactPhone,  String? contactEmail,  String? logoUrl,  OrganizationStatus status,  DateTime createdAt)?  $default,) {final _that = this;
switch (_that) {
case _Organization() when $default != null:
return $default(_that.id,_that.type,_that.legalName,_that.tradeName,_that.slug,_that.city,_that.district,_that.contactPhone,_that.contactEmail,_that.logoUrl,_that.status,_that.createdAt);case _:
  return null;

}
}

}

/// @nodoc
@JsonSerializable()

class _Organization implements Organization {
  const _Organization({required this.id, required this.type, required this.legalName, this.tradeName, required this.slug, required this.city, this.district, required this.contactPhone, this.contactEmail, this.logoUrl, required this.status, required this.createdAt});
  factory _Organization.fromJson(Map<String, dynamic> json) => _$OrganizationFromJson(json);

@override final  String id;
@override final  OrganizationType type;
@override final  String legalName;
@override final  String? tradeName;
@override final  String slug;
@override final  String city;
@override final  String? district;
@override final  String contactPhone;
@override final  String? contactEmail;
@override final  String? logoUrl;
@override final  OrganizationStatus status;
@override final  DateTime createdAt;

/// Create a copy of Organization
/// with the given fields replaced by the non-null parameter values.
@override @JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
_$OrganizationCopyWith<_Organization> get copyWith => __$OrganizationCopyWithImpl<_Organization>(this, _$identity);

@override
Map<String, dynamic> toJson() {
  return _$OrganizationToJson(this, );
}

@override
bool operator ==(Object other) {
  return identical(this, other) || (other.runtimeType == runtimeType&&other is _Organization&&(identical(other.id, id) || other.id == id)&&(identical(other.type, type) || other.type == type)&&(identical(other.legalName, legalName) || other.legalName == legalName)&&(identical(other.tradeName, tradeName) || other.tradeName == tradeName)&&(identical(other.slug, slug) || other.slug == slug)&&(identical(other.city, city) || other.city == city)&&(identical(other.district, district) || other.district == district)&&(identical(other.contactPhone, contactPhone) || other.contactPhone == contactPhone)&&(identical(other.contactEmail, contactEmail) || other.contactEmail == contactEmail)&&(identical(other.logoUrl, logoUrl) || other.logoUrl == logoUrl)&&(identical(other.status, status) || other.status == status)&&(identical(other.createdAt, createdAt) || other.createdAt == createdAt));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode => Object.hash(runtimeType,id,type,legalName,tradeName,slug,city,district,contactPhone,contactEmail,logoUrl,status,createdAt);

@override
String toString() {
  return 'Organization(id: $id, type: $type, legalName: $legalName, tradeName: $tradeName, slug: $slug, city: $city, district: $district, contactPhone: $contactPhone, contactEmail: $contactEmail, logoUrl: $logoUrl, status: $status, createdAt: $createdAt)';
}


}

/// @nodoc
abstract mixin class _$OrganizationCopyWith<$Res> implements $OrganizationCopyWith<$Res> {
  factory _$OrganizationCopyWith(_Organization value, $Res Function(_Organization) _then) = __$OrganizationCopyWithImpl;
@override @useResult
$Res call({
 String id, OrganizationType type, String legalName, String? tradeName, String slug, String city, String? district, String contactPhone, String? contactEmail, String? logoUrl, OrganizationStatus status, DateTime createdAt
});




}
/// @nodoc
class __$OrganizationCopyWithImpl<$Res>
    implements _$OrganizationCopyWith<$Res> {
  __$OrganizationCopyWithImpl(this._self, this._then);

  final _Organization _self;
  final $Res Function(_Organization) _then;

/// Create a copy of Organization
/// with the given fields replaced by the non-null parameter values.
@override @pragma('vm:prefer-inline') $Res call({Object? id = null,Object? type = null,Object? legalName = null,Object? tradeName = freezed,Object? slug = null,Object? city = null,Object? district = freezed,Object? contactPhone = null,Object? contactEmail = freezed,Object? logoUrl = freezed,Object? status = null,Object? createdAt = null,}) {
  return _then(_Organization(
id: null == id ? _self.id : id // ignore: cast_nullable_to_non_nullable
as String,type: null == type ? _self.type : type // ignore: cast_nullable_to_non_nullable
as OrganizationType,legalName: null == legalName ? _self.legalName : legalName // ignore: cast_nullable_to_non_nullable
as String,tradeName: freezed == tradeName ? _self.tradeName : tradeName // ignore: cast_nullable_to_non_nullable
as String?,slug: null == slug ? _self.slug : slug // ignore: cast_nullable_to_non_nullable
as String,city: null == city ? _self.city : city // ignore: cast_nullable_to_non_nullable
as String,district: freezed == district ? _self.district : district // ignore: cast_nullable_to_non_nullable
as String?,contactPhone: null == contactPhone ? _self.contactPhone : contactPhone // ignore: cast_nullable_to_non_nullable
as String,contactEmail: freezed == contactEmail ? _self.contactEmail : contactEmail // ignore: cast_nullable_to_non_nullable
as String?,logoUrl: freezed == logoUrl ? _self.logoUrl : logoUrl // ignore: cast_nullable_to_non_nullable
as String?,status: null == status ? _self.status : status // ignore: cast_nullable_to_non_nullable
as OrganizationStatus,createdAt: null == createdAt ? _self.createdAt : createdAt // ignore: cast_nullable_to_non_nullable
as DateTime,
  ));
}


}

// dart format on
