// GENERATED CODE - DO NOT MODIFY BY HAND
// coverage:ignore-file
// ignore_for_file: type=lint
// ignore_for_file: unused_element, deprecated_member_use, deprecated_member_use_from_same_package, use_function_type_syntax_for_parameters, unnecessary_const, avoid_init_to_null, invalid_override_different_default_values_named, prefer_expression_function_bodies, annotate_overrides, invalid_annotation_target, unnecessary_question_mark

part of 'invoice_summary.dart';

// **************************************************************************
// FreezedGenerator
// **************************************************************************

// dart format off
T _$identity<T>(T value) => value;

/// @nodoc
mixin _$InvoiceLeaseRef {

 String get id; String? get reference;
/// Create a copy of InvoiceLeaseRef
/// with the given fields replaced by the non-null parameter values.
@JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
$InvoiceLeaseRefCopyWith<InvoiceLeaseRef> get copyWith => _$InvoiceLeaseRefCopyWithImpl<InvoiceLeaseRef>(this as InvoiceLeaseRef, _$identity);

  /// Serializes this InvoiceLeaseRef to a JSON map.
  Map<String, dynamic> toJson();


@override
bool operator ==(Object other) {
  return identical(this, other) || (other.runtimeType == runtimeType&&other is InvoiceLeaseRef&&(identical(other.id, id) || other.id == id)&&(identical(other.reference, reference) || other.reference == reference));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode => Object.hash(runtimeType,id,reference);

@override
String toString() {
  return 'InvoiceLeaseRef(id: $id, reference: $reference)';
}


}

/// @nodoc
abstract mixin class $InvoiceLeaseRefCopyWith<$Res>  {
  factory $InvoiceLeaseRefCopyWith(InvoiceLeaseRef value, $Res Function(InvoiceLeaseRef) _then) = _$InvoiceLeaseRefCopyWithImpl;
@useResult
$Res call({
 String id, String? reference
});




}
/// @nodoc
class _$InvoiceLeaseRefCopyWithImpl<$Res>
    implements $InvoiceLeaseRefCopyWith<$Res> {
  _$InvoiceLeaseRefCopyWithImpl(this._self, this._then);

  final InvoiceLeaseRef _self;
  final $Res Function(InvoiceLeaseRef) _then;

/// Create a copy of InvoiceLeaseRef
/// with the given fields replaced by the non-null parameter values.
@pragma('vm:prefer-inline') @override $Res call({Object? id = null,Object? reference = freezed,}) {
  return _then(_self.copyWith(
id: null == id ? _self.id : id // ignore: cast_nullable_to_non_nullable
as String,reference: freezed == reference ? _self.reference : reference // ignore: cast_nullable_to_non_nullable
as String?,
  ));
}

}


/// Adds pattern-matching-related methods to [InvoiceLeaseRef].
extension InvoiceLeaseRefPatterns on InvoiceLeaseRef {
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

@optionalTypeArgs TResult maybeMap<TResult extends Object?>(TResult Function( _InvoiceLeaseRef value)?  $default,{required TResult orElse(),}){
final _that = this;
switch (_that) {
case _InvoiceLeaseRef() when $default != null:
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

@optionalTypeArgs TResult map<TResult extends Object?>(TResult Function( _InvoiceLeaseRef value)  $default,){
final _that = this;
switch (_that) {
case _InvoiceLeaseRef():
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

@optionalTypeArgs TResult? mapOrNull<TResult extends Object?>(TResult? Function( _InvoiceLeaseRef value)?  $default,){
final _that = this;
switch (_that) {
case _InvoiceLeaseRef() when $default != null:
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

@optionalTypeArgs TResult maybeWhen<TResult extends Object?>(TResult Function( String id,  String? reference)?  $default,{required TResult orElse(),}) {final _that = this;
switch (_that) {
case _InvoiceLeaseRef() when $default != null:
return $default(_that.id,_that.reference);case _:
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

@optionalTypeArgs TResult when<TResult extends Object?>(TResult Function( String id,  String? reference)  $default,) {final _that = this;
switch (_that) {
case _InvoiceLeaseRef():
return $default(_that.id,_that.reference);case _:
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

@optionalTypeArgs TResult? whenOrNull<TResult extends Object?>(TResult? Function( String id,  String? reference)?  $default,) {final _that = this;
switch (_that) {
case _InvoiceLeaseRef() when $default != null:
return $default(_that.id,_that.reference);case _:
  return null;

}
}

}

/// @nodoc
@JsonSerializable()

class _InvoiceLeaseRef implements InvoiceLeaseRef {
  const _InvoiceLeaseRef({required this.id, this.reference});
  factory _InvoiceLeaseRef.fromJson(Map<String, dynamic> json) => _$InvoiceLeaseRefFromJson(json);

@override final  String id;
@override final  String? reference;

/// Create a copy of InvoiceLeaseRef
/// with the given fields replaced by the non-null parameter values.
@override @JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
_$InvoiceLeaseRefCopyWith<_InvoiceLeaseRef> get copyWith => __$InvoiceLeaseRefCopyWithImpl<_InvoiceLeaseRef>(this, _$identity);

@override
Map<String, dynamic> toJson() {
  return _$InvoiceLeaseRefToJson(this, );
}

@override
bool operator ==(Object other) {
  return identical(this, other) || (other.runtimeType == runtimeType&&other is _InvoiceLeaseRef&&(identical(other.id, id) || other.id == id)&&(identical(other.reference, reference) || other.reference == reference));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode => Object.hash(runtimeType,id,reference);

@override
String toString() {
  return 'InvoiceLeaseRef(id: $id, reference: $reference)';
}


}

/// @nodoc
abstract mixin class _$InvoiceLeaseRefCopyWith<$Res> implements $InvoiceLeaseRefCopyWith<$Res> {
  factory _$InvoiceLeaseRefCopyWith(_InvoiceLeaseRef value, $Res Function(_InvoiceLeaseRef) _then) = __$InvoiceLeaseRefCopyWithImpl;
@override @useResult
$Res call({
 String id, String? reference
});




}
/// @nodoc
class __$InvoiceLeaseRefCopyWithImpl<$Res>
    implements _$InvoiceLeaseRefCopyWith<$Res> {
  __$InvoiceLeaseRefCopyWithImpl(this._self, this._then);

  final _InvoiceLeaseRef _self;
  final $Res Function(_InvoiceLeaseRef) _then;

/// Create a copy of InvoiceLeaseRef
/// with the given fields replaced by the non-null parameter values.
@override @pragma('vm:prefer-inline') $Res call({Object? id = null,Object? reference = freezed,}) {
  return _then(_InvoiceLeaseRef(
id: null == id ? _self.id : id // ignore: cast_nullable_to_non_nullable
as String,reference: freezed == reference ? _self.reference : reference // ignore: cast_nullable_to_non_nullable
as String?,
  ));
}


}


/// @nodoc
mixin _$InvoiceTenantRef {

 String get id; String get displayName; String get primaryPhone;
/// Create a copy of InvoiceTenantRef
/// with the given fields replaced by the non-null parameter values.
@JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
$InvoiceTenantRefCopyWith<InvoiceTenantRef> get copyWith => _$InvoiceTenantRefCopyWithImpl<InvoiceTenantRef>(this as InvoiceTenantRef, _$identity);

  /// Serializes this InvoiceTenantRef to a JSON map.
  Map<String, dynamic> toJson();


@override
bool operator ==(Object other) {
  return identical(this, other) || (other.runtimeType == runtimeType&&other is InvoiceTenantRef&&(identical(other.id, id) || other.id == id)&&(identical(other.displayName, displayName) || other.displayName == displayName)&&(identical(other.primaryPhone, primaryPhone) || other.primaryPhone == primaryPhone));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode => Object.hash(runtimeType,id,displayName,primaryPhone);

@override
String toString() {
  return 'InvoiceTenantRef(id: $id, displayName: $displayName, primaryPhone: $primaryPhone)';
}


}

/// @nodoc
abstract mixin class $InvoiceTenantRefCopyWith<$Res>  {
  factory $InvoiceTenantRefCopyWith(InvoiceTenantRef value, $Res Function(InvoiceTenantRef) _then) = _$InvoiceTenantRefCopyWithImpl;
@useResult
$Res call({
 String id, String displayName, String primaryPhone
});




}
/// @nodoc
class _$InvoiceTenantRefCopyWithImpl<$Res>
    implements $InvoiceTenantRefCopyWith<$Res> {
  _$InvoiceTenantRefCopyWithImpl(this._self, this._then);

  final InvoiceTenantRef _self;
  final $Res Function(InvoiceTenantRef) _then;

/// Create a copy of InvoiceTenantRef
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


/// Adds pattern-matching-related methods to [InvoiceTenantRef].
extension InvoiceTenantRefPatterns on InvoiceTenantRef {
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

@optionalTypeArgs TResult maybeMap<TResult extends Object?>(TResult Function( _InvoiceTenantRef value)?  $default,{required TResult orElse(),}){
final _that = this;
switch (_that) {
case _InvoiceTenantRef() when $default != null:
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

@optionalTypeArgs TResult map<TResult extends Object?>(TResult Function( _InvoiceTenantRef value)  $default,){
final _that = this;
switch (_that) {
case _InvoiceTenantRef():
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

@optionalTypeArgs TResult? mapOrNull<TResult extends Object?>(TResult? Function( _InvoiceTenantRef value)?  $default,){
final _that = this;
switch (_that) {
case _InvoiceTenantRef() when $default != null:
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
case _InvoiceTenantRef() when $default != null:
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
case _InvoiceTenantRef():
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
case _InvoiceTenantRef() when $default != null:
return $default(_that.id,_that.displayName,_that.primaryPhone);case _:
  return null;

}
}

}

/// @nodoc
@JsonSerializable()

class _InvoiceTenantRef implements InvoiceTenantRef {
  const _InvoiceTenantRef({required this.id, required this.displayName, required this.primaryPhone});
  factory _InvoiceTenantRef.fromJson(Map<String, dynamic> json) => _$InvoiceTenantRefFromJson(json);

@override final  String id;
@override final  String displayName;
@override final  String primaryPhone;

/// Create a copy of InvoiceTenantRef
/// with the given fields replaced by the non-null parameter values.
@override @JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
_$InvoiceTenantRefCopyWith<_InvoiceTenantRef> get copyWith => __$InvoiceTenantRefCopyWithImpl<_InvoiceTenantRef>(this, _$identity);

@override
Map<String, dynamic> toJson() {
  return _$InvoiceTenantRefToJson(this, );
}

@override
bool operator ==(Object other) {
  return identical(this, other) || (other.runtimeType == runtimeType&&other is _InvoiceTenantRef&&(identical(other.id, id) || other.id == id)&&(identical(other.displayName, displayName) || other.displayName == displayName)&&(identical(other.primaryPhone, primaryPhone) || other.primaryPhone == primaryPhone));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode => Object.hash(runtimeType,id,displayName,primaryPhone);

@override
String toString() {
  return 'InvoiceTenantRef(id: $id, displayName: $displayName, primaryPhone: $primaryPhone)';
}


}

/// @nodoc
abstract mixin class _$InvoiceTenantRefCopyWith<$Res> implements $InvoiceTenantRefCopyWith<$Res> {
  factory _$InvoiceTenantRefCopyWith(_InvoiceTenantRef value, $Res Function(_InvoiceTenantRef) _then) = __$InvoiceTenantRefCopyWithImpl;
@override @useResult
$Res call({
 String id, String displayName, String primaryPhone
});




}
/// @nodoc
class __$InvoiceTenantRefCopyWithImpl<$Res>
    implements _$InvoiceTenantRefCopyWith<$Res> {
  __$InvoiceTenantRefCopyWithImpl(this._self, this._then);

  final _InvoiceTenantRef _self;
  final $Res Function(_InvoiceTenantRef) _then;

/// Create a copy of InvoiceTenantRef
/// with the given fields replaced by the non-null parameter values.
@override @pragma('vm:prefer-inline') $Res call({Object? id = null,Object? displayName = null,Object? primaryPhone = null,}) {
  return _then(_InvoiceTenantRef(
id: null == id ? _self.id : id // ignore: cast_nullable_to_non_nullable
as String,displayName: null == displayName ? _self.displayName : displayName // ignore: cast_nullable_to_non_nullable
as String,primaryPhone: null == primaryPhone ? _self.primaryPhone : primaryPhone // ignore: cast_nullable_to_non_nullable
as String,
  ));
}


}


/// @nodoc
mixin _$InvoiceUnitRef {

 String get id; String get code;
/// Create a copy of InvoiceUnitRef
/// with the given fields replaced by the non-null parameter values.
@JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
$InvoiceUnitRefCopyWith<InvoiceUnitRef> get copyWith => _$InvoiceUnitRefCopyWithImpl<InvoiceUnitRef>(this as InvoiceUnitRef, _$identity);

  /// Serializes this InvoiceUnitRef to a JSON map.
  Map<String, dynamic> toJson();


@override
bool operator ==(Object other) {
  return identical(this, other) || (other.runtimeType == runtimeType&&other is InvoiceUnitRef&&(identical(other.id, id) || other.id == id)&&(identical(other.code, code) || other.code == code));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode => Object.hash(runtimeType,id,code);

@override
String toString() {
  return 'InvoiceUnitRef(id: $id, code: $code)';
}


}

/// @nodoc
abstract mixin class $InvoiceUnitRefCopyWith<$Res>  {
  factory $InvoiceUnitRefCopyWith(InvoiceUnitRef value, $Res Function(InvoiceUnitRef) _then) = _$InvoiceUnitRefCopyWithImpl;
@useResult
$Res call({
 String id, String code
});




}
/// @nodoc
class _$InvoiceUnitRefCopyWithImpl<$Res>
    implements $InvoiceUnitRefCopyWith<$Res> {
  _$InvoiceUnitRefCopyWithImpl(this._self, this._then);

  final InvoiceUnitRef _self;
  final $Res Function(InvoiceUnitRef) _then;

/// Create a copy of InvoiceUnitRef
/// with the given fields replaced by the non-null parameter values.
@pragma('vm:prefer-inline') @override $Res call({Object? id = null,Object? code = null,}) {
  return _then(_self.copyWith(
id: null == id ? _self.id : id // ignore: cast_nullable_to_non_nullable
as String,code: null == code ? _self.code : code // ignore: cast_nullable_to_non_nullable
as String,
  ));
}

}


/// Adds pattern-matching-related methods to [InvoiceUnitRef].
extension InvoiceUnitRefPatterns on InvoiceUnitRef {
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

@optionalTypeArgs TResult maybeMap<TResult extends Object?>(TResult Function( _InvoiceUnitRef value)?  $default,{required TResult orElse(),}){
final _that = this;
switch (_that) {
case _InvoiceUnitRef() when $default != null:
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

@optionalTypeArgs TResult map<TResult extends Object?>(TResult Function( _InvoiceUnitRef value)  $default,){
final _that = this;
switch (_that) {
case _InvoiceUnitRef():
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

@optionalTypeArgs TResult? mapOrNull<TResult extends Object?>(TResult? Function( _InvoiceUnitRef value)?  $default,){
final _that = this;
switch (_that) {
case _InvoiceUnitRef() when $default != null:
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

@optionalTypeArgs TResult maybeWhen<TResult extends Object?>(TResult Function( String id,  String code)?  $default,{required TResult orElse(),}) {final _that = this;
switch (_that) {
case _InvoiceUnitRef() when $default != null:
return $default(_that.id,_that.code);case _:
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

@optionalTypeArgs TResult when<TResult extends Object?>(TResult Function( String id,  String code)  $default,) {final _that = this;
switch (_that) {
case _InvoiceUnitRef():
return $default(_that.id,_that.code);case _:
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

@optionalTypeArgs TResult? whenOrNull<TResult extends Object?>(TResult? Function( String id,  String code)?  $default,) {final _that = this;
switch (_that) {
case _InvoiceUnitRef() when $default != null:
return $default(_that.id,_that.code);case _:
  return null;

}
}

}

/// @nodoc
@JsonSerializable()

class _InvoiceUnitRef implements InvoiceUnitRef {
  const _InvoiceUnitRef({required this.id, required this.code});
  factory _InvoiceUnitRef.fromJson(Map<String, dynamic> json) => _$InvoiceUnitRefFromJson(json);

@override final  String id;
@override final  String code;

/// Create a copy of InvoiceUnitRef
/// with the given fields replaced by the non-null parameter values.
@override @JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
_$InvoiceUnitRefCopyWith<_InvoiceUnitRef> get copyWith => __$InvoiceUnitRefCopyWithImpl<_InvoiceUnitRef>(this, _$identity);

@override
Map<String, dynamic> toJson() {
  return _$InvoiceUnitRefToJson(this, );
}

@override
bool operator ==(Object other) {
  return identical(this, other) || (other.runtimeType == runtimeType&&other is _InvoiceUnitRef&&(identical(other.id, id) || other.id == id)&&(identical(other.code, code) || other.code == code));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode => Object.hash(runtimeType,id,code);

@override
String toString() {
  return 'InvoiceUnitRef(id: $id, code: $code)';
}


}

/// @nodoc
abstract mixin class _$InvoiceUnitRefCopyWith<$Res> implements $InvoiceUnitRefCopyWith<$Res> {
  factory _$InvoiceUnitRefCopyWith(_InvoiceUnitRef value, $Res Function(_InvoiceUnitRef) _then) = __$InvoiceUnitRefCopyWithImpl;
@override @useResult
$Res call({
 String id, String code
});




}
/// @nodoc
class __$InvoiceUnitRefCopyWithImpl<$Res>
    implements _$InvoiceUnitRefCopyWith<$Res> {
  __$InvoiceUnitRefCopyWithImpl(this._self, this._then);

  final _InvoiceUnitRef _self;
  final $Res Function(_InvoiceUnitRef) _then;

/// Create a copy of InvoiceUnitRef
/// with the given fields replaced by the non-null parameter values.
@override @pragma('vm:prefer-inline') $Res call({Object? id = null,Object? code = null,}) {
  return _then(_InvoiceUnitRef(
id: null == id ? _self.id : id // ignore: cast_nullable_to_non_nullable
as String,code: null == code ? _self.code : code // ignore: cast_nullable_to_non_nullable
as String,
  ));
}


}


/// @nodoc
mixin _$InvoicePropertyRef {

 String get id; String get name;
/// Create a copy of InvoicePropertyRef
/// with the given fields replaced by the non-null parameter values.
@JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
$InvoicePropertyRefCopyWith<InvoicePropertyRef> get copyWith => _$InvoicePropertyRefCopyWithImpl<InvoicePropertyRef>(this as InvoicePropertyRef, _$identity);

  /// Serializes this InvoicePropertyRef to a JSON map.
  Map<String, dynamic> toJson();


@override
bool operator ==(Object other) {
  return identical(this, other) || (other.runtimeType == runtimeType&&other is InvoicePropertyRef&&(identical(other.id, id) || other.id == id)&&(identical(other.name, name) || other.name == name));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode => Object.hash(runtimeType,id,name);

@override
String toString() {
  return 'InvoicePropertyRef(id: $id, name: $name)';
}


}

/// @nodoc
abstract mixin class $InvoicePropertyRefCopyWith<$Res>  {
  factory $InvoicePropertyRefCopyWith(InvoicePropertyRef value, $Res Function(InvoicePropertyRef) _then) = _$InvoicePropertyRefCopyWithImpl;
@useResult
$Res call({
 String id, String name
});




}
/// @nodoc
class _$InvoicePropertyRefCopyWithImpl<$Res>
    implements $InvoicePropertyRefCopyWith<$Res> {
  _$InvoicePropertyRefCopyWithImpl(this._self, this._then);

  final InvoicePropertyRef _self;
  final $Res Function(InvoicePropertyRef) _then;

/// Create a copy of InvoicePropertyRef
/// with the given fields replaced by the non-null parameter values.
@pragma('vm:prefer-inline') @override $Res call({Object? id = null,Object? name = null,}) {
  return _then(_self.copyWith(
id: null == id ? _self.id : id // ignore: cast_nullable_to_non_nullable
as String,name: null == name ? _self.name : name // ignore: cast_nullable_to_non_nullable
as String,
  ));
}

}


/// Adds pattern-matching-related methods to [InvoicePropertyRef].
extension InvoicePropertyRefPatterns on InvoicePropertyRef {
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

@optionalTypeArgs TResult maybeMap<TResult extends Object?>(TResult Function( _InvoicePropertyRef value)?  $default,{required TResult orElse(),}){
final _that = this;
switch (_that) {
case _InvoicePropertyRef() when $default != null:
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

@optionalTypeArgs TResult map<TResult extends Object?>(TResult Function( _InvoicePropertyRef value)  $default,){
final _that = this;
switch (_that) {
case _InvoicePropertyRef():
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

@optionalTypeArgs TResult? mapOrNull<TResult extends Object?>(TResult? Function( _InvoicePropertyRef value)?  $default,){
final _that = this;
switch (_that) {
case _InvoicePropertyRef() when $default != null:
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
case _InvoicePropertyRef() when $default != null:
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
case _InvoicePropertyRef():
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
case _InvoicePropertyRef() when $default != null:
return $default(_that.id,_that.name);case _:
  return null;

}
}

}

/// @nodoc
@JsonSerializable()

class _InvoicePropertyRef implements InvoicePropertyRef {
  const _InvoicePropertyRef({required this.id, required this.name});
  factory _InvoicePropertyRef.fromJson(Map<String, dynamic> json) => _$InvoicePropertyRefFromJson(json);

@override final  String id;
@override final  String name;

/// Create a copy of InvoicePropertyRef
/// with the given fields replaced by the non-null parameter values.
@override @JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
_$InvoicePropertyRefCopyWith<_InvoicePropertyRef> get copyWith => __$InvoicePropertyRefCopyWithImpl<_InvoicePropertyRef>(this, _$identity);

@override
Map<String, dynamic> toJson() {
  return _$InvoicePropertyRefToJson(this, );
}

@override
bool operator ==(Object other) {
  return identical(this, other) || (other.runtimeType == runtimeType&&other is _InvoicePropertyRef&&(identical(other.id, id) || other.id == id)&&(identical(other.name, name) || other.name == name));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode => Object.hash(runtimeType,id,name);

@override
String toString() {
  return 'InvoicePropertyRef(id: $id, name: $name)';
}


}

/// @nodoc
abstract mixin class _$InvoicePropertyRefCopyWith<$Res> implements $InvoicePropertyRefCopyWith<$Res> {
  factory _$InvoicePropertyRefCopyWith(_InvoicePropertyRef value, $Res Function(_InvoicePropertyRef) _then) = __$InvoicePropertyRefCopyWithImpl;
@override @useResult
$Res call({
 String id, String name
});




}
/// @nodoc
class __$InvoicePropertyRefCopyWithImpl<$Res>
    implements _$InvoicePropertyRefCopyWith<$Res> {
  __$InvoicePropertyRefCopyWithImpl(this._self, this._then);

  final _InvoicePropertyRef _self;
  final $Res Function(_InvoicePropertyRef) _then;

/// Create a copy of InvoicePropertyRef
/// with the given fields replaced by the non-null parameter values.
@override @pragma('vm:prefer-inline') $Res call({Object? id = null,Object? name = null,}) {
  return _then(_InvoicePropertyRef(
id: null == id ? _self.id : id // ignore: cast_nullable_to_non_nullable
as String,name: null == name ? _self.name : name // ignore: cast_nullable_to_non_nullable
as String,
  ));
}


}


/// @nodoc
mixin _$InvoiceSummary {

 String get id; String? get invoiceNumber; InvoiceStatus get status; InvoiceLeaseRef get lease; InvoiceTenantRef get tenant; InvoiceUnitRef get unit; InvoicePropertyRef get property; String get periodStart; String get periodEnd; String get dueDate; String? get graceUntilDate; int get totalAmount; int get paidAmount; int get balanceAmount;
/// Create a copy of InvoiceSummary
/// with the given fields replaced by the non-null parameter values.
@JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
$InvoiceSummaryCopyWith<InvoiceSummary> get copyWith => _$InvoiceSummaryCopyWithImpl<InvoiceSummary>(this as InvoiceSummary, _$identity);

  /// Serializes this InvoiceSummary to a JSON map.
  Map<String, dynamic> toJson();


@override
bool operator ==(Object other) {
  return identical(this, other) || (other.runtimeType == runtimeType&&other is InvoiceSummary&&(identical(other.id, id) || other.id == id)&&(identical(other.invoiceNumber, invoiceNumber) || other.invoiceNumber == invoiceNumber)&&(identical(other.status, status) || other.status == status)&&(identical(other.lease, lease) || other.lease == lease)&&(identical(other.tenant, tenant) || other.tenant == tenant)&&(identical(other.unit, unit) || other.unit == unit)&&(identical(other.property, property) || other.property == property)&&(identical(other.periodStart, periodStart) || other.periodStart == periodStart)&&(identical(other.periodEnd, periodEnd) || other.periodEnd == periodEnd)&&(identical(other.dueDate, dueDate) || other.dueDate == dueDate)&&(identical(other.graceUntilDate, graceUntilDate) || other.graceUntilDate == graceUntilDate)&&(identical(other.totalAmount, totalAmount) || other.totalAmount == totalAmount)&&(identical(other.paidAmount, paidAmount) || other.paidAmount == paidAmount)&&(identical(other.balanceAmount, balanceAmount) || other.balanceAmount == balanceAmount));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode => Object.hash(runtimeType,id,invoiceNumber,status,lease,tenant,unit,property,periodStart,periodEnd,dueDate,graceUntilDate,totalAmount,paidAmount,balanceAmount);

@override
String toString() {
  return 'InvoiceSummary(id: $id, invoiceNumber: $invoiceNumber, status: $status, lease: $lease, tenant: $tenant, unit: $unit, property: $property, periodStart: $periodStart, periodEnd: $periodEnd, dueDate: $dueDate, graceUntilDate: $graceUntilDate, totalAmount: $totalAmount, paidAmount: $paidAmount, balanceAmount: $balanceAmount)';
}


}

/// @nodoc
abstract mixin class $InvoiceSummaryCopyWith<$Res>  {
  factory $InvoiceSummaryCopyWith(InvoiceSummary value, $Res Function(InvoiceSummary) _then) = _$InvoiceSummaryCopyWithImpl;
@useResult
$Res call({
 String id, String? invoiceNumber, InvoiceStatus status, InvoiceLeaseRef lease, InvoiceTenantRef tenant, InvoiceUnitRef unit, InvoicePropertyRef property, String periodStart, String periodEnd, String dueDate, String? graceUntilDate, int totalAmount, int paidAmount, int balanceAmount
});


$InvoiceLeaseRefCopyWith<$Res> get lease;$InvoiceTenantRefCopyWith<$Res> get tenant;$InvoiceUnitRefCopyWith<$Res> get unit;$InvoicePropertyRefCopyWith<$Res> get property;

}
/// @nodoc
class _$InvoiceSummaryCopyWithImpl<$Res>
    implements $InvoiceSummaryCopyWith<$Res> {
  _$InvoiceSummaryCopyWithImpl(this._self, this._then);

  final InvoiceSummary _self;
  final $Res Function(InvoiceSummary) _then;

/// Create a copy of InvoiceSummary
/// with the given fields replaced by the non-null parameter values.
@pragma('vm:prefer-inline') @override $Res call({Object? id = null,Object? invoiceNumber = freezed,Object? status = null,Object? lease = null,Object? tenant = null,Object? unit = null,Object? property = null,Object? periodStart = null,Object? periodEnd = null,Object? dueDate = null,Object? graceUntilDate = freezed,Object? totalAmount = null,Object? paidAmount = null,Object? balanceAmount = null,}) {
  return _then(_self.copyWith(
id: null == id ? _self.id : id // ignore: cast_nullable_to_non_nullable
as String,invoiceNumber: freezed == invoiceNumber ? _self.invoiceNumber : invoiceNumber // ignore: cast_nullable_to_non_nullable
as String?,status: null == status ? _self.status : status // ignore: cast_nullable_to_non_nullable
as InvoiceStatus,lease: null == lease ? _self.lease : lease // ignore: cast_nullable_to_non_nullable
as InvoiceLeaseRef,tenant: null == tenant ? _self.tenant : tenant // ignore: cast_nullable_to_non_nullable
as InvoiceTenantRef,unit: null == unit ? _self.unit : unit // ignore: cast_nullable_to_non_nullable
as InvoiceUnitRef,property: null == property ? _self.property : property // ignore: cast_nullable_to_non_nullable
as InvoicePropertyRef,periodStart: null == periodStart ? _self.periodStart : periodStart // ignore: cast_nullable_to_non_nullable
as String,periodEnd: null == periodEnd ? _self.periodEnd : periodEnd // ignore: cast_nullable_to_non_nullable
as String,dueDate: null == dueDate ? _self.dueDate : dueDate // ignore: cast_nullable_to_non_nullable
as String,graceUntilDate: freezed == graceUntilDate ? _self.graceUntilDate : graceUntilDate // ignore: cast_nullable_to_non_nullable
as String?,totalAmount: null == totalAmount ? _self.totalAmount : totalAmount // ignore: cast_nullable_to_non_nullable
as int,paidAmount: null == paidAmount ? _self.paidAmount : paidAmount // ignore: cast_nullable_to_non_nullable
as int,balanceAmount: null == balanceAmount ? _self.balanceAmount : balanceAmount // ignore: cast_nullable_to_non_nullable
as int,
  ));
}
/// Create a copy of InvoiceSummary
/// with the given fields replaced by the non-null parameter values.
@override
@pragma('vm:prefer-inline')
$InvoiceLeaseRefCopyWith<$Res> get lease {
  
  return $InvoiceLeaseRefCopyWith<$Res>(_self.lease, (value) {
    return _then(_self.copyWith(lease: value));
  });
}/// Create a copy of InvoiceSummary
/// with the given fields replaced by the non-null parameter values.
@override
@pragma('vm:prefer-inline')
$InvoiceTenantRefCopyWith<$Res> get tenant {
  
  return $InvoiceTenantRefCopyWith<$Res>(_self.tenant, (value) {
    return _then(_self.copyWith(tenant: value));
  });
}/// Create a copy of InvoiceSummary
/// with the given fields replaced by the non-null parameter values.
@override
@pragma('vm:prefer-inline')
$InvoiceUnitRefCopyWith<$Res> get unit {
  
  return $InvoiceUnitRefCopyWith<$Res>(_self.unit, (value) {
    return _then(_self.copyWith(unit: value));
  });
}/// Create a copy of InvoiceSummary
/// with the given fields replaced by the non-null parameter values.
@override
@pragma('vm:prefer-inline')
$InvoicePropertyRefCopyWith<$Res> get property {
  
  return $InvoicePropertyRefCopyWith<$Res>(_self.property, (value) {
    return _then(_self.copyWith(property: value));
  });
}
}


/// Adds pattern-matching-related methods to [InvoiceSummary].
extension InvoiceSummaryPatterns on InvoiceSummary {
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

@optionalTypeArgs TResult maybeMap<TResult extends Object?>(TResult Function( _InvoiceSummary value)?  $default,{required TResult orElse(),}){
final _that = this;
switch (_that) {
case _InvoiceSummary() when $default != null:
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

@optionalTypeArgs TResult map<TResult extends Object?>(TResult Function( _InvoiceSummary value)  $default,){
final _that = this;
switch (_that) {
case _InvoiceSummary():
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

@optionalTypeArgs TResult? mapOrNull<TResult extends Object?>(TResult? Function( _InvoiceSummary value)?  $default,){
final _that = this;
switch (_that) {
case _InvoiceSummary() when $default != null:
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

@optionalTypeArgs TResult maybeWhen<TResult extends Object?>(TResult Function( String id,  String? invoiceNumber,  InvoiceStatus status,  InvoiceLeaseRef lease,  InvoiceTenantRef tenant,  InvoiceUnitRef unit,  InvoicePropertyRef property,  String periodStart,  String periodEnd,  String dueDate,  String? graceUntilDate,  int totalAmount,  int paidAmount,  int balanceAmount)?  $default,{required TResult orElse(),}) {final _that = this;
switch (_that) {
case _InvoiceSummary() when $default != null:
return $default(_that.id,_that.invoiceNumber,_that.status,_that.lease,_that.tenant,_that.unit,_that.property,_that.periodStart,_that.periodEnd,_that.dueDate,_that.graceUntilDate,_that.totalAmount,_that.paidAmount,_that.balanceAmount);case _:
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

@optionalTypeArgs TResult when<TResult extends Object?>(TResult Function( String id,  String? invoiceNumber,  InvoiceStatus status,  InvoiceLeaseRef lease,  InvoiceTenantRef tenant,  InvoiceUnitRef unit,  InvoicePropertyRef property,  String periodStart,  String periodEnd,  String dueDate,  String? graceUntilDate,  int totalAmount,  int paidAmount,  int balanceAmount)  $default,) {final _that = this;
switch (_that) {
case _InvoiceSummary():
return $default(_that.id,_that.invoiceNumber,_that.status,_that.lease,_that.tenant,_that.unit,_that.property,_that.periodStart,_that.periodEnd,_that.dueDate,_that.graceUntilDate,_that.totalAmount,_that.paidAmount,_that.balanceAmount);case _:
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

@optionalTypeArgs TResult? whenOrNull<TResult extends Object?>(TResult? Function( String id,  String? invoiceNumber,  InvoiceStatus status,  InvoiceLeaseRef lease,  InvoiceTenantRef tenant,  InvoiceUnitRef unit,  InvoicePropertyRef property,  String periodStart,  String periodEnd,  String dueDate,  String? graceUntilDate,  int totalAmount,  int paidAmount,  int balanceAmount)?  $default,) {final _that = this;
switch (_that) {
case _InvoiceSummary() when $default != null:
return $default(_that.id,_that.invoiceNumber,_that.status,_that.lease,_that.tenant,_that.unit,_that.property,_that.periodStart,_that.periodEnd,_that.dueDate,_that.graceUntilDate,_that.totalAmount,_that.paidAmount,_that.balanceAmount);case _:
  return null;

}
}

}

/// @nodoc
@JsonSerializable()

class _InvoiceSummary implements InvoiceSummary {
  const _InvoiceSummary({required this.id, this.invoiceNumber, required this.status, required this.lease, required this.tenant, required this.unit, required this.property, required this.periodStart, required this.periodEnd, required this.dueDate, this.graceUntilDate, required this.totalAmount, required this.paidAmount, required this.balanceAmount});
  factory _InvoiceSummary.fromJson(Map<String, dynamic> json) => _$InvoiceSummaryFromJson(json);

@override final  String id;
@override final  String? invoiceNumber;
@override final  InvoiceStatus status;
@override final  InvoiceLeaseRef lease;
@override final  InvoiceTenantRef tenant;
@override final  InvoiceUnitRef unit;
@override final  InvoicePropertyRef property;
@override final  String periodStart;
@override final  String periodEnd;
@override final  String dueDate;
@override final  String? graceUntilDate;
@override final  int totalAmount;
@override final  int paidAmount;
@override final  int balanceAmount;

/// Create a copy of InvoiceSummary
/// with the given fields replaced by the non-null parameter values.
@override @JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
_$InvoiceSummaryCopyWith<_InvoiceSummary> get copyWith => __$InvoiceSummaryCopyWithImpl<_InvoiceSummary>(this, _$identity);

@override
Map<String, dynamic> toJson() {
  return _$InvoiceSummaryToJson(this, );
}

@override
bool operator ==(Object other) {
  return identical(this, other) || (other.runtimeType == runtimeType&&other is _InvoiceSummary&&(identical(other.id, id) || other.id == id)&&(identical(other.invoiceNumber, invoiceNumber) || other.invoiceNumber == invoiceNumber)&&(identical(other.status, status) || other.status == status)&&(identical(other.lease, lease) || other.lease == lease)&&(identical(other.tenant, tenant) || other.tenant == tenant)&&(identical(other.unit, unit) || other.unit == unit)&&(identical(other.property, property) || other.property == property)&&(identical(other.periodStart, periodStart) || other.periodStart == periodStart)&&(identical(other.periodEnd, periodEnd) || other.periodEnd == periodEnd)&&(identical(other.dueDate, dueDate) || other.dueDate == dueDate)&&(identical(other.graceUntilDate, graceUntilDate) || other.graceUntilDate == graceUntilDate)&&(identical(other.totalAmount, totalAmount) || other.totalAmount == totalAmount)&&(identical(other.paidAmount, paidAmount) || other.paidAmount == paidAmount)&&(identical(other.balanceAmount, balanceAmount) || other.balanceAmount == balanceAmount));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode => Object.hash(runtimeType,id,invoiceNumber,status,lease,tenant,unit,property,periodStart,periodEnd,dueDate,graceUntilDate,totalAmount,paidAmount,balanceAmount);

@override
String toString() {
  return 'InvoiceSummary(id: $id, invoiceNumber: $invoiceNumber, status: $status, lease: $lease, tenant: $tenant, unit: $unit, property: $property, periodStart: $periodStart, periodEnd: $periodEnd, dueDate: $dueDate, graceUntilDate: $graceUntilDate, totalAmount: $totalAmount, paidAmount: $paidAmount, balanceAmount: $balanceAmount)';
}


}

/// @nodoc
abstract mixin class _$InvoiceSummaryCopyWith<$Res> implements $InvoiceSummaryCopyWith<$Res> {
  factory _$InvoiceSummaryCopyWith(_InvoiceSummary value, $Res Function(_InvoiceSummary) _then) = __$InvoiceSummaryCopyWithImpl;
@override @useResult
$Res call({
 String id, String? invoiceNumber, InvoiceStatus status, InvoiceLeaseRef lease, InvoiceTenantRef tenant, InvoiceUnitRef unit, InvoicePropertyRef property, String periodStart, String periodEnd, String dueDate, String? graceUntilDate, int totalAmount, int paidAmount, int balanceAmount
});


@override $InvoiceLeaseRefCopyWith<$Res> get lease;@override $InvoiceTenantRefCopyWith<$Res> get tenant;@override $InvoiceUnitRefCopyWith<$Res> get unit;@override $InvoicePropertyRefCopyWith<$Res> get property;

}
/// @nodoc
class __$InvoiceSummaryCopyWithImpl<$Res>
    implements _$InvoiceSummaryCopyWith<$Res> {
  __$InvoiceSummaryCopyWithImpl(this._self, this._then);

  final _InvoiceSummary _self;
  final $Res Function(_InvoiceSummary) _then;

/// Create a copy of InvoiceSummary
/// with the given fields replaced by the non-null parameter values.
@override @pragma('vm:prefer-inline') $Res call({Object? id = null,Object? invoiceNumber = freezed,Object? status = null,Object? lease = null,Object? tenant = null,Object? unit = null,Object? property = null,Object? periodStart = null,Object? periodEnd = null,Object? dueDate = null,Object? graceUntilDate = freezed,Object? totalAmount = null,Object? paidAmount = null,Object? balanceAmount = null,}) {
  return _then(_InvoiceSummary(
id: null == id ? _self.id : id // ignore: cast_nullable_to_non_nullable
as String,invoiceNumber: freezed == invoiceNumber ? _self.invoiceNumber : invoiceNumber // ignore: cast_nullable_to_non_nullable
as String?,status: null == status ? _self.status : status // ignore: cast_nullable_to_non_nullable
as InvoiceStatus,lease: null == lease ? _self.lease : lease // ignore: cast_nullable_to_non_nullable
as InvoiceLeaseRef,tenant: null == tenant ? _self.tenant : tenant // ignore: cast_nullable_to_non_nullable
as InvoiceTenantRef,unit: null == unit ? _self.unit : unit // ignore: cast_nullable_to_non_nullable
as InvoiceUnitRef,property: null == property ? _self.property : property // ignore: cast_nullable_to_non_nullable
as InvoicePropertyRef,periodStart: null == periodStart ? _self.periodStart : periodStart // ignore: cast_nullable_to_non_nullable
as String,periodEnd: null == periodEnd ? _self.periodEnd : periodEnd // ignore: cast_nullable_to_non_nullable
as String,dueDate: null == dueDate ? _self.dueDate : dueDate // ignore: cast_nullable_to_non_nullable
as String,graceUntilDate: freezed == graceUntilDate ? _self.graceUntilDate : graceUntilDate // ignore: cast_nullable_to_non_nullable
as String?,totalAmount: null == totalAmount ? _self.totalAmount : totalAmount // ignore: cast_nullable_to_non_nullable
as int,paidAmount: null == paidAmount ? _self.paidAmount : paidAmount // ignore: cast_nullable_to_non_nullable
as int,balanceAmount: null == balanceAmount ? _self.balanceAmount : balanceAmount // ignore: cast_nullable_to_non_nullable
as int,
  ));
}

/// Create a copy of InvoiceSummary
/// with the given fields replaced by the non-null parameter values.
@override
@pragma('vm:prefer-inline')
$InvoiceLeaseRefCopyWith<$Res> get lease {
  
  return $InvoiceLeaseRefCopyWith<$Res>(_self.lease, (value) {
    return _then(_self.copyWith(lease: value));
  });
}/// Create a copy of InvoiceSummary
/// with the given fields replaced by the non-null parameter values.
@override
@pragma('vm:prefer-inline')
$InvoiceTenantRefCopyWith<$Res> get tenant {
  
  return $InvoiceTenantRefCopyWith<$Res>(_self.tenant, (value) {
    return _then(_self.copyWith(tenant: value));
  });
}/// Create a copy of InvoiceSummary
/// with the given fields replaced by the non-null parameter values.
@override
@pragma('vm:prefer-inline')
$InvoiceUnitRefCopyWith<$Res> get unit {
  
  return $InvoiceUnitRefCopyWith<$Res>(_self.unit, (value) {
    return _then(_self.copyWith(unit: value));
  });
}/// Create a copy of InvoiceSummary
/// with the given fields replaced by the non-null parameter values.
@override
@pragma('vm:prefer-inline')
$InvoicePropertyRefCopyWith<$Res> get property {
  
  return $InvoicePropertyRefCopyWith<$Res>(_self.property, (value) {
    return _then(_self.copyWith(property: value));
  });
}
}

// dart format on
