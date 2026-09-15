// GENERATED CODE - DO NOT MODIFY BY HAND
// coverage:ignore-file
// ignore_for_file: type=lint
// ignore_for_file: unused_element, deprecated_member_use, deprecated_member_use_from_same_package, use_function_type_syntax_for_parameters, unnecessary_const, avoid_init_to_null, invalid_override_different_default_values_named, prefer_expression_function_bodies, annotate_overrides, invalid_annotation_target, unnecessary_question_mark

part of 'collection_view.dart';

// **************************************************************************
// FreezedGenerator
// **************************************************************************

// dart format off
T _$identity<T>(T value) => value;

/// @nodoc
mixin _$CollectionViewTenantRef {

 String get id; String get displayName;
/// Create a copy of CollectionViewTenantRef
/// with the given fields replaced by the non-null parameter values.
@JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
$CollectionViewTenantRefCopyWith<CollectionViewTenantRef> get copyWith => _$CollectionViewTenantRefCopyWithImpl<CollectionViewTenantRef>(this as CollectionViewTenantRef, _$identity);

  /// Serializes this CollectionViewTenantRef to a JSON map.
  Map<String, dynamic> toJson();


@override
bool operator ==(Object other) {
  return identical(this, other) || (other.runtimeType == runtimeType&&other is CollectionViewTenantRef&&(identical(other.id, id) || other.id == id)&&(identical(other.displayName, displayName) || other.displayName == displayName));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode => Object.hash(runtimeType,id,displayName);

@override
String toString() {
  return 'CollectionViewTenantRef(id: $id, displayName: $displayName)';
}


}

/// @nodoc
abstract mixin class $CollectionViewTenantRefCopyWith<$Res>  {
  factory $CollectionViewTenantRefCopyWith(CollectionViewTenantRef value, $Res Function(CollectionViewTenantRef) _then) = _$CollectionViewTenantRefCopyWithImpl;
@useResult
$Res call({
 String id, String displayName
});




}
/// @nodoc
class _$CollectionViewTenantRefCopyWithImpl<$Res>
    implements $CollectionViewTenantRefCopyWith<$Res> {
  _$CollectionViewTenantRefCopyWithImpl(this._self, this._then);

  final CollectionViewTenantRef _self;
  final $Res Function(CollectionViewTenantRef) _then;

/// Create a copy of CollectionViewTenantRef
/// with the given fields replaced by the non-null parameter values.
@pragma('vm:prefer-inline') @override $Res call({Object? id = null,Object? displayName = null,}) {
  return _then(_self.copyWith(
id: null == id ? _self.id : id // ignore: cast_nullable_to_non_nullable
as String,displayName: null == displayName ? _self.displayName : displayName // ignore: cast_nullable_to_non_nullable
as String,
  ));
}

}


/// Adds pattern-matching-related methods to [CollectionViewTenantRef].
extension CollectionViewTenantRefPatterns on CollectionViewTenantRef {
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

@optionalTypeArgs TResult maybeMap<TResult extends Object?>(TResult Function( _CollectionViewTenantRef value)?  $default,{required TResult orElse(),}){
final _that = this;
switch (_that) {
case _CollectionViewTenantRef() when $default != null:
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

@optionalTypeArgs TResult map<TResult extends Object?>(TResult Function( _CollectionViewTenantRef value)  $default,){
final _that = this;
switch (_that) {
case _CollectionViewTenantRef():
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

@optionalTypeArgs TResult? mapOrNull<TResult extends Object?>(TResult? Function( _CollectionViewTenantRef value)?  $default,){
final _that = this;
switch (_that) {
case _CollectionViewTenantRef() when $default != null:
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
case _CollectionViewTenantRef() when $default != null:
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
case _CollectionViewTenantRef():
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
case _CollectionViewTenantRef() when $default != null:
return $default(_that.id,_that.displayName);case _:
  return null;

}
}

}

/// @nodoc
@JsonSerializable()

class _CollectionViewTenantRef implements CollectionViewTenantRef {
  const _CollectionViewTenantRef({required this.id, required this.displayName});
  factory _CollectionViewTenantRef.fromJson(Map<String, dynamic> json) => _$CollectionViewTenantRefFromJson(json);

@override final  String id;
@override final  String displayName;

/// Create a copy of CollectionViewTenantRef
/// with the given fields replaced by the non-null parameter values.
@override @JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
_$CollectionViewTenantRefCopyWith<_CollectionViewTenantRef> get copyWith => __$CollectionViewTenantRefCopyWithImpl<_CollectionViewTenantRef>(this, _$identity);

@override
Map<String, dynamic> toJson() {
  return _$CollectionViewTenantRefToJson(this, );
}

@override
bool operator ==(Object other) {
  return identical(this, other) || (other.runtimeType == runtimeType&&other is _CollectionViewTenantRef&&(identical(other.id, id) || other.id == id)&&(identical(other.displayName, displayName) || other.displayName == displayName));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode => Object.hash(runtimeType,id,displayName);

@override
String toString() {
  return 'CollectionViewTenantRef(id: $id, displayName: $displayName)';
}


}

/// @nodoc
abstract mixin class _$CollectionViewTenantRefCopyWith<$Res> implements $CollectionViewTenantRefCopyWith<$Res> {
  factory _$CollectionViewTenantRefCopyWith(_CollectionViewTenantRef value, $Res Function(_CollectionViewTenantRef) _then) = __$CollectionViewTenantRefCopyWithImpl;
@override @useResult
$Res call({
 String id, String displayName
});




}
/// @nodoc
class __$CollectionViewTenantRefCopyWithImpl<$Res>
    implements _$CollectionViewTenantRefCopyWith<$Res> {
  __$CollectionViewTenantRefCopyWithImpl(this._self, this._then);

  final _CollectionViewTenantRef _self;
  final $Res Function(_CollectionViewTenantRef) _then;

/// Create a copy of CollectionViewTenantRef
/// with the given fields replaced by the non-null parameter values.
@override @pragma('vm:prefer-inline') $Res call({Object? id = null,Object? displayName = null,}) {
  return _then(_CollectionViewTenantRef(
id: null == id ? _self.id : id // ignore: cast_nullable_to_non_nullable
as String,displayName: null == displayName ? _self.displayName : displayName // ignore: cast_nullable_to_non_nullable
as String,
  ));
}


}


/// @nodoc
mixin _$CollectionViewUnitRef {

 String get id; String get code;
/// Create a copy of CollectionViewUnitRef
/// with the given fields replaced by the non-null parameter values.
@JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
$CollectionViewUnitRefCopyWith<CollectionViewUnitRef> get copyWith => _$CollectionViewUnitRefCopyWithImpl<CollectionViewUnitRef>(this as CollectionViewUnitRef, _$identity);

  /// Serializes this CollectionViewUnitRef to a JSON map.
  Map<String, dynamic> toJson();


@override
bool operator ==(Object other) {
  return identical(this, other) || (other.runtimeType == runtimeType&&other is CollectionViewUnitRef&&(identical(other.id, id) || other.id == id)&&(identical(other.code, code) || other.code == code));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode => Object.hash(runtimeType,id,code);

@override
String toString() {
  return 'CollectionViewUnitRef(id: $id, code: $code)';
}


}

/// @nodoc
abstract mixin class $CollectionViewUnitRefCopyWith<$Res>  {
  factory $CollectionViewUnitRefCopyWith(CollectionViewUnitRef value, $Res Function(CollectionViewUnitRef) _then) = _$CollectionViewUnitRefCopyWithImpl;
@useResult
$Res call({
 String id, String code
});




}
/// @nodoc
class _$CollectionViewUnitRefCopyWithImpl<$Res>
    implements $CollectionViewUnitRefCopyWith<$Res> {
  _$CollectionViewUnitRefCopyWithImpl(this._self, this._then);

  final CollectionViewUnitRef _self;
  final $Res Function(CollectionViewUnitRef) _then;

/// Create a copy of CollectionViewUnitRef
/// with the given fields replaced by the non-null parameter values.
@pragma('vm:prefer-inline') @override $Res call({Object? id = null,Object? code = null,}) {
  return _then(_self.copyWith(
id: null == id ? _self.id : id // ignore: cast_nullable_to_non_nullable
as String,code: null == code ? _self.code : code // ignore: cast_nullable_to_non_nullable
as String,
  ));
}

}


/// Adds pattern-matching-related methods to [CollectionViewUnitRef].
extension CollectionViewUnitRefPatterns on CollectionViewUnitRef {
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

@optionalTypeArgs TResult maybeMap<TResult extends Object?>(TResult Function( _CollectionViewUnitRef value)?  $default,{required TResult orElse(),}){
final _that = this;
switch (_that) {
case _CollectionViewUnitRef() when $default != null:
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

@optionalTypeArgs TResult map<TResult extends Object?>(TResult Function( _CollectionViewUnitRef value)  $default,){
final _that = this;
switch (_that) {
case _CollectionViewUnitRef():
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

@optionalTypeArgs TResult? mapOrNull<TResult extends Object?>(TResult? Function( _CollectionViewUnitRef value)?  $default,){
final _that = this;
switch (_that) {
case _CollectionViewUnitRef() when $default != null:
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
case _CollectionViewUnitRef() when $default != null:
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
case _CollectionViewUnitRef():
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
case _CollectionViewUnitRef() when $default != null:
return $default(_that.id,_that.code);case _:
  return null;

}
}

}

/// @nodoc
@JsonSerializable()

class _CollectionViewUnitRef implements CollectionViewUnitRef {
  const _CollectionViewUnitRef({required this.id, required this.code});
  factory _CollectionViewUnitRef.fromJson(Map<String, dynamic> json) => _$CollectionViewUnitRefFromJson(json);

@override final  String id;
@override final  String code;

/// Create a copy of CollectionViewUnitRef
/// with the given fields replaced by the non-null parameter values.
@override @JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
_$CollectionViewUnitRefCopyWith<_CollectionViewUnitRef> get copyWith => __$CollectionViewUnitRefCopyWithImpl<_CollectionViewUnitRef>(this, _$identity);

@override
Map<String, dynamic> toJson() {
  return _$CollectionViewUnitRefToJson(this, );
}

@override
bool operator ==(Object other) {
  return identical(this, other) || (other.runtimeType == runtimeType&&other is _CollectionViewUnitRef&&(identical(other.id, id) || other.id == id)&&(identical(other.code, code) || other.code == code));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode => Object.hash(runtimeType,id,code);

@override
String toString() {
  return 'CollectionViewUnitRef(id: $id, code: $code)';
}


}

/// @nodoc
abstract mixin class _$CollectionViewUnitRefCopyWith<$Res> implements $CollectionViewUnitRefCopyWith<$Res> {
  factory _$CollectionViewUnitRefCopyWith(_CollectionViewUnitRef value, $Res Function(_CollectionViewUnitRef) _then) = __$CollectionViewUnitRefCopyWithImpl;
@override @useResult
$Res call({
 String id, String code
});




}
/// @nodoc
class __$CollectionViewUnitRefCopyWithImpl<$Res>
    implements _$CollectionViewUnitRefCopyWith<$Res> {
  __$CollectionViewUnitRefCopyWithImpl(this._self, this._then);

  final _CollectionViewUnitRef _self;
  final $Res Function(_CollectionViewUnitRef) _then;

/// Create a copy of CollectionViewUnitRef
/// with the given fields replaced by the non-null parameter values.
@override @pragma('vm:prefer-inline') $Res call({Object? id = null,Object? code = null,}) {
  return _then(_CollectionViewUnitRef(
id: null == id ? _self.id : id // ignore: cast_nullable_to_non_nullable
as String,code: null == code ? _self.code : code // ignore: cast_nullable_to_non_nullable
as String,
  ));
}


}


/// @nodoc
mixin _$CollectionView {

 String get paymentId; String get paymentDate; PaymentMethod get method; int get amount; CollectionViewTenantRef get tenant; CollectionViewUnitRef get unit; String? get invoiceNumber;
/// Create a copy of CollectionView
/// with the given fields replaced by the non-null parameter values.
@JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
$CollectionViewCopyWith<CollectionView> get copyWith => _$CollectionViewCopyWithImpl<CollectionView>(this as CollectionView, _$identity);

  /// Serializes this CollectionView to a JSON map.
  Map<String, dynamic> toJson();


@override
bool operator ==(Object other) {
  return identical(this, other) || (other.runtimeType == runtimeType&&other is CollectionView&&(identical(other.paymentId, paymentId) || other.paymentId == paymentId)&&(identical(other.paymentDate, paymentDate) || other.paymentDate == paymentDate)&&(identical(other.method, method) || other.method == method)&&(identical(other.amount, amount) || other.amount == amount)&&(identical(other.tenant, tenant) || other.tenant == tenant)&&(identical(other.unit, unit) || other.unit == unit)&&(identical(other.invoiceNumber, invoiceNumber) || other.invoiceNumber == invoiceNumber));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode => Object.hash(runtimeType,paymentId,paymentDate,method,amount,tenant,unit,invoiceNumber);

@override
String toString() {
  return 'CollectionView(paymentId: $paymentId, paymentDate: $paymentDate, method: $method, amount: $amount, tenant: $tenant, unit: $unit, invoiceNumber: $invoiceNumber)';
}


}

/// @nodoc
abstract mixin class $CollectionViewCopyWith<$Res>  {
  factory $CollectionViewCopyWith(CollectionView value, $Res Function(CollectionView) _then) = _$CollectionViewCopyWithImpl;
@useResult
$Res call({
 String paymentId, String paymentDate, PaymentMethod method, int amount, CollectionViewTenantRef tenant, CollectionViewUnitRef unit, String? invoiceNumber
});


$CollectionViewTenantRefCopyWith<$Res> get tenant;$CollectionViewUnitRefCopyWith<$Res> get unit;

}
/// @nodoc
class _$CollectionViewCopyWithImpl<$Res>
    implements $CollectionViewCopyWith<$Res> {
  _$CollectionViewCopyWithImpl(this._self, this._then);

  final CollectionView _self;
  final $Res Function(CollectionView) _then;

/// Create a copy of CollectionView
/// with the given fields replaced by the non-null parameter values.
@pragma('vm:prefer-inline') @override $Res call({Object? paymentId = null,Object? paymentDate = null,Object? method = null,Object? amount = null,Object? tenant = null,Object? unit = null,Object? invoiceNumber = freezed,}) {
  return _then(_self.copyWith(
paymentId: null == paymentId ? _self.paymentId : paymentId // ignore: cast_nullable_to_non_nullable
as String,paymentDate: null == paymentDate ? _self.paymentDate : paymentDate // ignore: cast_nullable_to_non_nullable
as String,method: null == method ? _self.method : method // ignore: cast_nullable_to_non_nullable
as PaymentMethod,amount: null == amount ? _self.amount : amount // ignore: cast_nullable_to_non_nullable
as int,tenant: null == tenant ? _self.tenant : tenant // ignore: cast_nullable_to_non_nullable
as CollectionViewTenantRef,unit: null == unit ? _self.unit : unit // ignore: cast_nullable_to_non_nullable
as CollectionViewUnitRef,invoiceNumber: freezed == invoiceNumber ? _self.invoiceNumber : invoiceNumber // ignore: cast_nullable_to_non_nullable
as String?,
  ));
}
/// Create a copy of CollectionView
/// with the given fields replaced by the non-null parameter values.
@override
@pragma('vm:prefer-inline')
$CollectionViewTenantRefCopyWith<$Res> get tenant {
  
  return $CollectionViewTenantRefCopyWith<$Res>(_self.tenant, (value) {
    return _then(_self.copyWith(tenant: value));
  });
}/// Create a copy of CollectionView
/// with the given fields replaced by the non-null parameter values.
@override
@pragma('vm:prefer-inline')
$CollectionViewUnitRefCopyWith<$Res> get unit {
  
  return $CollectionViewUnitRefCopyWith<$Res>(_self.unit, (value) {
    return _then(_self.copyWith(unit: value));
  });
}
}


/// Adds pattern-matching-related methods to [CollectionView].
extension CollectionViewPatterns on CollectionView {
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

@optionalTypeArgs TResult maybeMap<TResult extends Object?>(TResult Function( _CollectionView value)?  $default,{required TResult orElse(),}){
final _that = this;
switch (_that) {
case _CollectionView() when $default != null:
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

@optionalTypeArgs TResult map<TResult extends Object?>(TResult Function( _CollectionView value)  $default,){
final _that = this;
switch (_that) {
case _CollectionView():
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

@optionalTypeArgs TResult? mapOrNull<TResult extends Object?>(TResult? Function( _CollectionView value)?  $default,){
final _that = this;
switch (_that) {
case _CollectionView() when $default != null:
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

@optionalTypeArgs TResult maybeWhen<TResult extends Object?>(TResult Function( String paymentId,  String paymentDate,  PaymentMethod method,  int amount,  CollectionViewTenantRef tenant,  CollectionViewUnitRef unit,  String? invoiceNumber)?  $default,{required TResult orElse(),}) {final _that = this;
switch (_that) {
case _CollectionView() when $default != null:
return $default(_that.paymentId,_that.paymentDate,_that.method,_that.amount,_that.tenant,_that.unit,_that.invoiceNumber);case _:
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

@optionalTypeArgs TResult when<TResult extends Object?>(TResult Function( String paymentId,  String paymentDate,  PaymentMethod method,  int amount,  CollectionViewTenantRef tenant,  CollectionViewUnitRef unit,  String? invoiceNumber)  $default,) {final _that = this;
switch (_that) {
case _CollectionView():
return $default(_that.paymentId,_that.paymentDate,_that.method,_that.amount,_that.tenant,_that.unit,_that.invoiceNumber);case _:
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

@optionalTypeArgs TResult? whenOrNull<TResult extends Object?>(TResult? Function( String paymentId,  String paymentDate,  PaymentMethod method,  int amount,  CollectionViewTenantRef tenant,  CollectionViewUnitRef unit,  String? invoiceNumber)?  $default,) {final _that = this;
switch (_that) {
case _CollectionView() when $default != null:
return $default(_that.paymentId,_that.paymentDate,_that.method,_that.amount,_that.tenant,_that.unit,_that.invoiceNumber);case _:
  return null;

}
}

}

/// @nodoc
@JsonSerializable()

class _CollectionView implements CollectionView {
  const _CollectionView({required this.paymentId, required this.paymentDate, required this.method, required this.amount, required this.tenant, required this.unit, this.invoiceNumber});
  factory _CollectionView.fromJson(Map<String, dynamic> json) => _$CollectionViewFromJson(json);

@override final  String paymentId;
@override final  String paymentDate;
@override final  PaymentMethod method;
@override final  int amount;
@override final  CollectionViewTenantRef tenant;
@override final  CollectionViewUnitRef unit;
@override final  String? invoiceNumber;

/// Create a copy of CollectionView
/// with the given fields replaced by the non-null parameter values.
@override @JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
_$CollectionViewCopyWith<_CollectionView> get copyWith => __$CollectionViewCopyWithImpl<_CollectionView>(this, _$identity);

@override
Map<String, dynamic> toJson() {
  return _$CollectionViewToJson(this, );
}

@override
bool operator ==(Object other) {
  return identical(this, other) || (other.runtimeType == runtimeType&&other is _CollectionView&&(identical(other.paymentId, paymentId) || other.paymentId == paymentId)&&(identical(other.paymentDate, paymentDate) || other.paymentDate == paymentDate)&&(identical(other.method, method) || other.method == method)&&(identical(other.amount, amount) || other.amount == amount)&&(identical(other.tenant, tenant) || other.tenant == tenant)&&(identical(other.unit, unit) || other.unit == unit)&&(identical(other.invoiceNumber, invoiceNumber) || other.invoiceNumber == invoiceNumber));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode => Object.hash(runtimeType,paymentId,paymentDate,method,amount,tenant,unit,invoiceNumber);

@override
String toString() {
  return 'CollectionView(paymentId: $paymentId, paymentDate: $paymentDate, method: $method, amount: $amount, tenant: $tenant, unit: $unit, invoiceNumber: $invoiceNumber)';
}


}

/// @nodoc
abstract mixin class _$CollectionViewCopyWith<$Res> implements $CollectionViewCopyWith<$Res> {
  factory _$CollectionViewCopyWith(_CollectionView value, $Res Function(_CollectionView) _then) = __$CollectionViewCopyWithImpl;
@override @useResult
$Res call({
 String paymentId, String paymentDate, PaymentMethod method, int amount, CollectionViewTenantRef tenant, CollectionViewUnitRef unit, String? invoiceNumber
});


@override $CollectionViewTenantRefCopyWith<$Res> get tenant;@override $CollectionViewUnitRefCopyWith<$Res> get unit;

}
/// @nodoc
class __$CollectionViewCopyWithImpl<$Res>
    implements _$CollectionViewCopyWith<$Res> {
  __$CollectionViewCopyWithImpl(this._self, this._then);

  final _CollectionView _self;
  final $Res Function(_CollectionView) _then;

/// Create a copy of CollectionView
/// with the given fields replaced by the non-null parameter values.
@override @pragma('vm:prefer-inline') $Res call({Object? paymentId = null,Object? paymentDate = null,Object? method = null,Object? amount = null,Object? tenant = null,Object? unit = null,Object? invoiceNumber = freezed,}) {
  return _then(_CollectionView(
paymentId: null == paymentId ? _self.paymentId : paymentId // ignore: cast_nullable_to_non_nullable
as String,paymentDate: null == paymentDate ? _self.paymentDate : paymentDate // ignore: cast_nullable_to_non_nullable
as String,method: null == method ? _self.method : method // ignore: cast_nullable_to_non_nullable
as PaymentMethod,amount: null == amount ? _self.amount : amount // ignore: cast_nullable_to_non_nullable
as int,tenant: null == tenant ? _self.tenant : tenant // ignore: cast_nullable_to_non_nullable
as CollectionViewTenantRef,unit: null == unit ? _self.unit : unit // ignore: cast_nullable_to_non_nullable
as CollectionViewUnitRef,invoiceNumber: freezed == invoiceNumber ? _self.invoiceNumber : invoiceNumber // ignore: cast_nullable_to_non_nullable
as String?,
  ));
}

/// Create a copy of CollectionView
/// with the given fields replaced by the non-null parameter values.
@override
@pragma('vm:prefer-inline')
$CollectionViewTenantRefCopyWith<$Res> get tenant {
  
  return $CollectionViewTenantRefCopyWith<$Res>(_self.tenant, (value) {
    return _then(_self.copyWith(tenant: value));
  });
}/// Create a copy of CollectionView
/// with the given fields replaced by the non-null parameter values.
@override
@pragma('vm:prefer-inline')
$CollectionViewUnitRefCopyWith<$Res> get unit {
  
  return $CollectionViewUnitRefCopyWith<$Res>(_self.unit, (value) {
    return _then(_self.copyWith(unit: value));
  });
}
}

// dart format on
