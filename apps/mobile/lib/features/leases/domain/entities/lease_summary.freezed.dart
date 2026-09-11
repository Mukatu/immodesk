// GENERATED CODE - DO NOT MODIFY BY HAND
// coverage:ignore-file
// ignore_for_file: type=lint
// ignore_for_file: unused_element, deprecated_member_use, deprecated_member_use_from_same_package, use_function_type_syntax_for_parameters, unnecessary_const, avoid_init_to_null, invalid_override_different_default_values_named, prefer_expression_function_bodies, annotate_overrides, invalid_annotation_target, unnecessary_question_mark

part of 'lease_summary.dart';

// **************************************************************************
// FreezedGenerator
// **************************************************************************

// dart format off
T _$identity<T>(T value) => value;

/// @nodoc
mixin _$LeaseUnitRef {

 String get id; String get code; String? get label;
/// Create a copy of LeaseUnitRef
/// with the given fields replaced by the non-null parameter values.
@JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
$LeaseUnitRefCopyWith<LeaseUnitRef> get copyWith => _$LeaseUnitRefCopyWithImpl<LeaseUnitRef>(this as LeaseUnitRef, _$identity);

  /// Serializes this LeaseUnitRef to a JSON map.
  Map<String, dynamic> toJson();


@override
bool operator ==(Object other) {
  return identical(this, other) || (other.runtimeType == runtimeType&&other is LeaseUnitRef&&(identical(other.id, id) || other.id == id)&&(identical(other.code, code) || other.code == code)&&(identical(other.label, label) || other.label == label));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode => Object.hash(runtimeType,id,code,label);

@override
String toString() {
  return 'LeaseUnitRef(id: $id, code: $code, label: $label)';
}


}

/// @nodoc
abstract mixin class $LeaseUnitRefCopyWith<$Res>  {
  factory $LeaseUnitRefCopyWith(LeaseUnitRef value, $Res Function(LeaseUnitRef) _then) = _$LeaseUnitRefCopyWithImpl;
@useResult
$Res call({
 String id, String code, String? label
});




}
/// @nodoc
class _$LeaseUnitRefCopyWithImpl<$Res>
    implements $LeaseUnitRefCopyWith<$Res> {
  _$LeaseUnitRefCopyWithImpl(this._self, this._then);

  final LeaseUnitRef _self;
  final $Res Function(LeaseUnitRef) _then;

/// Create a copy of LeaseUnitRef
/// with the given fields replaced by the non-null parameter values.
@pragma('vm:prefer-inline') @override $Res call({Object? id = null,Object? code = null,Object? label = freezed,}) {
  return _then(_self.copyWith(
id: null == id ? _self.id : id // ignore: cast_nullable_to_non_nullable
as String,code: null == code ? _self.code : code // ignore: cast_nullable_to_non_nullable
as String,label: freezed == label ? _self.label : label // ignore: cast_nullable_to_non_nullable
as String?,
  ));
}

}


/// Adds pattern-matching-related methods to [LeaseUnitRef].
extension LeaseUnitRefPatterns on LeaseUnitRef {
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

@optionalTypeArgs TResult maybeMap<TResult extends Object?>(TResult Function( _LeaseUnitRef value)?  $default,{required TResult orElse(),}){
final _that = this;
switch (_that) {
case _LeaseUnitRef() when $default != null:
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

@optionalTypeArgs TResult map<TResult extends Object?>(TResult Function( _LeaseUnitRef value)  $default,){
final _that = this;
switch (_that) {
case _LeaseUnitRef():
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

@optionalTypeArgs TResult? mapOrNull<TResult extends Object?>(TResult? Function( _LeaseUnitRef value)?  $default,){
final _that = this;
switch (_that) {
case _LeaseUnitRef() when $default != null:
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

@optionalTypeArgs TResult maybeWhen<TResult extends Object?>(TResult Function( String id,  String code,  String? label)?  $default,{required TResult orElse(),}) {final _that = this;
switch (_that) {
case _LeaseUnitRef() when $default != null:
return $default(_that.id,_that.code,_that.label);case _:
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

@optionalTypeArgs TResult when<TResult extends Object?>(TResult Function( String id,  String code,  String? label)  $default,) {final _that = this;
switch (_that) {
case _LeaseUnitRef():
return $default(_that.id,_that.code,_that.label);case _:
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

@optionalTypeArgs TResult? whenOrNull<TResult extends Object?>(TResult? Function( String id,  String code,  String? label)?  $default,) {final _that = this;
switch (_that) {
case _LeaseUnitRef() when $default != null:
return $default(_that.id,_that.code,_that.label);case _:
  return null;

}
}

}

/// @nodoc
@JsonSerializable()

class _LeaseUnitRef implements LeaseUnitRef {
  const _LeaseUnitRef({required this.id, required this.code, this.label});
  factory _LeaseUnitRef.fromJson(Map<String, dynamic> json) => _$LeaseUnitRefFromJson(json);

@override final  String id;
@override final  String code;
@override final  String? label;

/// Create a copy of LeaseUnitRef
/// with the given fields replaced by the non-null parameter values.
@override @JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
_$LeaseUnitRefCopyWith<_LeaseUnitRef> get copyWith => __$LeaseUnitRefCopyWithImpl<_LeaseUnitRef>(this, _$identity);

@override
Map<String, dynamic> toJson() {
  return _$LeaseUnitRefToJson(this, );
}

@override
bool operator ==(Object other) {
  return identical(this, other) || (other.runtimeType == runtimeType&&other is _LeaseUnitRef&&(identical(other.id, id) || other.id == id)&&(identical(other.code, code) || other.code == code)&&(identical(other.label, label) || other.label == label));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode => Object.hash(runtimeType,id,code,label);

@override
String toString() {
  return 'LeaseUnitRef(id: $id, code: $code, label: $label)';
}


}

/// @nodoc
abstract mixin class _$LeaseUnitRefCopyWith<$Res> implements $LeaseUnitRefCopyWith<$Res> {
  factory _$LeaseUnitRefCopyWith(_LeaseUnitRef value, $Res Function(_LeaseUnitRef) _then) = __$LeaseUnitRefCopyWithImpl;
@override @useResult
$Res call({
 String id, String code, String? label
});




}
/// @nodoc
class __$LeaseUnitRefCopyWithImpl<$Res>
    implements _$LeaseUnitRefCopyWith<$Res> {
  __$LeaseUnitRefCopyWithImpl(this._self, this._then);

  final _LeaseUnitRef _self;
  final $Res Function(_LeaseUnitRef) _then;

/// Create a copy of LeaseUnitRef
/// with the given fields replaced by the non-null parameter values.
@override @pragma('vm:prefer-inline') $Res call({Object? id = null,Object? code = null,Object? label = freezed,}) {
  return _then(_LeaseUnitRef(
id: null == id ? _self.id : id // ignore: cast_nullable_to_non_nullable
as String,code: null == code ? _self.code : code // ignore: cast_nullable_to_non_nullable
as String,label: freezed == label ? _self.label : label // ignore: cast_nullable_to_non_nullable
as String?,
  ));
}


}


/// @nodoc
mixin _$LeasePropertyRef {

 String get id; String get name;
/// Create a copy of LeasePropertyRef
/// with the given fields replaced by the non-null parameter values.
@JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
$LeasePropertyRefCopyWith<LeasePropertyRef> get copyWith => _$LeasePropertyRefCopyWithImpl<LeasePropertyRef>(this as LeasePropertyRef, _$identity);

  /// Serializes this LeasePropertyRef to a JSON map.
  Map<String, dynamic> toJson();


@override
bool operator ==(Object other) {
  return identical(this, other) || (other.runtimeType == runtimeType&&other is LeasePropertyRef&&(identical(other.id, id) || other.id == id)&&(identical(other.name, name) || other.name == name));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode => Object.hash(runtimeType,id,name);

@override
String toString() {
  return 'LeasePropertyRef(id: $id, name: $name)';
}


}

/// @nodoc
abstract mixin class $LeasePropertyRefCopyWith<$Res>  {
  factory $LeasePropertyRefCopyWith(LeasePropertyRef value, $Res Function(LeasePropertyRef) _then) = _$LeasePropertyRefCopyWithImpl;
@useResult
$Res call({
 String id, String name
});




}
/// @nodoc
class _$LeasePropertyRefCopyWithImpl<$Res>
    implements $LeasePropertyRefCopyWith<$Res> {
  _$LeasePropertyRefCopyWithImpl(this._self, this._then);

  final LeasePropertyRef _self;
  final $Res Function(LeasePropertyRef) _then;

/// Create a copy of LeasePropertyRef
/// with the given fields replaced by the non-null parameter values.
@pragma('vm:prefer-inline') @override $Res call({Object? id = null,Object? name = null,}) {
  return _then(_self.copyWith(
id: null == id ? _self.id : id // ignore: cast_nullable_to_non_nullable
as String,name: null == name ? _self.name : name // ignore: cast_nullable_to_non_nullable
as String,
  ));
}

}


/// Adds pattern-matching-related methods to [LeasePropertyRef].
extension LeasePropertyRefPatterns on LeasePropertyRef {
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

@optionalTypeArgs TResult maybeMap<TResult extends Object?>(TResult Function( _LeasePropertyRef value)?  $default,{required TResult orElse(),}){
final _that = this;
switch (_that) {
case _LeasePropertyRef() when $default != null:
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

@optionalTypeArgs TResult map<TResult extends Object?>(TResult Function( _LeasePropertyRef value)  $default,){
final _that = this;
switch (_that) {
case _LeasePropertyRef():
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

@optionalTypeArgs TResult? mapOrNull<TResult extends Object?>(TResult? Function( _LeasePropertyRef value)?  $default,){
final _that = this;
switch (_that) {
case _LeasePropertyRef() when $default != null:
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
case _LeasePropertyRef() when $default != null:
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
case _LeasePropertyRef():
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
case _LeasePropertyRef() when $default != null:
return $default(_that.id,_that.name);case _:
  return null;

}
}

}

/// @nodoc
@JsonSerializable()

class _LeasePropertyRef implements LeasePropertyRef {
  const _LeasePropertyRef({required this.id, required this.name});
  factory _LeasePropertyRef.fromJson(Map<String, dynamic> json) => _$LeasePropertyRefFromJson(json);

@override final  String id;
@override final  String name;

/// Create a copy of LeasePropertyRef
/// with the given fields replaced by the non-null parameter values.
@override @JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
_$LeasePropertyRefCopyWith<_LeasePropertyRef> get copyWith => __$LeasePropertyRefCopyWithImpl<_LeasePropertyRef>(this, _$identity);

@override
Map<String, dynamic> toJson() {
  return _$LeasePropertyRefToJson(this, );
}

@override
bool operator ==(Object other) {
  return identical(this, other) || (other.runtimeType == runtimeType&&other is _LeasePropertyRef&&(identical(other.id, id) || other.id == id)&&(identical(other.name, name) || other.name == name));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode => Object.hash(runtimeType,id,name);

@override
String toString() {
  return 'LeasePropertyRef(id: $id, name: $name)';
}


}

/// @nodoc
abstract mixin class _$LeasePropertyRefCopyWith<$Res> implements $LeasePropertyRefCopyWith<$Res> {
  factory _$LeasePropertyRefCopyWith(_LeasePropertyRef value, $Res Function(_LeasePropertyRef) _then) = __$LeasePropertyRefCopyWithImpl;
@override @useResult
$Res call({
 String id, String name
});




}
/// @nodoc
class __$LeasePropertyRefCopyWithImpl<$Res>
    implements _$LeasePropertyRefCopyWith<$Res> {
  __$LeasePropertyRefCopyWithImpl(this._self, this._then);

  final _LeasePropertyRef _self;
  final $Res Function(_LeasePropertyRef) _then;

/// Create a copy of LeasePropertyRef
/// with the given fields replaced by the non-null parameter values.
@override @pragma('vm:prefer-inline') $Res call({Object? id = null,Object? name = null,}) {
  return _then(_LeasePropertyRef(
id: null == id ? _self.id : id // ignore: cast_nullable_to_non_nullable
as String,name: null == name ? _self.name : name // ignore: cast_nullable_to_non_nullable
as String,
  ));
}


}


/// @nodoc
mixin _$LeaseTenantRef {

 String get id; String get displayName; String get primaryPhone;
/// Create a copy of LeaseTenantRef
/// with the given fields replaced by the non-null parameter values.
@JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
$LeaseTenantRefCopyWith<LeaseTenantRef> get copyWith => _$LeaseTenantRefCopyWithImpl<LeaseTenantRef>(this as LeaseTenantRef, _$identity);

  /// Serializes this LeaseTenantRef to a JSON map.
  Map<String, dynamic> toJson();


@override
bool operator ==(Object other) {
  return identical(this, other) || (other.runtimeType == runtimeType&&other is LeaseTenantRef&&(identical(other.id, id) || other.id == id)&&(identical(other.displayName, displayName) || other.displayName == displayName)&&(identical(other.primaryPhone, primaryPhone) || other.primaryPhone == primaryPhone));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode => Object.hash(runtimeType,id,displayName,primaryPhone);

@override
String toString() {
  return 'LeaseTenantRef(id: $id, displayName: $displayName, primaryPhone: $primaryPhone)';
}


}

/// @nodoc
abstract mixin class $LeaseTenantRefCopyWith<$Res>  {
  factory $LeaseTenantRefCopyWith(LeaseTenantRef value, $Res Function(LeaseTenantRef) _then) = _$LeaseTenantRefCopyWithImpl;
@useResult
$Res call({
 String id, String displayName, String primaryPhone
});




}
/// @nodoc
class _$LeaseTenantRefCopyWithImpl<$Res>
    implements $LeaseTenantRefCopyWith<$Res> {
  _$LeaseTenantRefCopyWithImpl(this._self, this._then);

  final LeaseTenantRef _self;
  final $Res Function(LeaseTenantRef) _then;

/// Create a copy of LeaseTenantRef
/// with the given fields replaced by the non-null parameter values.
@pragma('vm:prefer-inline') @override $Res call({Object? id = null,Object? displayName = null,Object? primaryPhone = null,}) {
  return _then(_self.copyWith(
id: null == id ? _self.id : id // ignore: cast_nullable_to_non_nullable
as String,displayName: null == displayName ? _self.displayName : displayName // ignore: cast_nullable_to_non_nullable
as String,primaryPhone: null == primaryPhone ? _self.primaryPhone : primaryPhone // ignore: cast_nullable_to_non_nullable
as String,
  ));
}

}


/// Adds pattern-matching-related methods to [LeaseTenantRef].
extension LeaseTenantRefPatterns on LeaseTenantRef {
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

@optionalTypeArgs TResult maybeMap<TResult extends Object?>(TResult Function( _LeaseTenantRef value)?  $default,{required TResult orElse(),}){
final _that = this;
switch (_that) {
case _LeaseTenantRef() when $default != null:
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

@optionalTypeArgs TResult map<TResult extends Object?>(TResult Function( _LeaseTenantRef value)  $default,){
final _that = this;
switch (_that) {
case _LeaseTenantRef():
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

@optionalTypeArgs TResult? mapOrNull<TResult extends Object?>(TResult? Function( _LeaseTenantRef value)?  $default,){
final _that = this;
switch (_that) {
case _LeaseTenantRef() when $default != null:
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

@optionalTypeArgs TResult maybeWhen<TResult extends Object?>(TResult Function( String id,  String displayName,  String primaryPhone)?  $default,{required TResult orElse(),}) {final _that = this;
switch (_that) {
case _LeaseTenantRef() when $default != null:
return $default(_that.id,_that.displayName,_that.primaryPhone);case _:
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

@optionalTypeArgs TResult when<TResult extends Object?>(TResult Function( String id,  String displayName,  String primaryPhone)  $default,) {final _that = this;
switch (_that) {
case _LeaseTenantRef():
return $default(_that.id,_that.displayName,_that.primaryPhone);case _:
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

@optionalTypeArgs TResult? whenOrNull<TResult extends Object?>(TResult? Function( String id,  String displayName,  String primaryPhone)?  $default,) {final _that = this;
switch (_that) {
case _LeaseTenantRef() when $default != null:
return $default(_that.id,_that.displayName,_that.primaryPhone);case _:
  return null;

}
}

}

/// @nodoc
@JsonSerializable()

class _LeaseTenantRef implements LeaseTenantRef {
  const _LeaseTenantRef({required this.id, required this.displayName, required this.primaryPhone});
  factory _LeaseTenantRef.fromJson(Map<String, dynamic> json) => _$LeaseTenantRefFromJson(json);

@override final  String id;
@override final  String displayName;
@override final  String primaryPhone;

/// Create a copy of LeaseTenantRef
/// with the given fields replaced by the non-null parameter values.
@override @JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
_$LeaseTenantRefCopyWith<_LeaseTenantRef> get copyWith => __$LeaseTenantRefCopyWithImpl<_LeaseTenantRef>(this, _$identity);

@override
Map<String, dynamic> toJson() {
  return _$LeaseTenantRefToJson(this, );
}

@override
bool operator ==(Object other) {
  return identical(this, other) || (other.runtimeType == runtimeType&&other is _LeaseTenantRef&&(identical(other.id, id) || other.id == id)&&(identical(other.displayName, displayName) || other.displayName == displayName)&&(identical(other.primaryPhone, primaryPhone) || other.primaryPhone == primaryPhone));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode => Object.hash(runtimeType,id,displayName,primaryPhone);

@override
String toString() {
  return 'LeaseTenantRef(id: $id, displayName: $displayName, primaryPhone: $primaryPhone)';
}


}

/// @nodoc
abstract mixin class _$LeaseTenantRefCopyWith<$Res> implements $LeaseTenantRefCopyWith<$Res> {
  factory _$LeaseTenantRefCopyWith(_LeaseTenantRef value, $Res Function(_LeaseTenantRef) _then) = __$LeaseTenantRefCopyWithImpl;
@override @useResult
$Res call({
 String id, String displayName, String primaryPhone
});




}
/// @nodoc
class __$LeaseTenantRefCopyWithImpl<$Res>
    implements _$LeaseTenantRefCopyWith<$Res> {
  __$LeaseTenantRefCopyWithImpl(this._self, this._then);

  final _LeaseTenantRef _self;
  final $Res Function(_LeaseTenantRef) _then;

/// Create a copy of LeaseTenantRef
/// with the given fields replaced by the non-null parameter values.
@override @pragma('vm:prefer-inline') $Res call({Object? id = null,Object? displayName = null,Object? primaryPhone = null,}) {
  return _then(_LeaseTenantRef(
id: null == id ? _self.id : id // ignore: cast_nullable_to_non_nullable
as String,displayName: null == displayName ? _self.displayName : displayName // ignore: cast_nullable_to_non_nullable
as String,primaryPhone: null == primaryPhone ? _self.primaryPhone : primaryPhone // ignore: cast_nullable_to_non_nullable
as String,
  ));
}


}


/// @nodoc
mixin _$LeaseSummary {

 String get id; String? get reference; LeaseStatus get status; LeaseUnitRef get unit; LeasePropertyRef get property; LeaseTenantRef get tenant; String get startDate; String? get endDate; int get rentAmount; int get chargesAmount; int get paymentDueDay;
/// Create a copy of LeaseSummary
/// with the given fields replaced by the non-null parameter values.
@JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
$LeaseSummaryCopyWith<LeaseSummary> get copyWith => _$LeaseSummaryCopyWithImpl<LeaseSummary>(this as LeaseSummary, _$identity);

  /// Serializes this LeaseSummary to a JSON map.
  Map<String, dynamic> toJson();


@override
bool operator ==(Object other) {
  return identical(this, other) || (other.runtimeType == runtimeType&&other is LeaseSummary&&(identical(other.id, id) || other.id == id)&&(identical(other.reference, reference) || other.reference == reference)&&(identical(other.status, status) || other.status == status)&&(identical(other.unit, unit) || other.unit == unit)&&(identical(other.property, property) || other.property == property)&&(identical(other.tenant, tenant) || other.tenant == tenant)&&(identical(other.startDate, startDate) || other.startDate == startDate)&&(identical(other.endDate, endDate) || other.endDate == endDate)&&(identical(other.rentAmount, rentAmount) || other.rentAmount == rentAmount)&&(identical(other.chargesAmount, chargesAmount) || other.chargesAmount == chargesAmount)&&(identical(other.paymentDueDay, paymentDueDay) || other.paymentDueDay == paymentDueDay));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode => Object.hash(runtimeType,id,reference,status,unit,property,tenant,startDate,endDate,rentAmount,chargesAmount,paymentDueDay);

@override
String toString() {
  return 'LeaseSummary(id: $id, reference: $reference, status: $status, unit: $unit, property: $property, tenant: $tenant, startDate: $startDate, endDate: $endDate, rentAmount: $rentAmount, chargesAmount: $chargesAmount, paymentDueDay: $paymentDueDay)';
}


}

/// @nodoc
abstract mixin class $LeaseSummaryCopyWith<$Res>  {
  factory $LeaseSummaryCopyWith(LeaseSummary value, $Res Function(LeaseSummary) _then) = _$LeaseSummaryCopyWithImpl;
@useResult
$Res call({
 String id, String? reference, LeaseStatus status, LeaseUnitRef unit, LeasePropertyRef property, LeaseTenantRef tenant, String startDate, String? endDate, int rentAmount, int chargesAmount, int paymentDueDay
});


$LeaseUnitRefCopyWith<$Res> get unit;$LeasePropertyRefCopyWith<$Res> get property;$LeaseTenantRefCopyWith<$Res> get tenant;

}
/// @nodoc
class _$LeaseSummaryCopyWithImpl<$Res>
    implements $LeaseSummaryCopyWith<$Res> {
  _$LeaseSummaryCopyWithImpl(this._self, this._then);

  final LeaseSummary _self;
  final $Res Function(LeaseSummary) _then;

/// Create a copy of LeaseSummary
/// with the given fields replaced by the non-null parameter values.
@pragma('vm:prefer-inline') @override $Res call({Object? id = null,Object? reference = freezed,Object? status = null,Object? unit = null,Object? property = null,Object? tenant = null,Object? startDate = null,Object? endDate = freezed,Object? rentAmount = null,Object? chargesAmount = null,Object? paymentDueDay = null,}) {
  return _then(_self.copyWith(
id: null == id ? _self.id : id // ignore: cast_nullable_to_non_nullable
as String,reference: freezed == reference ? _self.reference : reference // ignore: cast_nullable_to_non_nullable
as String?,status: null == status ? _self.status : status // ignore: cast_nullable_to_non_nullable
as LeaseStatus,unit: null == unit ? _self.unit : unit // ignore: cast_nullable_to_non_nullable
as LeaseUnitRef,property: null == property ? _self.property : property // ignore: cast_nullable_to_non_nullable
as LeasePropertyRef,tenant: null == tenant ? _self.tenant : tenant // ignore: cast_nullable_to_non_nullable
as LeaseTenantRef,startDate: null == startDate ? _self.startDate : startDate // ignore: cast_nullable_to_non_nullable
as String,endDate: freezed == endDate ? _self.endDate : endDate // ignore: cast_nullable_to_non_nullable
as String?,rentAmount: null == rentAmount ? _self.rentAmount : rentAmount // ignore: cast_nullable_to_non_nullable
as int,chargesAmount: null == chargesAmount ? _self.chargesAmount : chargesAmount // ignore: cast_nullable_to_non_nullable
as int,paymentDueDay: null == paymentDueDay ? _self.paymentDueDay : paymentDueDay // ignore: cast_nullable_to_non_nullable
as int,
  ));
}
/// Create a copy of LeaseSummary
/// with the given fields replaced by the non-null parameter values.
@override
@pragma('vm:prefer-inline')
$LeaseUnitRefCopyWith<$Res> get unit {
  
  return $LeaseUnitRefCopyWith<$Res>(_self.unit, (value) {
    return _then(_self.copyWith(unit: value));
  });
}/// Create a copy of LeaseSummary
/// with the given fields replaced by the non-null parameter values.
@override
@pragma('vm:prefer-inline')
$LeasePropertyRefCopyWith<$Res> get property {
  
  return $LeasePropertyRefCopyWith<$Res>(_self.property, (value) {
    return _then(_self.copyWith(property: value));
  });
}/// Create a copy of LeaseSummary
/// with the given fields replaced by the non-null parameter values.
@override
@pragma('vm:prefer-inline')
$LeaseTenantRefCopyWith<$Res> get tenant {
  
  return $LeaseTenantRefCopyWith<$Res>(_self.tenant, (value) {
    return _then(_self.copyWith(tenant: value));
  });
}
}


/// Adds pattern-matching-related methods to [LeaseSummary].
extension LeaseSummaryPatterns on LeaseSummary {
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

@optionalTypeArgs TResult maybeMap<TResult extends Object?>(TResult Function( _LeaseSummary value)?  $default,{required TResult orElse(),}){
final _that = this;
switch (_that) {
case _LeaseSummary() when $default != null:
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

@optionalTypeArgs TResult map<TResult extends Object?>(TResult Function( _LeaseSummary value)  $default,){
final _that = this;
switch (_that) {
case _LeaseSummary():
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

@optionalTypeArgs TResult? mapOrNull<TResult extends Object?>(TResult? Function( _LeaseSummary value)?  $default,){
final _that = this;
switch (_that) {
case _LeaseSummary() when $default != null:
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

@optionalTypeArgs TResult maybeWhen<TResult extends Object?>(TResult Function( String id,  String? reference,  LeaseStatus status,  LeaseUnitRef unit,  LeasePropertyRef property,  LeaseTenantRef tenant,  String startDate,  String? endDate,  int rentAmount,  int chargesAmount,  int paymentDueDay)?  $default,{required TResult orElse(),}) {final _that = this;
switch (_that) {
case _LeaseSummary() when $default != null:
return $default(_that.id,_that.reference,_that.status,_that.unit,_that.property,_that.tenant,_that.startDate,_that.endDate,_that.rentAmount,_that.chargesAmount,_that.paymentDueDay);case _:
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

@optionalTypeArgs TResult when<TResult extends Object?>(TResult Function( String id,  String? reference,  LeaseStatus status,  LeaseUnitRef unit,  LeasePropertyRef property,  LeaseTenantRef tenant,  String startDate,  String? endDate,  int rentAmount,  int chargesAmount,  int paymentDueDay)  $default,) {final _that = this;
switch (_that) {
case _LeaseSummary():
return $default(_that.id,_that.reference,_that.status,_that.unit,_that.property,_that.tenant,_that.startDate,_that.endDate,_that.rentAmount,_that.chargesAmount,_that.paymentDueDay);case _:
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

@optionalTypeArgs TResult? whenOrNull<TResult extends Object?>(TResult? Function( String id,  String? reference,  LeaseStatus status,  LeaseUnitRef unit,  LeasePropertyRef property,  LeaseTenantRef tenant,  String startDate,  String? endDate,  int rentAmount,  int chargesAmount,  int paymentDueDay)?  $default,) {final _that = this;
switch (_that) {
case _LeaseSummary() when $default != null:
return $default(_that.id,_that.reference,_that.status,_that.unit,_that.property,_that.tenant,_that.startDate,_that.endDate,_that.rentAmount,_that.chargesAmount,_that.paymentDueDay);case _:
  return null;

}
}

}

/// @nodoc
@JsonSerializable()

class _LeaseSummary implements LeaseSummary {
  const _LeaseSummary({required this.id, this.reference, required this.status, required this.unit, required this.property, required this.tenant, required this.startDate, this.endDate, required this.rentAmount, this.chargesAmount = 0, required this.paymentDueDay});
  factory _LeaseSummary.fromJson(Map<String, dynamic> json) => _$LeaseSummaryFromJson(json);

@override final  String id;
@override final  String? reference;
@override final  LeaseStatus status;
@override final  LeaseUnitRef unit;
@override final  LeasePropertyRef property;
@override final  LeaseTenantRef tenant;
@override final  String startDate;
@override final  String? endDate;
@override final  int rentAmount;
@override@JsonKey() final  int chargesAmount;
@override final  int paymentDueDay;

/// Create a copy of LeaseSummary
/// with the given fields replaced by the non-null parameter values.
@override @JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
_$LeaseSummaryCopyWith<_LeaseSummary> get copyWith => __$LeaseSummaryCopyWithImpl<_LeaseSummary>(this, _$identity);

@override
Map<String, dynamic> toJson() {
  return _$LeaseSummaryToJson(this, );
}

@override
bool operator ==(Object other) {
  return identical(this, other) || (other.runtimeType == runtimeType&&other is _LeaseSummary&&(identical(other.id, id) || other.id == id)&&(identical(other.reference, reference) || other.reference == reference)&&(identical(other.status, status) || other.status == status)&&(identical(other.unit, unit) || other.unit == unit)&&(identical(other.property, property) || other.property == property)&&(identical(other.tenant, tenant) || other.tenant == tenant)&&(identical(other.startDate, startDate) || other.startDate == startDate)&&(identical(other.endDate, endDate) || other.endDate == endDate)&&(identical(other.rentAmount, rentAmount) || other.rentAmount == rentAmount)&&(identical(other.chargesAmount, chargesAmount) || other.chargesAmount == chargesAmount)&&(identical(other.paymentDueDay, paymentDueDay) || other.paymentDueDay == paymentDueDay));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode => Object.hash(runtimeType,id,reference,status,unit,property,tenant,startDate,endDate,rentAmount,chargesAmount,paymentDueDay);

@override
String toString() {
  return 'LeaseSummary(id: $id, reference: $reference, status: $status, unit: $unit, property: $property, tenant: $tenant, startDate: $startDate, endDate: $endDate, rentAmount: $rentAmount, chargesAmount: $chargesAmount, paymentDueDay: $paymentDueDay)';
}


}

/// @nodoc
abstract mixin class _$LeaseSummaryCopyWith<$Res> implements $LeaseSummaryCopyWith<$Res> {
  factory _$LeaseSummaryCopyWith(_LeaseSummary value, $Res Function(_LeaseSummary) _then) = __$LeaseSummaryCopyWithImpl;
@override @useResult
$Res call({
 String id, String? reference, LeaseStatus status, LeaseUnitRef unit, LeasePropertyRef property, LeaseTenantRef tenant, String startDate, String? endDate, int rentAmount, int chargesAmount, int paymentDueDay
});


@override $LeaseUnitRefCopyWith<$Res> get unit;@override $LeasePropertyRefCopyWith<$Res> get property;@override $LeaseTenantRefCopyWith<$Res> get tenant;

}
/// @nodoc
class __$LeaseSummaryCopyWithImpl<$Res>
    implements _$LeaseSummaryCopyWith<$Res> {
  __$LeaseSummaryCopyWithImpl(this._self, this._then);

  final _LeaseSummary _self;
  final $Res Function(_LeaseSummary) _then;

/// Create a copy of LeaseSummary
/// with the given fields replaced by the non-null parameter values.
@override @pragma('vm:prefer-inline') $Res call({Object? id = null,Object? reference = freezed,Object? status = null,Object? unit = null,Object? property = null,Object? tenant = null,Object? startDate = null,Object? endDate = freezed,Object? rentAmount = null,Object? chargesAmount = null,Object? paymentDueDay = null,}) {
  return _then(_LeaseSummary(
id: null == id ? _self.id : id // ignore: cast_nullable_to_non_nullable
as String,reference: freezed == reference ? _self.reference : reference // ignore: cast_nullable_to_non_nullable
as String?,status: null == status ? _self.status : status // ignore: cast_nullable_to_non_nullable
as LeaseStatus,unit: null == unit ? _self.unit : unit // ignore: cast_nullable_to_non_nullable
as LeaseUnitRef,property: null == property ? _self.property : property // ignore: cast_nullable_to_non_nullable
as LeasePropertyRef,tenant: null == tenant ? _self.tenant : tenant // ignore: cast_nullable_to_non_nullable
as LeaseTenantRef,startDate: null == startDate ? _self.startDate : startDate // ignore: cast_nullable_to_non_nullable
as String,endDate: freezed == endDate ? _self.endDate : endDate // ignore: cast_nullable_to_non_nullable
as String?,rentAmount: null == rentAmount ? _self.rentAmount : rentAmount // ignore: cast_nullable_to_non_nullable
as int,chargesAmount: null == chargesAmount ? _self.chargesAmount : chargesAmount // ignore: cast_nullable_to_non_nullable
as int,paymentDueDay: null == paymentDueDay ? _self.paymentDueDay : paymentDueDay // ignore: cast_nullable_to_non_nullable
as int,
  ));
}

/// Create a copy of LeaseSummary
/// with the given fields replaced by the non-null parameter values.
@override
@pragma('vm:prefer-inline')
$LeaseUnitRefCopyWith<$Res> get unit {
  
  return $LeaseUnitRefCopyWith<$Res>(_self.unit, (value) {
    return _then(_self.copyWith(unit: value));
  });
}/// Create a copy of LeaseSummary
/// with the given fields replaced by the non-null parameter values.
@override
@pragma('vm:prefer-inline')
$LeasePropertyRefCopyWith<$Res> get property {
  
  return $LeasePropertyRefCopyWith<$Res>(_self.property, (value) {
    return _then(_self.copyWith(property: value));
  });
}/// Create a copy of LeaseSummary
/// with the given fields replaced by the non-null parameter values.
@override
@pragma('vm:prefer-inline')
$LeaseTenantRefCopyWith<$Res> get tenant {
  
  return $LeaseTenantRefCopyWith<$Res>(_self.tenant, (value) {
    return _then(_self.copyWith(tenant: value));
  });
}
}

// dart format on
