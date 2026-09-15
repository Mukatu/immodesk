// GENERATED CODE - DO NOT MODIFY BY HAND
// coverage:ignore-file
// ignore_for_file: type=lint
// ignore_for_file: unused_element, deprecated_member_use, deprecated_member_use_from_same_package, use_function_type_syntax_for_parameters, unnecessary_const, avoid_init_to_null, invalid_override_different_default_values_named, prefer_expression_function_bodies, annotate_overrides, invalid_annotation_target, unnecessary_question_mark

part of 'independent_manager_onboarding_result.dart';

// **************************************************************************
// FreezedGenerator
// **************************************************************************

// dart format off
T _$identity<T>(T value) => value;

/// @nodoc
mixin _$OnboardingOrganizationRef {

 String get id; String get legalName;
/// Create a copy of OnboardingOrganizationRef
/// with the given fields replaced by the non-null parameter values.
@JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
$OnboardingOrganizationRefCopyWith<OnboardingOrganizationRef> get copyWith => _$OnboardingOrganizationRefCopyWithImpl<OnboardingOrganizationRef>(this as OnboardingOrganizationRef, _$identity);

  /// Serializes this OnboardingOrganizationRef to a JSON map.
  Map<String, dynamic> toJson();


@override
bool operator ==(Object other) {
  return identical(this, other) || (other.runtimeType == runtimeType&&other is OnboardingOrganizationRef&&(identical(other.id, id) || other.id == id)&&(identical(other.legalName, legalName) || other.legalName == legalName));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode => Object.hash(runtimeType,id,legalName);

@override
String toString() {
  return 'OnboardingOrganizationRef(id: $id, legalName: $legalName)';
}


}

/// @nodoc
abstract mixin class $OnboardingOrganizationRefCopyWith<$Res>  {
  factory $OnboardingOrganizationRefCopyWith(OnboardingOrganizationRef value, $Res Function(OnboardingOrganizationRef) _then) = _$OnboardingOrganizationRefCopyWithImpl;
@useResult
$Res call({
 String id, String legalName
});




}
/// @nodoc
class _$OnboardingOrganizationRefCopyWithImpl<$Res>
    implements $OnboardingOrganizationRefCopyWith<$Res> {
  _$OnboardingOrganizationRefCopyWithImpl(this._self, this._then);

  final OnboardingOrganizationRef _self;
  final $Res Function(OnboardingOrganizationRef) _then;

/// Create a copy of OnboardingOrganizationRef
/// with the given fields replaced by the non-null parameter values.
@pragma('vm:prefer-inline') @override $Res call({Object? id = null,Object? legalName = null,}) {
  return _then(_self.copyWith(
id: null == id ? _self.id : id // ignore: cast_nullable_to_non_nullable
as String,legalName: null == legalName ? _self.legalName : legalName // ignore: cast_nullable_to_non_nullable
as String,
  ));
}

}


/// Adds pattern-matching-related methods to [OnboardingOrganizationRef].
extension OnboardingOrganizationRefPatterns on OnboardingOrganizationRef {
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

@optionalTypeArgs TResult maybeMap<TResult extends Object?>(TResult Function( _OnboardingOrganizationRef value)?  $default,{required TResult orElse(),}){
final _that = this;
switch (_that) {
case _OnboardingOrganizationRef() when $default != null:
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

@optionalTypeArgs TResult map<TResult extends Object?>(TResult Function( _OnboardingOrganizationRef value)  $default,){
final _that = this;
switch (_that) {
case _OnboardingOrganizationRef():
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

@optionalTypeArgs TResult? mapOrNull<TResult extends Object?>(TResult? Function( _OnboardingOrganizationRef value)?  $default,){
final _that = this;
switch (_that) {
case _OnboardingOrganizationRef() when $default != null:
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

@optionalTypeArgs TResult maybeWhen<TResult extends Object?>(TResult Function( String id,  String legalName)?  $default,{required TResult orElse(),}) {final _that = this;
switch (_that) {
case _OnboardingOrganizationRef() when $default != null:
return $default(_that.id,_that.legalName);case _:
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

@optionalTypeArgs TResult when<TResult extends Object?>(TResult Function( String id,  String legalName)  $default,) {final _that = this;
switch (_that) {
case _OnboardingOrganizationRef():
return $default(_that.id,_that.legalName);case _:
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

@optionalTypeArgs TResult? whenOrNull<TResult extends Object?>(TResult? Function( String id,  String legalName)?  $default,) {final _that = this;
switch (_that) {
case _OnboardingOrganizationRef() when $default != null:
return $default(_that.id,_that.legalName);case _:
  return null;

}
}

}

/// @nodoc
@JsonSerializable()

class _OnboardingOrganizationRef implements OnboardingOrganizationRef {
  const _OnboardingOrganizationRef({required this.id, required this.legalName});
  factory _OnboardingOrganizationRef.fromJson(Map<String, dynamic> json) => _$OnboardingOrganizationRefFromJson(json);

@override final  String id;
@override final  String legalName;

/// Create a copy of OnboardingOrganizationRef
/// with the given fields replaced by the non-null parameter values.
@override @JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
_$OnboardingOrganizationRefCopyWith<_OnboardingOrganizationRef> get copyWith => __$OnboardingOrganizationRefCopyWithImpl<_OnboardingOrganizationRef>(this, _$identity);

@override
Map<String, dynamic> toJson() {
  return _$OnboardingOrganizationRefToJson(this, );
}

@override
bool operator ==(Object other) {
  return identical(this, other) || (other.runtimeType == runtimeType&&other is _OnboardingOrganizationRef&&(identical(other.id, id) || other.id == id)&&(identical(other.legalName, legalName) || other.legalName == legalName));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode => Object.hash(runtimeType,id,legalName);

@override
String toString() {
  return 'OnboardingOrganizationRef(id: $id, legalName: $legalName)';
}


}

/// @nodoc
abstract mixin class _$OnboardingOrganizationRefCopyWith<$Res> implements $OnboardingOrganizationRefCopyWith<$Res> {
  factory _$OnboardingOrganizationRefCopyWith(_OnboardingOrganizationRef value, $Res Function(_OnboardingOrganizationRef) _then) = __$OnboardingOrganizationRefCopyWithImpl;
@override @useResult
$Res call({
 String id, String legalName
});




}
/// @nodoc
class __$OnboardingOrganizationRefCopyWithImpl<$Res>
    implements _$OnboardingOrganizationRefCopyWith<$Res> {
  __$OnboardingOrganizationRefCopyWithImpl(this._self, this._then);

  final _OnboardingOrganizationRef _self;
  final $Res Function(_OnboardingOrganizationRef) _then;

/// Create a copy of OnboardingOrganizationRef
/// with the given fields replaced by the non-null parameter values.
@override @pragma('vm:prefer-inline') $Res call({Object? id = null,Object? legalName = null,}) {
  return _then(_OnboardingOrganizationRef(
id: null == id ? _self.id : id // ignore: cast_nullable_to_non_nullable
as String,legalName: null == legalName ? _self.legalName : legalName // ignore: cast_nullable_to_non_nullable
as String,
  ));
}


}


/// @nodoc
mixin _$OnboardingLandlordRef {

 String get id; String get displayName;
/// Create a copy of OnboardingLandlordRef
/// with the given fields replaced by the non-null parameter values.
@JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
$OnboardingLandlordRefCopyWith<OnboardingLandlordRef> get copyWith => _$OnboardingLandlordRefCopyWithImpl<OnboardingLandlordRef>(this as OnboardingLandlordRef, _$identity);

  /// Serializes this OnboardingLandlordRef to a JSON map.
  Map<String, dynamic> toJson();


@override
bool operator ==(Object other) {
  return identical(this, other) || (other.runtimeType == runtimeType&&other is OnboardingLandlordRef&&(identical(other.id, id) || other.id == id)&&(identical(other.displayName, displayName) || other.displayName == displayName));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode => Object.hash(runtimeType,id,displayName);

@override
String toString() {
  return 'OnboardingLandlordRef(id: $id, displayName: $displayName)';
}


}

/// @nodoc
abstract mixin class $OnboardingLandlordRefCopyWith<$Res>  {
  factory $OnboardingLandlordRefCopyWith(OnboardingLandlordRef value, $Res Function(OnboardingLandlordRef) _then) = _$OnboardingLandlordRefCopyWithImpl;
@useResult
$Res call({
 String id, String displayName
});




}
/// @nodoc
class _$OnboardingLandlordRefCopyWithImpl<$Res>
    implements $OnboardingLandlordRefCopyWith<$Res> {
  _$OnboardingLandlordRefCopyWithImpl(this._self, this._then);

  final OnboardingLandlordRef _self;
  final $Res Function(OnboardingLandlordRef) _then;

/// Create a copy of OnboardingLandlordRef
/// with the given fields replaced by the non-null parameter values.
@pragma('vm:prefer-inline') @override $Res call({Object? id = null,Object? displayName = null,}) {
  return _then(_self.copyWith(
id: null == id ? _self.id : id // ignore: cast_nullable_to_non_nullable
as String,displayName: null == displayName ? _self.displayName : displayName // ignore: cast_nullable_to_non_nullable
as String,
  ));
}

}


/// Adds pattern-matching-related methods to [OnboardingLandlordRef].
extension OnboardingLandlordRefPatterns on OnboardingLandlordRef {
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

@optionalTypeArgs TResult maybeMap<TResult extends Object?>(TResult Function( _OnboardingLandlordRef value)?  $default,{required TResult orElse(),}){
final _that = this;
switch (_that) {
case _OnboardingLandlordRef() when $default != null:
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

@optionalTypeArgs TResult map<TResult extends Object?>(TResult Function( _OnboardingLandlordRef value)  $default,){
final _that = this;
switch (_that) {
case _OnboardingLandlordRef():
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

@optionalTypeArgs TResult? mapOrNull<TResult extends Object?>(TResult? Function( _OnboardingLandlordRef value)?  $default,){
final _that = this;
switch (_that) {
case _OnboardingLandlordRef() when $default != null:
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

@optionalTypeArgs TResult maybeWhen<TResult extends Object?>(TResult Function( String id,  String displayName)?  $default,{required TResult orElse(),}) {final _that = this;
switch (_that) {
case _OnboardingLandlordRef() when $default != null:
return $default(_that.id,_that.displayName);case _:
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

@optionalTypeArgs TResult when<TResult extends Object?>(TResult Function( String id,  String displayName)  $default,) {final _that = this;
switch (_that) {
case _OnboardingLandlordRef():
return $default(_that.id,_that.displayName);case _:
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

@optionalTypeArgs TResult? whenOrNull<TResult extends Object?>(TResult? Function( String id,  String displayName)?  $default,) {final _that = this;
switch (_that) {
case _OnboardingLandlordRef() when $default != null:
return $default(_that.id,_that.displayName);case _:
  return null;

}
}

}

/// @nodoc
@JsonSerializable()

class _OnboardingLandlordRef implements OnboardingLandlordRef {
  const _OnboardingLandlordRef({required this.id, required this.displayName});
  factory _OnboardingLandlordRef.fromJson(Map<String, dynamic> json) => _$OnboardingLandlordRefFromJson(json);

@override final  String id;
@override final  String displayName;

/// Create a copy of OnboardingLandlordRef
/// with the given fields replaced by the non-null parameter values.
@override @JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
_$OnboardingLandlordRefCopyWith<_OnboardingLandlordRef> get copyWith => __$OnboardingLandlordRefCopyWithImpl<_OnboardingLandlordRef>(this, _$identity);

@override
Map<String, dynamic> toJson() {
  return _$OnboardingLandlordRefToJson(this, );
}

@override
bool operator ==(Object other) {
  return identical(this, other) || (other.runtimeType == runtimeType&&other is _OnboardingLandlordRef&&(identical(other.id, id) || other.id == id)&&(identical(other.displayName, displayName) || other.displayName == displayName));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode => Object.hash(runtimeType,id,displayName);

@override
String toString() {
  return 'OnboardingLandlordRef(id: $id, displayName: $displayName)';
}


}

/// @nodoc
abstract mixin class _$OnboardingLandlordRefCopyWith<$Res> implements $OnboardingLandlordRefCopyWith<$Res> {
  factory _$OnboardingLandlordRefCopyWith(_OnboardingLandlordRef value, $Res Function(_OnboardingLandlordRef) _then) = __$OnboardingLandlordRefCopyWithImpl;
@override @useResult
$Res call({
 String id, String displayName
});




}
/// @nodoc
class __$OnboardingLandlordRefCopyWithImpl<$Res>
    implements _$OnboardingLandlordRefCopyWith<$Res> {
  __$OnboardingLandlordRefCopyWithImpl(this._self, this._then);

  final _OnboardingLandlordRef _self;
  final $Res Function(_OnboardingLandlordRef) _then;

/// Create a copy of OnboardingLandlordRef
/// with the given fields replaced by the non-null parameter values.
@override @pragma('vm:prefer-inline') $Res call({Object? id = null,Object? displayName = null,}) {
  return _then(_OnboardingLandlordRef(
id: null == id ? _self.id : id // ignore: cast_nullable_to_non_nullable
as String,displayName: null == displayName ? _self.displayName : displayName // ignore: cast_nullable_to_non_nullable
as String,
  ));
}


}


/// @nodoc
mixin _$OnboardingPropertyRef {

 String get id; String get name;
/// Create a copy of OnboardingPropertyRef
/// with the given fields replaced by the non-null parameter values.
@JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
$OnboardingPropertyRefCopyWith<OnboardingPropertyRef> get copyWith => _$OnboardingPropertyRefCopyWithImpl<OnboardingPropertyRef>(this as OnboardingPropertyRef, _$identity);

  /// Serializes this OnboardingPropertyRef to a JSON map.
  Map<String, dynamic> toJson();


@override
bool operator ==(Object other) {
  return identical(this, other) || (other.runtimeType == runtimeType&&other is OnboardingPropertyRef&&(identical(other.id, id) || other.id == id)&&(identical(other.name, name) || other.name == name));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode => Object.hash(runtimeType,id,name);

@override
String toString() {
  return 'OnboardingPropertyRef(id: $id, name: $name)';
}


}

/// @nodoc
abstract mixin class $OnboardingPropertyRefCopyWith<$Res>  {
  factory $OnboardingPropertyRefCopyWith(OnboardingPropertyRef value, $Res Function(OnboardingPropertyRef) _then) = _$OnboardingPropertyRefCopyWithImpl;
@useResult
$Res call({
 String id, String name
});




}
/// @nodoc
class _$OnboardingPropertyRefCopyWithImpl<$Res>
    implements $OnboardingPropertyRefCopyWith<$Res> {
  _$OnboardingPropertyRefCopyWithImpl(this._self, this._then);

  final OnboardingPropertyRef _self;
  final $Res Function(OnboardingPropertyRef) _then;

/// Create a copy of OnboardingPropertyRef
/// with the given fields replaced by the non-null parameter values.
@pragma('vm:prefer-inline') @override $Res call({Object? id = null,Object? name = null,}) {
  return _then(_self.copyWith(
id: null == id ? _self.id : id // ignore: cast_nullable_to_non_nullable
as String,name: null == name ? _self.name : name // ignore: cast_nullable_to_non_nullable
as String,
  ));
}

}


/// Adds pattern-matching-related methods to [OnboardingPropertyRef].
extension OnboardingPropertyRefPatterns on OnboardingPropertyRef {
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

@optionalTypeArgs TResult maybeMap<TResult extends Object?>(TResult Function( _OnboardingPropertyRef value)?  $default,{required TResult orElse(),}){
final _that = this;
switch (_that) {
case _OnboardingPropertyRef() when $default != null:
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

@optionalTypeArgs TResult map<TResult extends Object?>(TResult Function( _OnboardingPropertyRef value)  $default,){
final _that = this;
switch (_that) {
case _OnboardingPropertyRef():
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

@optionalTypeArgs TResult? mapOrNull<TResult extends Object?>(TResult? Function( _OnboardingPropertyRef value)?  $default,){
final _that = this;
switch (_that) {
case _OnboardingPropertyRef() when $default != null:
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
case _OnboardingPropertyRef() when $default != null:
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
case _OnboardingPropertyRef():
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
case _OnboardingPropertyRef() when $default != null:
return $default(_that.id,_that.name);case _:
  return null;

}
}

}

/// @nodoc
@JsonSerializable()

class _OnboardingPropertyRef implements OnboardingPropertyRef {
  const _OnboardingPropertyRef({required this.id, required this.name});
  factory _OnboardingPropertyRef.fromJson(Map<String, dynamic> json) => _$OnboardingPropertyRefFromJson(json);

@override final  String id;
@override final  String name;

/// Create a copy of OnboardingPropertyRef
/// with the given fields replaced by the non-null parameter values.
@override @JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
_$OnboardingPropertyRefCopyWith<_OnboardingPropertyRef> get copyWith => __$OnboardingPropertyRefCopyWithImpl<_OnboardingPropertyRef>(this, _$identity);

@override
Map<String, dynamic> toJson() {
  return _$OnboardingPropertyRefToJson(this, );
}

@override
bool operator ==(Object other) {
  return identical(this, other) || (other.runtimeType == runtimeType&&other is _OnboardingPropertyRef&&(identical(other.id, id) || other.id == id)&&(identical(other.name, name) || other.name == name));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode => Object.hash(runtimeType,id,name);

@override
String toString() {
  return 'OnboardingPropertyRef(id: $id, name: $name)';
}


}

/// @nodoc
abstract mixin class _$OnboardingPropertyRefCopyWith<$Res> implements $OnboardingPropertyRefCopyWith<$Res> {
  factory _$OnboardingPropertyRefCopyWith(_OnboardingPropertyRef value, $Res Function(_OnboardingPropertyRef) _then) = __$OnboardingPropertyRefCopyWithImpl;
@override @useResult
$Res call({
 String id, String name
});




}
/// @nodoc
class __$OnboardingPropertyRefCopyWithImpl<$Res>
    implements _$OnboardingPropertyRefCopyWith<$Res> {
  __$OnboardingPropertyRefCopyWithImpl(this._self, this._then);

  final _OnboardingPropertyRef _self;
  final $Res Function(_OnboardingPropertyRef) _then;

/// Create a copy of OnboardingPropertyRef
/// with the given fields replaced by the non-null parameter values.
@override @pragma('vm:prefer-inline') $Res call({Object? id = null,Object? name = null,}) {
  return _then(_OnboardingPropertyRef(
id: null == id ? _self.id : id // ignore: cast_nullable_to_non_nullable
as String,name: null == name ? _self.name : name // ignore: cast_nullable_to_non_nullable
as String,
  ));
}


}


/// @nodoc
mixin _$OnboardingMandateRef {

 String get id; String get reference; int? get commissionRateBps;
/// Create a copy of OnboardingMandateRef
/// with the given fields replaced by the non-null parameter values.
@JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
$OnboardingMandateRefCopyWith<OnboardingMandateRef> get copyWith => _$OnboardingMandateRefCopyWithImpl<OnboardingMandateRef>(this as OnboardingMandateRef, _$identity);

  /// Serializes this OnboardingMandateRef to a JSON map.
  Map<String, dynamic> toJson();


@override
bool operator ==(Object other) {
  return identical(this, other) || (other.runtimeType == runtimeType&&other is OnboardingMandateRef&&(identical(other.id, id) || other.id == id)&&(identical(other.reference, reference) || other.reference == reference)&&(identical(other.commissionRateBps, commissionRateBps) || other.commissionRateBps == commissionRateBps));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode => Object.hash(runtimeType,id,reference,commissionRateBps);

@override
String toString() {
  return 'OnboardingMandateRef(id: $id, reference: $reference, commissionRateBps: $commissionRateBps)';
}


}

/// @nodoc
abstract mixin class $OnboardingMandateRefCopyWith<$Res>  {
  factory $OnboardingMandateRefCopyWith(OnboardingMandateRef value, $Res Function(OnboardingMandateRef) _then) = _$OnboardingMandateRefCopyWithImpl;
@useResult
$Res call({
 String id, String reference, int? commissionRateBps
});




}
/// @nodoc
class _$OnboardingMandateRefCopyWithImpl<$Res>
    implements $OnboardingMandateRefCopyWith<$Res> {
  _$OnboardingMandateRefCopyWithImpl(this._self, this._then);

  final OnboardingMandateRef _self;
  final $Res Function(OnboardingMandateRef) _then;

/// Create a copy of OnboardingMandateRef
/// with the given fields replaced by the non-null parameter values.
@pragma('vm:prefer-inline') @override $Res call({Object? id = null,Object? reference = null,Object? commissionRateBps = freezed,}) {
  return _then(_self.copyWith(
id: null == id ? _self.id : id // ignore: cast_nullable_to_non_nullable
as String,reference: null == reference ? _self.reference : reference // ignore: cast_nullable_to_non_nullable
as String,commissionRateBps: freezed == commissionRateBps ? _self.commissionRateBps : commissionRateBps // ignore: cast_nullable_to_non_nullable
as int?,
  ));
}

}


/// Adds pattern-matching-related methods to [OnboardingMandateRef].
extension OnboardingMandateRefPatterns on OnboardingMandateRef {
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

@optionalTypeArgs TResult maybeMap<TResult extends Object?>(TResult Function( _OnboardingMandateRef value)?  $default,{required TResult orElse(),}){
final _that = this;
switch (_that) {
case _OnboardingMandateRef() when $default != null:
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

@optionalTypeArgs TResult map<TResult extends Object?>(TResult Function( _OnboardingMandateRef value)  $default,){
final _that = this;
switch (_that) {
case _OnboardingMandateRef():
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

@optionalTypeArgs TResult? mapOrNull<TResult extends Object?>(TResult? Function( _OnboardingMandateRef value)?  $default,){
final _that = this;
switch (_that) {
case _OnboardingMandateRef() when $default != null:
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

@optionalTypeArgs TResult maybeWhen<TResult extends Object?>(TResult Function( String id,  String reference,  int? commissionRateBps)?  $default,{required TResult orElse(),}) {final _that = this;
switch (_that) {
case _OnboardingMandateRef() when $default != null:
return $default(_that.id,_that.reference,_that.commissionRateBps);case _:
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

@optionalTypeArgs TResult when<TResult extends Object?>(TResult Function( String id,  String reference,  int? commissionRateBps)  $default,) {final _that = this;
switch (_that) {
case _OnboardingMandateRef():
return $default(_that.id,_that.reference,_that.commissionRateBps);case _:
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

@optionalTypeArgs TResult? whenOrNull<TResult extends Object?>(TResult? Function( String id,  String reference,  int? commissionRateBps)?  $default,) {final _that = this;
switch (_that) {
case _OnboardingMandateRef() when $default != null:
return $default(_that.id,_that.reference,_that.commissionRateBps);case _:
  return null;

}
}

}

/// @nodoc
@JsonSerializable()

class _OnboardingMandateRef implements OnboardingMandateRef {
  const _OnboardingMandateRef({required this.id, required this.reference, this.commissionRateBps});
  factory _OnboardingMandateRef.fromJson(Map<String, dynamic> json) => _$OnboardingMandateRefFromJson(json);

@override final  String id;
@override final  String reference;
@override final  int? commissionRateBps;

/// Create a copy of OnboardingMandateRef
/// with the given fields replaced by the non-null parameter values.
@override @JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
_$OnboardingMandateRefCopyWith<_OnboardingMandateRef> get copyWith => __$OnboardingMandateRefCopyWithImpl<_OnboardingMandateRef>(this, _$identity);

@override
Map<String, dynamic> toJson() {
  return _$OnboardingMandateRefToJson(this, );
}

@override
bool operator ==(Object other) {
  return identical(this, other) || (other.runtimeType == runtimeType&&other is _OnboardingMandateRef&&(identical(other.id, id) || other.id == id)&&(identical(other.reference, reference) || other.reference == reference)&&(identical(other.commissionRateBps, commissionRateBps) || other.commissionRateBps == commissionRateBps));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode => Object.hash(runtimeType,id,reference,commissionRateBps);

@override
String toString() {
  return 'OnboardingMandateRef(id: $id, reference: $reference, commissionRateBps: $commissionRateBps)';
}


}

/// @nodoc
abstract mixin class _$OnboardingMandateRefCopyWith<$Res> implements $OnboardingMandateRefCopyWith<$Res> {
  factory _$OnboardingMandateRefCopyWith(_OnboardingMandateRef value, $Res Function(_OnboardingMandateRef) _then) = __$OnboardingMandateRefCopyWithImpl;
@override @useResult
$Res call({
 String id, String reference, int? commissionRateBps
});




}
/// @nodoc
class __$OnboardingMandateRefCopyWithImpl<$Res>
    implements _$OnboardingMandateRefCopyWith<$Res> {
  __$OnboardingMandateRefCopyWithImpl(this._self, this._then);

  final _OnboardingMandateRef _self;
  final $Res Function(_OnboardingMandateRef) _then;

/// Create a copy of OnboardingMandateRef
/// with the given fields replaced by the non-null parameter values.
@override @pragma('vm:prefer-inline') $Res call({Object? id = null,Object? reference = null,Object? commissionRateBps = freezed,}) {
  return _then(_OnboardingMandateRef(
id: null == id ? _self.id : id // ignore: cast_nullable_to_non_nullable
as String,reference: null == reference ? _self.reference : reference // ignore: cast_nullable_to_non_nullable
as String,commissionRateBps: freezed == commissionRateBps ? _self.commissionRateBps : commissionRateBps // ignore: cast_nullable_to_non_nullable
as int?,
  ));
}


}


/// @nodoc
mixin _$IndependentManagerOnboardingResult {

 OnboardingOrganizationRef get organization; OnboardingLandlordRef get landlord; OnboardingPropertyRef get property; OnboardingMandateRef get mandate;
/// Create a copy of IndependentManagerOnboardingResult
/// with the given fields replaced by the non-null parameter values.
@JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
$IndependentManagerOnboardingResultCopyWith<IndependentManagerOnboardingResult> get copyWith => _$IndependentManagerOnboardingResultCopyWithImpl<IndependentManagerOnboardingResult>(this as IndependentManagerOnboardingResult, _$identity);

  /// Serializes this IndependentManagerOnboardingResult to a JSON map.
  Map<String, dynamic> toJson();


@override
bool operator ==(Object other) {
  return identical(this, other) || (other.runtimeType == runtimeType&&other is IndependentManagerOnboardingResult&&(identical(other.organization, organization) || other.organization == organization)&&(identical(other.landlord, landlord) || other.landlord == landlord)&&(identical(other.property, property) || other.property == property)&&(identical(other.mandate, mandate) || other.mandate == mandate));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode => Object.hash(runtimeType,organization,landlord,property,mandate);

@override
String toString() {
  return 'IndependentManagerOnboardingResult(organization: $organization, landlord: $landlord, property: $property, mandate: $mandate)';
}


}

/// @nodoc
abstract mixin class $IndependentManagerOnboardingResultCopyWith<$Res>  {
  factory $IndependentManagerOnboardingResultCopyWith(IndependentManagerOnboardingResult value, $Res Function(IndependentManagerOnboardingResult) _then) = _$IndependentManagerOnboardingResultCopyWithImpl;
@useResult
$Res call({
 OnboardingOrganizationRef organization, OnboardingLandlordRef landlord, OnboardingPropertyRef property, OnboardingMandateRef mandate
});


$OnboardingOrganizationRefCopyWith<$Res> get organization;$OnboardingLandlordRefCopyWith<$Res> get landlord;$OnboardingPropertyRefCopyWith<$Res> get property;$OnboardingMandateRefCopyWith<$Res> get mandate;

}
/// @nodoc
class _$IndependentManagerOnboardingResultCopyWithImpl<$Res>
    implements $IndependentManagerOnboardingResultCopyWith<$Res> {
  _$IndependentManagerOnboardingResultCopyWithImpl(this._self, this._then);

  final IndependentManagerOnboardingResult _self;
  final $Res Function(IndependentManagerOnboardingResult) _then;

/// Create a copy of IndependentManagerOnboardingResult
/// with the given fields replaced by the non-null parameter values.
@pragma('vm:prefer-inline') @override $Res call({Object? organization = null,Object? landlord = null,Object? property = null,Object? mandate = null,}) {
  return _then(_self.copyWith(
organization: null == organization ? _self.organization : organization // ignore: cast_nullable_to_non_nullable
as OnboardingOrganizationRef,landlord: null == landlord ? _self.landlord : landlord // ignore: cast_nullable_to_non_nullable
as OnboardingLandlordRef,property: null == property ? _self.property : property // ignore: cast_nullable_to_non_nullable
as OnboardingPropertyRef,mandate: null == mandate ? _self.mandate : mandate // ignore: cast_nullable_to_non_nullable
as OnboardingMandateRef,
  ));
}
/// Create a copy of IndependentManagerOnboardingResult
/// with the given fields replaced by the non-null parameter values.
@override
@pragma('vm:prefer-inline')
$OnboardingOrganizationRefCopyWith<$Res> get organization {
  
  return $OnboardingOrganizationRefCopyWith<$Res>(_self.organization, (value) {
    return _then(_self.copyWith(organization: value));
  });
}/// Create a copy of IndependentManagerOnboardingResult
/// with the given fields replaced by the non-null parameter values.
@override
@pragma('vm:prefer-inline')
$OnboardingLandlordRefCopyWith<$Res> get landlord {
  
  return $OnboardingLandlordRefCopyWith<$Res>(_self.landlord, (value) {
    return _then(_self.copyWith(landlord: value));
  });
}/// Create a copy of IndependentManagerOnboardingResult
/// with the given fields replaced by the non-null parameter values.
@override
@pragma('vm:prefer-inline')
$OnboardingPropertyRefCopyWith<$Res> get property {
  
  return $OnboardingPropertyRefCopyWith<$Res>(_self.property, (value) {
    return _then(_self.copyWith(property: value));
  });
}/// Create a copy of IndependentManagerOnboardingResult
/// with the given fields replaced by the non-null parameter values.
@override
@pragma('vm:prefer-inline')
$OnboardingMandateRefCopyWith<$Res> get mandate {
  
  return $OnboardingMandateRefCopyWith<$Res>(_self.mandate, (value) {
    return _then(_self.copyWith(mandate: value));
  });
}
}


/// Adds pattern-matching-related methods to [IndependentManagerOnboardingResult].
extension IndependentManagerOnboardingResultPatterns on IndependentManagerOnboardingResult {
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

@optionalTypeArgs TResult maybeMap<TResult extends Object?>(TResult Function( _IndependentManagerOnboardingResult value)?  $default,{required TResult orElse(),}){
final _that = this;
switch (_that) {
case _IndependentManagerOnboardingResult() when $default != null:
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

@optionalTypeArgs TResult map<TResult extends Object?>(TResult Function( _IndependentManagerOnboardingResult value)  $default,){
final _that = this;
switch (_that) {
case _IndependentManagerOnboardingResult():
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

@optionalTypeArgs TResult? mapOrNull<TResult extends Object?>(TResult? Function( _IndependentManagerOnboardingResult value)?  $default,){
final _that = this;
switch (_that) {
case _IndependentManagerOnboardingResult() when $default != null:
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

@optionalTypeArgs TResult maybeWhen<TResult extends Object?>(TResult Function( OnboardingOrganizationRef organization,  OnboardingLandlordRef landlord,  OnboardingPropertyRef property,  OnboardingMandateRef mandate)?  $default,{required TResult orElse(),}) {final _that = this;
switch (_that) {
case _IndependentManagerOnboardingResult() when $default != null:
return $default(_that.organization,_that.landlord,_that.property,_that.mandate);case _:
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

@optionalTypeArgs TResult when<TResult extends Object?>(TResult Function( OnboardingOrganizationRef organization,  OnboardingLandlordRef landlord,  OnboardingPropertyRef property,  OnboardingMandateRef mandate)  $default,) {final _that = this;
switch (_that) {
case _IndependentManagerOnboardingResult():
return $default(_that.organization,_that.landlord,_that.property,_that.mandate);case _:
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

@optionalTypeArgs TResult? whenOrNull<TResult extends Object?>(TResult? Function( OnboardingOrganizationRef organization,  OnboardingLandlordRef landlord,  OnboardingPropertyRef property,  OnboardingMandateRef mandate)?  $default,) {final _that = this;
switch (_that) {
case _IndependentManagerOnboardingResult() when $default != null:
return $default(_that.organization,_that.landlord,_that.property,_that.mandate);case _:
  return null;

}
}

}

/// @nodoc
@JsonSerializable()

class _IndependentManagerOnboardingResult implements IndependentManagerOnboardingResult {
  const _IndependentManagerOnboardingResult({required this.organization, required this.landlord, required this.property, required this.mandate});
  factory _IndependentManagerOnboardingResult.fromJson(Map<String, dynamic> json) => _$IndependentManagerOnboardingResultFromJson(json);

@override final  OnboardingOrganizationRef organization;
@override final  OnboardingLandlordRef landlord;
@override final  OnboardingPropertyRef property;
@override final  OnboardingMandateRef mandate;

/// Create a copy of IndependentManagerOnboardingResult
/// with the given fields replaced by the non-null parameter values.
@override @JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
_$IndependentManagerOnboardingResultCopyWith<_IndependentManagerOnboardingResult> get copyWith => __$IndependentManagerOnboardingResultCopyWithImpl<_IndependentManagerOnboardingResult>(this, _$identity);

@override
Map<String, dynamic> toJson() {
  return _$IndependentManagerOnboardingResultToJson(this, );
}

@override
bool operator ==(Object other) {
  return identical(this, other) || (other.runtimeType == runtimeType&&other is _IndependentManagerOnboardingResult&&(identical(other.organization, organization) || other.organization == organization)&&(identical(other.landlord, landlord) || other.landlord == landlord)&&(identical(other.property, property) || other.property == property)&&(identical(other.mandate, mandate) || other.mandate == mandate));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode => Object.hash(runtimeType,organization,landlord,property,mandate);

@override
String toString() {
  return 'IndependentManagerOnboardingResult(organization: $organization, landlord: $landlord, property: $property, mandate: $mandate)';
}


}

/// @nodoc
abstract mixin class _$IndependentManagerOnboardingResultCopyWith<$Res> implements $IndependentManagerOnboardingResultCopyWith<$Res> {
  factory _$IndependentManagerOnboardingResultCopyWith(_IndependentManagerOnboardingResult value, $Res Function(_IndependentManagerOnboardingResult) _then) = __$IndependentManagerOnboardingResultCopyWithImpl;
@override @useResult
$Res call({
 OnboardingOrganizationRef organization, OnboardingLandlordRef landlord, OnboardingPropertyRef property, OnboardingMandateRef mandate
});


@override $OnboardingOrganizationRefCopyWith<$Res> get organization;@override $OnboardingLandlordRefCopyWith<$Res> get landlord;@override $OnboardingPropertyRefCopyWith<$Res> get property;@override $OnboardingMandateRefCopyWith<$Res> get mandate;

}
/// @nodoc
class __$IndependentManagerOnboardingResultCopyWithImpl<$Res>
    implements _$IndependentManagerOnboardingResultCopyWith<$Res> {
  __$IndependentManagerOnboardingResultCopyWithImpl(this._self, this._then);

  final _IndependentManagerOnboardingResult _self;
  final $Res Function(_IndependentManagerOnboardingResult) _then;

/// Create a copy of IndependentManagerOnboardingResult
/// with the given fields replaced by the non-null parameter values.
@override @pragma('vm:prefer-inline') $Res call({Object? organization = null,Object? landlord = null,Object? property = null,Object? mandate = null,}) {
  return _then(_IndependentManagerOnboardingResult(
organization: null == organization ? _self.organization : organization // ignore: cast_nullable_to_non_nullable
as OnboardingOrganizationRef,landlord: null == landlord ? _self.landlord : landlord // ignore: cast_nullable_to_non_nullable
as OnboardingLandlordRef,property: null == property ? _self.property : property // ignore: cast_nullable_to_non_nullable
as OnboardingPropertyRef,mandate: null == mandate ? _self.mandate : mandate // ignore: cast_nullable_to_non_nullable
as OnboardingMandateRef,
  ));
}

/// Create a copy of IndependentManagerOnboardingResult
/// with the given fields replaced by the non-null parameter values.
@override
@pragma('vm:prefer-inline')
$OnboardingOrganizationRefCopyWith<$Res> get organization {
  
  return $OnboardingOrganizationRefCopyWith<$Res>(_self.organization, (value) {
    return _then(_self.copyWith(organization: value));
  });
}/// Create a copy of IndependentManagerOnboardingResult
/// with the given fields replaced by the non-null parameter values.
@override
@pragma('vm:prefer-inline')
$OnboardingLandlordRefCopyWith<$Res> get landlord {
  
  return $OnboardingLandlordRefCopyWith<$Res>(_self.landlord, (value) {
    return _then(_self.copyWith(landlord: value));
  });
}/// Create a copy of IndependentManagerOnboardingResult
/// with the given fields replaced by the non-null parameter values.
@override
@pragma('vm:prefer-inline')
$OnboardingPropertyRefCopyWith<$Res> get property {
  
  return $OnboardingPropertyRefCopyWith<$Res>(_self.property, (value) {
    return _then(_self.copyWith(property: value));
  });
}/// Create a copy of IndependentManagerOnboardingResult
/// with the given fields replaced by the non-null parameter values.
@override
@pragma('vm:prefer-inline')
$OnboardingMandateRefCopyWith<$Res> get mandate {
  
  return $OnboardingMandateRefCopyWith<$Res>(_self.mandate, (value) {
    return _then(_self.copyWith(mandate: value));
  });
}
}

// dart format on
