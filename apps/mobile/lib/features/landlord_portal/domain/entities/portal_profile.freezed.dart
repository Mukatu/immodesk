// GENERATED CODE - DO NOT MODIFY BY HAND
// coverage:ignore-file
// ignore_for_file: type=lint
// ignore_for_file: unused_element, deprecated_member_use, deprecated_member_use_from_same_package, use_function_type_syntax_for_parameters, unnecessary_const, avoid_init_to_null, invalid_override_different_default_values_named, prefer_expression_function_bodies, annotate_overrides, invalid_annotation_target, unnecessary_question_mark

part of 'portal_profile.dart';

// **************************************************************************
// FreezedGenerator
// **************************************************************************

// dart format off
T _$identity<T>(T value) => value;

/// @nodoc
mixin _$PortalOrganizationRef {

 String get id; String get name;
/// Create a copy of PortalOrganizationRef
/// with the given fields replaced by the non-null parameter values.
@JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
$PortalOrganizationRefCopyWith<PortalOrganizationRef> get copyWith => _$PortalOrganizationRefCopyWithImpl<PortalOrganizationRef>(this as PortalOrganizationRef, _$identity);

  /// Serializes this PortalOrganizationRef to a JSON map.
  Map<String, dynamic> toJson();


@override
bool operator ==(Object other) {
  return identical(this, other) || (other.runtimeType == runtimeType&&other is PortalOrganizationRef&&(identical(other.id, id) || other.id == id)&&(identical(other.name, name) || other.name == name));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode => Object.hash(runtimeType,id,name);

@override
String toString() {
  return 'PortalOrganizationRef(id: $id, name: $name)';
}


}

/// @nodoc
abstract mixin class $PortalOrganizationRefCopyWith<$Res>  {
  factory $PortalOrganizationRefCopyWith(PortalOrganizationRef value, $Res Function(PortalOrganizationRef) _then) = _$PortalOrganizationRefCopyWithImpl;
@useResult
$Res call({
 String id, String name
});




}
/// @nodoc
class _$PortalOrganizationRefCopyWithImpl<$Res>
    implements $PortalOrganizationRefCopyWith<$Res> {
  _$PortalOrganizationRefCopyWithImpl(this._self, this._then);

  final PortalOrganizationRef _self;
  final $Res Function(PortalOrganizationRef) _then;

/// Create a copy of PortalOrganizationRef
/// with the given fields replaced by the non-null parameter values.
@pragma('vm:prefer-inline') @override $Res call({Object? id = null,Object? name = null,}) {
  return _then(_self.copyWith(
id: null == id ? _self.id : id // ignore: cast_nullable_to_non_nullable
as String,name: null == name ? _self.name : name // ignore: cast_nullable_to_non_nullable
as String,
  ));
}

}


/// Adds pattern-matching-related methods to [PortalOrganizationRef].
extension PortalOrganizationRefPatterns on PortalOrganizationRef {
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

@optionalTypeArgs TResult maybeMap<TResult extends Object?>(TResult Function( _PortalOrganizationRef value)?  $default,{required TResult orElse(),}){
final _that = this;
switch (_that) {
case _PortalOrganizationRef() when $default != null:
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

@optionalTypeArgs TResult map<TResult extends Object?>(TResult Function( _PortalOrganizationRef value)  $default,){
final _that = this;
switch (_that) {
case _PortalOrganizationRef():
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

@optionalTypeArgs TResult? mapOrNull<TResult extends Object?>(TResult? Function( _PortalOrganizationRef value)?  $default,){
final _that = this;
switch (_that) {
case _PortalOrganizationRef() when $default != null:
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

@optionalTypeArgs TResult maybeWhen<TResult extends Object?>(TResult Function( String id,  String name)?  $default,{required TResult orElse(),}) {final _that = this;
switch (_that) {
case _PortalOrganizationRef() when $default != null:
return $default(_that.id,_that.name);case _:
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

@optionalTypeArgs TResult when<TResult extends Object?>(TResult Function( String id,  String name)  $default,) {final _that = this;
switch (_that) {
case _PortalOrganizationRef():
return $default(_that.id,_that.name);case _:
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

@optionalTypeArgs TResult? whenOrNull<TResult extends Object?>(TResult? Function( String id,  String name)?  $default,) {final _that = this;
switch (_that) {
case _PortalOrganizationRef() when $default != null:
return $default(_that.id,_that.name);case _:
  return null;

}
}

}

/// @nodoc
@JsonSerializable()

class _PortalOrganizationRef implements PortalOrganizationRef {
  const _PortalOrganizationRef({required this.id, required this.name});
  factory _PortalOrganizationRef.fromJson(Map<String, dynamic> json) => _$PortalOrganizationRefFromJson(json);

@override final  String id;
@override final  String name;

/// Create a copy of PortalOrganizationRef
/// with the given fields replaced by the non-null parameter values.
@override @JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
_$PortalOrganizationRefCopyWith<_PortalOrganizationRef> get copyWith => __$PortalOrganizationRefCopyWithImpl<_PortalOrganizationRef>(this, _$identity);

@override
Map<String, dynamic> toJson() {
  return _$PortalOrganizationRefToJson(this, );
}

@override
bool operator ==(Object other) {
  return identical(this, other) || (other.runtimeType == runtimeType&&other is _PortalOrganizationRef&&(identical(other.id, id) || other.id == id)&&(identical(other.name, name) || other.name == name));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode => Object.hash(runtimeType,id,name);

@override
String toString() {
  return 'PortalOrganizationRef(id: $id, name: $name)';
}


}

/// @nodoc
abstract mixin class _$PortalOrganizationRefCopyWith<$Res> implements $PortalOrganizationRefCopyWith<$Res> {
  factory _$PortalOrganizationRefCopyWith(_PortalOrganizationRef value, $Res Function(_PortalOrganizationRef) _then) = __$PortalOrganizationRefCopyWithImpl;
@override @useResult
$Res call({
 String id, String name
});




}
/// @nodoc
class __$PortalOrganizationRefCopyWithImpl<$Res>
    implements _$PortalOrganizationRefCopyWith<$Res> {
  __$PortalOrganizationRefCopyWithImpl(this._self, this._then);

  final _PortalOrganizationRef _self;
  final $Res Function(_PortalOrganizationRef) _then;

/// Create a copy of PortalOrganizationRef
/// with the given fields replaced by the non-null parameter values.
@override @pragma('vm:prefer-inline') $Res call({Object? id = null,Object? name = null,}) {
  return _then(_PortalOrganizationRef(
id: null == id ? _self.id : id // ignore: cast_nullable_to_non_nullable
as String,name: null == name ? _self.name : name // ignore: cast_nullable_to_non_nullable
as String,
  ));
}


}


/// @nodoc
mixin _$PortalLandlord {

 String get id; String get displayName; String get primaryPhone; String? get email; String get city; String get countryCode; PaymentMethod get payoutMethod;
/// Create a copy of PortalLandlord
/// with the given fields replaced by the non-null parameter values.
@JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
$PortalLandlordCopyWith<PortalLandlord> get copyWith => _$PortalLandlordCopyWithImpl<PortalLandlord>(this as PortalLandlord, _$identity);

  /// Serializes this PortalLandlord to a JSON map.
  Map<String, dynamic> toJson();


@override
bool operator ==(Object other) {
  return identical(this, other) || (other.runtimeType == runtimeType&&other is PortalLandlord&&(identical(other.id, id) || other.id == id)&&(identical(other.displayName, displayName) || other.displayName == displayName)&&(identical(other.primaryPhone, primaryPhone) || other.primaryPhone == primaryPhone)&&(identical(other.email, email) || other.email == email)&&(identical(other.city, city) || other.city == city)&&(identical(other.countryCode, countryCode) || other.countryCode == countryCode)&&(identical(other.payoutMethod, payoutMethod) || other.payoutMethod == payoutMethod));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode => Object.hash(runtimeType,id,displayName,primaryPhone,email,city,countryCode,payoutMethod);

@override
String toString() {
  return 'PortalLandlord(id: $id, displayName: $displayName, primaryPhone: $primaryPhone, email: $email, city: $city, countryCode: $countryCode, payoutMethod: $payoutMethod)';
}


}

/// @nodoc
abstract mixin class $PortalLandlordCopyWith<$Res>  {
  factory $PortalLandlordCopyWith(PortalLandlord value, $Res Function(PortalLandlord) _then) = _$PortalLandlordCopyWithImpl;
@useResult
$Res call({
 String id, String displayName, String primaryPhone, String? email, String city, String countryCode, PaymentMethod payoutMethod
});




}
/// @nodoc
class _$PortalLandlordCopyWithImpl<$Res>
    implements $PortalLandlordCopyWith<$Res> {
  _$PortalLandlordCopyWithImpl(this._self, this._then);

  final PortalLandlord _self;
  final $Res Function(PortalLandlord) _then;

/// Create a copy of PortalLandlord
/// with the given fields replaced by the non-null parameter values.
@pragma('vm:prefer-inline') @override $Res call({Object? id = null,Object? displayName = null,Object? primaryPhone = null,Object? email = freezed,Object? city = null,Object? countryCode = null,Object? payoutMethod = null,}) {
  return _then(_self.copyWith(
id: null == id ? _self.id : id // ignore: cast_nullable_to_non_nullable
as String,displayName: null == displayName ? _self.displayName : displayName // ignore: cast_nullable_to_non_nullable
as String,primaryPhone: null == primaryPhone ? _self.primaryPhone : primaryPhone // ignore: cast_nullable_to_non_nullable
as String,email: freezed == email ? _self.email : email // ignore: cast_nullable_to_non_nullable
as String?,city: null == city ? _self.city : city // ignore: cast_nullable_to_non_nullable
as String,countryCode: null == countryCode ? _self.countryCode : countryCode // ignore: cast_nullable_to_non_nullable
as String,payoutMethod: null == payoutMethod ? _self.payoutMethod : payoutMethod // ignore: cast_nullable_to_non_nullable
as PaymentMethod,
  ));
}

}


/// Adds pattern-matching-related methods to [PortalLandlord].
extension PortalLandlordPatterns on PortalLandlord {
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

@optionalTypeArgs TResult maybeMap<TResult extends Object?>(TResult Function( _PortalLandlord value)?  $default,{required TResult orElse(),}){
final _that = this;
switch (_that) {
case _PortalLandlord() when $default != null:
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

@optionalTypeArgs TResult map<TResult extends Object?>(TResult Function( _PortalLandlord value)  $default,){
final _that = this;
switch (_that) {
case _PortalLandlord():
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

@optionalTypeArgs TResult? mapOrNull<TResult extends Object?>(TResult? Function( _PortalLandlord value)?  $default,){
final _that = this;
switch (_that) {
case _PortalLandlord() when $default != null:
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

@optionalTypeArgs TResult maybeWhen<TResult extends Object?>(TResult Function( String id,  String displayName,  String primaryPhone,  String? email,  String city,  String countryCode,  PaymentMethod payoutMethod)?  $default,{required TResult orElse(),}) {final _that = this;
switch (_that) {
case _PortalLandlord() when $default != null:
return $default(_that.id,_that.displayName,_that.primaryPhone,_that.email,_that.city,_that.countryCode,_that.payoutMethod);case _:
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

@optionalTypeArgs TResult when<TResult extends Object?>(TResult Function( String id,  String displayName,  String primaryPhone,  String? email,  String city,  String countryCode,  PaymentMethod payoutMethod)  $default,) {final _that = this;
switch (_that) {
case _PortalLandlord():
return $default(_that.id,_that.displayName,_that.primaryPhone,_that.email,_that.city,_that.countryCode,_that.payoutMethod);case _:
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

@optionalTypeArgs TResult? whenOrNull<TResult extends Object?>(TResult? Function( String id,  String displayName,  String primaryPhone,  String? email,  String city,  String countryCode,  PaymentMethod payoutMethod)?  $default,) {final _that = this;
switch (_that) {
case _PortalLandlord() when $default != null:
return $default(_that.id,_that.displayName,_that.primaryPhone,_that.email,_that.city,_that.countryCode,_that.payoutMethod);case _:
  return null;

}
}

}

/// @nodoc
@JsonSerializable()

class _PortalLandlord implements PortalLandlord {
  const _PortalLandlord({required this.id, required this.displayName, required this.primaryPhone, this.email, required this.city, required this.countryCode, required this.payoutMethod});
  factory _PortalLandlord.fromJson(Map<String, dynamic> json) => _$PortalLandlordFromJson(json);

@override final  String id;
@override final  String displayName;
@override final  String primaryPhone;
@override final  String? email;
@override final  String city;
@override final  String countryCode;
@override final  PaymentMethod payoutMethod;

/// Create a copy of PortalLandlord
/// with the given fields replaced by the non-null parameter values.
@override @JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
_$PortalLandlordCopyWith<_PortalLandlord> get copyWith => __$PortalLandlordCopyWithImpl<_PortalLandlord>(this, _$identity);

@override
Map<String, dynamic> toJson() {
  return _$PortalLandlordToJson(this, );
}

@override
bool operator ==(Object other) {
  return identical(this, other) || (other.runtimeType == runtimeType&&other is _PortalLandlord&&(identical(other.id, id) || other.id == id)&&(identical(other.displayName, displayName) || other.displayName == displayName)&&(identical(other.primaryPhone, primaryPhone) || other.primaryPhone == primaryPhone)&&(identical(other.email, email) || other.email == email)&&(identical(other.city, city) || other.city == city)&&(identical(other.countryCode, countryCode) || other.countryCode == countryCode)&&(identical(other.payoutMethod, payoutMethod) || other.payoutMethod == payoutMethod));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode => Object.hash(runtimeType,id,displayName,primaryPhone,email,city,countryCode,payoutMethod);

@override
String toString() {
  return 'PortalLandlord(id: $id, displayName: $displayName, primaryPhone: $primaryPhone, email: $email, city: $city, countryCode: $countryCode, payoutMethod: $payoutMethod)';
}


}

/// @nodoc
abstract mixin class _$PortalLandlordCopyWith<$Res> implements $PortalLandlordCopyWith<$Res> {
  factory _$PortalLandlordCopyWith(_PortalLandlord value, $Res Function(_PortalLandlord) _then) = __$PortalLandlordCopyWithImpl;
@override @useResult
$Res call({
 String id, String displayName, String primaryPhone, String? email, String city, String countryCode, PaymentMethod payoutMethod
});




}
/// @nodoc
class __$PortalLandlordCopyWithImpl<$Res>
    implements _$PortalLandlordCopyWith<$Res> {
  __$PortalLandlordCopyWithImpl(this._self, this._then);

  final _PortalLandlord _self;
  final $Res Function(_PortalLandlord) _then;

/// Create a copy of PortalLandlord
/// with the given fields replaced by the non-null parameter values.
@override @pragma('vm:prefer-inline') $Res call({Object? id = null,Object? displayName = null,Object? primaryPhone = null,Object? email = freezed,Object? city = null,Object? countryCode = null,Object? payoutMethod = null,}) {
  return _then(_PortalLandlord(
id: null == id ? _self.id : id // ignore: cast_nullable_to_non_nullable
as String,displayName: null == displayName ? _self.displayName : displayName // ignore: cast_nullable_to_non_nullable
as String,primaryPhone: null == primaryPhone ? _self.primaryPhone : primaryPhone // ignore: cast_nullable_to_non_nullable
as String,email: freezed == email ? _self.email : email // ignore: cast_nullable_to_non_nullable
as String?,city: null == city ? _self.city : city // ignore: cast_nullable_to_non_nullable
as String,countryCode: null == countryCode ? _self.countryCode : countryCode // ignore: cast_nullable_to_non_nullable
as String,payoutMethod: null == payoutMethod ? _self.payoutMethod : payoutMethod // ignore: cast_nullable_to_non_nullable
as PaymentMethod,
  ));
}


}


/// @nodoc
mixin _$PortalProfile {

 PortalLandlord get landlord; List<PortalOrganizationRef> get organizations;
/// Create a copy of PortalProfile
/// with the given fields replaced by the non-null parameter values.
@JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
$PortalProfileCopyWith<PortalProfile> get copyWith => _$PortalProfileCopyWithImpl<PortalProfile>(this as PortalProfile, _$identity);

  /// Serializes this PortalProfile to a JSON map.
  Map<String, dynamic> toJson();


@override
bool operator ==(Object other) {
  return identical(this, other) || (other.runtimeType == runtimeType&&other is PortalProfile&&(identical(other.landlord, landlord) || other.landlord == landlord)&&const DeepCollectionEquality().equals(other.organizations, organizations));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode => Object.hash(runtimeType,landlord,const DeepCollectionEquality().hash(organizations));

@override
String toString() {
  return 'PortalProfile(landlord: $landlord, organizations: $organizations)';
}


}

/// @nodoc
abstract mixin class $PortalProfileCopyWith<$Res>  {
  factory $PortalProfileCopyWith(PortalProfile value, $Res Function(PortalProfile) _then) = _$PortalProfileCopyWithImpl;
@useResult
$Res call({
 PortalLandlord landlord, List<PortalOrganizationRef> organizations
});


$PortalLandlordCopyWith<$Res> get landlord;

}
/// @nodoc
class _$PortalProfileCopyWithImpl<$Res>
    implements $PortalProfileCopyWith<$Res> {
  _$PortalProfileCopyWithImpl(this._self, this._then);

  final PortalProfile _self;
  final $Res Function(PortalProfile) _then;

/// Create a copy of PortalProfile
/// with the given fields replaced by the non-null parameter values.
@pragma('vm:prefer-inline') @override $Res call({Object? landlord = null,Object? organizations = null,}) {
  return _then(_self.copyWith(
landlord: null == landlord ? _self.landlord : landlord // ignore: cast_nullable_to_non_nullable
as PortalLandlord,organizations: null == organizations ? _self.organizations : organizations // ignore: cast_nullable_to_non_nullable
as List<PortalOrganizationRef>,
  ));
}
/// Create a copy of PortalProfile
/// with the given fields replaced by the non-null parameter values.
@override
@pragma('vm:prefer-inline')
$PortalLandlordCopyWith<$Res> get landlord {
  
  return $PortalLandlordCopyWith<$Res>(_self.landlord, (value) {
    return _then(_self.copyWith(landlord: value));
  });
}
}


/// Adds pattern-matching-related methods to [PortalProfile].
extension PortalProfilePatterns on PortalProfile {
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

@optionalTypeArgs TResult maybeMap<TResult extends Object?>(TResult Function( _PortalProfile value)?  $default,{required TResult orElse(),}){
final _that = this;
switch (_that) {
case _PortalProfile() when $default != null:
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

@optionalTypeArgs TResult map<TResult extends Object?>(TResult Function( _PortalProfile value)  $default,){
final _that = this;
switch (_that) {
case _PortalProfile():
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

@optionalTypeArgs TResult? mapOrNull<TResult extends Object?>(TResult? Function( _PortalProfile value)?  $default,){
final _that = this;
switch (_that) {
case _PortalProfile() when $default != null:
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

@optionalTypeArgs TResult maybeWhen<TResult extends Object?>(TResult Function( PortalLandlord landlord,  List<PortalOrganizationRef> organizations)?  $default,{required TResult orElse(),}) {final _that = this;
switch (_that) {
case _PortalProfile() when $default != null:
return $default(_that.landlord,_that.organizations);case _:
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

@optionalTypeArgs TResult when<TResult extends Object?>(TResult Function( PortalLandlord landlord,  List<PortalOrganizationRef> organizations)  $default,) {final _that = this;
switch (_that) {
case _PortalProfile():
return $default(_that.landlord,_that.organizations);case _:
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

@optionalTypeArgs TResult? whenOrNull<TResult extends Object?>(TResult? Function( PortalLandlord landlord,  List<PortalOrganizationRef> organizations)?  $default,) {final _that = this;
switch (_that) {
case _PortalProfile() when $default != null:
return $default(_that.landlord,_that.organizations);case _:
  return null;

}
}

}

/// @nodoc
@JsonSerializable()

class _PortalProfile implements PortalProfile {
  const _PortalProfile({required this.landlord, required final  List<PortalOrganizationRef> organizations}): _organizations = organizations;
  factory _PortalProfile.fromJson(Map<String, dynamic> json) => _$PortalProfileFromJson(json);

@override final  PortalLandlord landlord;
 final  List<PortalOrganizationRef> _organizations;
@override List<PortalOrganizationRef> get organizations {
  if (_organizations is EqualUnmodifiableListView) return _organizations;
  // ignore: implicit_dynamic_type
  return EqualUnmodifiableListView(_organizations);
}


/// Create a copy of PortalProfile
/// with the given fields replaced by the non-null parameter values.
@override @JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
_$PortalProfileCopyWith<_PortalProfile> get copyWith => __$PortalProfileCopyWithImpl<_PortalProfile>(this, _$identity);

@override
Map<String, dynamic> toJson() {
  return _$PortalProfileToJson(this, );
}

@override
bool operator ==(Object other) {
  return identical(this, other) || (other.runtimeType == runtimeType&&other is _PortalProfile&&(identical(other.landlord, landlord) || other.landlord == landlord)&&const DeepCollectionEquality().equals(other._organizations, _organizations));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode => Object.hash(runtimeType,landlord,const DeepCollectionEquality().hash(_organizations));

@override
String toString() {
  return 'PortalProfile(landlord: $landlord, organizations: $organizations)';
}


}

/// @nodoc
abstract mixin class _$PortalProfileCopyWith<$Res> implements $PortalProfileCopyWith<$Res> {
  factory _$PortalProfileCopyWith(_PortalProfile value, $Res Function(_PortalProfile) _then) = __$PortalProfileCopyWithImpl;
@override @useResult
$Res call({
 PortalLandlord landlord, List<PortalOrganizationRef> organizations
});


@override $PortalLandlordCopyWith<$Res> get landlord;

}
/// @nodoc
class __$PortalProfileCopyWithImpl<$Res>
    implements _$PortalProfileCopyWith<$Res> {
  __$PortalProfileCopyWithImpl(this._self, this._then);

  final _PortalProfile _self;
  final $Res Function(_PortalProfile) _then;

/// Create a copy of PortalProfile
/// with the given fields replaced by the non-null parameter values.
@override @pragma('vm:prefer-inline') $Res call({Object? landlord = null,Object? organizations = null,}) {
  return _then(_PortalProfile(
landlord: null == landlord ? _self.landlord : landlord // ignore: cast_nullable_to_non_nullable
as PortalLandlord,organizations: null == organizations ? _self._organizations : organizations // ignore: cast_nullable_to_non_nullable
as List<PortalOrganizationRef>,
  ));
}

/// Create a copy of PortalProfile
/// with the given fields replaced by the non-null parameter values.
@override
@pragma('vm:prefer-inline')
$PortalLandlordCopyWith<$Res> get landlord {
  
  return $PortalLandlordCopyWith<$Res>(_self.landlord, (value) {
    return _then(_self.copyWith(landlord: value));
  });
}
}

// dart format on
