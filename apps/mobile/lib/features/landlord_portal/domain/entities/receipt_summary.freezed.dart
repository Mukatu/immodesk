// GENERATED CODE - DO NOT MODIFY BY HAND
// coverage:ignore-file
// ignore_for_file: type=lint
// ignore_for_file: unused_element, deprecated_member_use, deprecated_member_use_from_same_package, use_function_type_syntax_for_parameters, unnecessary_const, avoid_init_to_null, invalid_override_different_default_values_named, prefer_expression_function_bodies, annotate_overrides, invalid_annotation_target, unnecessary_question_mark

part of 'receipt_summary.dart';

// **************************************************************************
// FreezedGenerator
// **************************************************************************

// dart format off
T _$identity<T>(T value) => value;

/// @nodoc
mixin _$ReceiptSummaryTenantRef {

 String get id; String get displayName;
/// Create a copy of ReceiptSummaryTenantRef
/// with the given fields replaced by the non-null parameter values.
@JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
$ReceiptSummaryTenantRefCopyWith<ReceiptSummaryTenantRef> get copyWith => _$ReceiptSummaryTenantRefCopyWithImpl<ReceiptSummaryTenantRef>(this as ReceiptSummaryTenantRef, _$identity);

  /// Serializes this ReceiptSummaryTenantRef to a JSON map.
  Map<String, dynamic> toJson();


@override
bool operator ==(Object other) {
  return identical(this, other) || (other.runtimeType == runtimeType&&other is ReceiptSummaryTenantRef&&(identical(other.id, id) || other.id == id)&&(identical(other.displayName, displayName) || other.displayName == displayName));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode => Object.hash(runtimeType,id,displayName);

@override
String toString() {
  return 'ReceiptSummaryTenantRef(id: $id, displayName: $displayName)';
}


}

/// @nodoc
abstract mixin class $ReceiptSummaryTenantRefCopyWith<$Res>  {
  factory $ReceiptSummaryTenantRefCopyWith(ReceiptSummaryTenantRef value, $Res Function(ReceiptSummaryTenantRef) _then) = _$ReceiptSummaryTenantRefCopyWithImpl;
@useResult
$Res call({
 String id, String displayName
});




}
/// @nodoc
class _$ReceiptSummaryTenantRefCopyWithImpl<$Res>
    implements $ReceiptSummaryTenantRefCopyWith<$Res> {
  _$ReceiptSummaryTenantRefCopyWithImpl(this._self, this._then);

  final ReceiptSummaryTenantRef _self;
  final $Res Function(ReceiptSummaryTenantRef) _then;

/// Create a copy of ReceiptSummaryTenantRef
/// with the given fields replaced by the non-null parameter values.
@pragma('vm:prefer-inline') @override $Res call({Object? id = null,Object? displayName = null,}) {
  return _then(_self.copyWith(
id: null == id ? _self.id : id // ignore: cast_nullable_to_non_nullable
as String,displayName: null == displayName ? _self.displayName : displayName // ignore: cast_nullable_to_non_nullable
as String,
  ));
}

}


/// Adds pattern-matching-related methods to [ReceiptSummaryTenantRef].
extension ReceiptSummaryTenantRefPatterns on ReceiptSummaryTenantRef {
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

@optionalTypeArgs TResult maybeMap<TResult extends Object?>(TResult Function( _ReceiptSummaryTenantRef value)?  $default,{required TResult orElse(),}){
final _that = this;
switch (_that) {
case _ReceiptSummaryTenantRef() when $default != null:
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

@optionalTypeArgs TResult map<TResult extends Object?>(TResult Function( _ReceiptSummaryTenantRef value)  $default,){
final _that = this;
switch (_that) {
case _ReceiptSummaryTenantRef():
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

@optionalTypeArgs TResult? mapOrNull<TResult extends Object?>(TResult? Function( _ReceiptSummaryTenantRef value)?  $default,){
final _that = this;
switch (_that) {
case _ReceiptSummaryTenantRef() when $default != null:
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
case _ReceiptSummaryTenantRef() when $default != null:
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
case _ReceiptSummaryTenantRef():
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
case _ReceiptSummaryTenantRef() when $default != null:
return $default(_that.id,_that.displayName);case _:
  return null;

}
}

}

/// @nodoc
@JsonSerializable()

class _ReceiptSummaryTenantRef implements ReceiptSummaryTenantRef {
  const _ReceiptSummaryTenantRef({required this.id, required this.displayName});
  factory _ReceiptSummaryTenantRef.fromJson(Map<String, dynamic> json) => _$ReceiptSummaryTenantRefFromJson(json);

@override final  String id;
@override final  String displayName;

/// Create a copy of ReceiptSummaryTenantRef
/// with the given fields replaced by the non-null parameter values.
@override @JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
_$ReceiptSummaryTenantRefCopyWith<_ReceiptSummaryTenantRef> get copyWith => __$ReceiptSummaryTenantRefCopyWithImpl<_ReceiptSummaryTenantRef>(this, _$identity);

@override
Map<String, dynamic> toJson() {
  return _$ReceiptSummaryTenantRefToJson(this, );
}

@override
bool operator ==(Object other) {
  return identical(this, other) || (other.runtimeType == runtimeType&&other is _ReceiptSummaryTenantRef&&(identical(other.id, id) || other.id == id)&&(identical(other.displayName, displayName) || other.displayName == displayName));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode => Object.hash(runtimeType,id,displayName);

@override
String toString() {
  return 'ReceiptSummaryTenantRef(id: $id, displayName: $displayName)';
}


}

/// @nodoc
abstract mixin class _$ReceiptSummaryTenantRefCopyWith<$Res> implements $ReceiptSummaryTenantRefCopyWith<$Res> {
  factory _$ReceiptSummaryTenantRefCopyWith(_ReceiptSummaryTenantRef value, $Res Function(_ReceiptSummaryTenantRef) _then) = __$ReceiptSummaryTenantRefCopyWithImpl;
@override @useResult
$Res call({
 String id, String displayName
});




}
/// @nodoc
class __$ReceiptSummaryTenantRefCopyWithImpl<$Res>
    implements _$ReceiptSummaryTenantRefCopyWith<$Res> {
  __$ReceiptSummaryTenantRefCopyWithImpl(this._self, this._then);

  final _ReceiptSummaryTenantRef _self;
  final $Res Function(_ReceiptSummaryTenantRef) _then;

/// Create a copy of ReceiptSummaryTenantRef
/// with the given fields replaced by the non-null parameter values.
@override @pragma('vm:prefer-inline') $Res call({Object? id = null,Object? displayName = null,}) {
  return _then(_ReceiptSummaryTenantRef(
id: null == id ? _self.id : id // ignore: cast_nullable_to_non_nullable
as String,displayName: null == displayName ? _self.displayName : displayName // ignore: cast_nullable_to_non_nullable
as String,
  ));
}


}


/// @nodoc
mixin _$ReceiptSummaryUnitRef {

 String get id; String get code;
/// Create a copy of ReceiptSummaryUnitRef
/// with the given fields replaced by the non-null parameter values.
@JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
$ReceiptSummaryUnitRefCopyWith<ReceiptSummaryUnitRef> get copyWith => _$ReceiptSummaryUnitRefCopyWithImpl<ReceiptSummaryUnitRef>(this as ReceiptSummaryUnitRef, _$identity);

  /// Serializes this ReceiptSummaryUnitRef to a JSON map.
  Map<String, dynamic> toJson();


@override
bool operator ==(Object other) {
  return identical(this, other) || (other.runtimeType == runtimeType&&other is ReceiptSummaryUnitRef&&(identical(other.id, id) || other.id == id)&&(identical(other.code, code) || other.code == code));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode => Object.hash(runtimeType,id,code);

@override
String toString() {
  return 'ReceiptSummaryUnitRef(id: $id, code: $code)';
}


}

/// @nodoc
abstract mixin class $ReceiptSummaryUnitRefCopyWith<$Res>  {
  factory $ReceiptSummaryUnitRefCopyWith(ReceiptSummaryUnitRef value, $Res Function(ReceiptSummaryUnitRef) _then) = _$ReceiptSummaryUnitRefCopyWithImpl;
@useResult
$Res call({
 String id, String code
});




}
/// @nodoc
class _$ReceiptSummaryUnitRefCopyWithImpl<$Res>
    implements $ReceiptSummaryUnitRefCopyWith<$Res> {
  _$ReceiptSummaryUnitRefCopyWithImpl(this._self, this._then);

  final ReceiptSummaryUnitRef _self;
  final $Res Function(ReceiptSummaryUnitRef) _then;

/// Create a copy of ReceiptSummaryUnitRef
/// with the given fields replaced by the non-null parameter values.
@pragma('vm:prefer-inline') @override $Res call({Object? id = null,Object? code = null,}) {
  return _then(_self.copyWith(
id: null == id ? _self.id : id // ignore: cast_nullable_to_non_nullable
as String,code: null == code ? _self.code : code // ignore: cast_nullable_to_non_nullable
as String,
  ));
}

}


/// Adds pattern-matching-related methods to [ReceiptSummaryUnitRef].
extension ReceiptSummaryUnitRefPatterns on ReceiptSummaryUnitRef {
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

@optionalTypeArgs TResult maybeMap<TResult extends Object?>(TResult Function( _ReceiptSummaryUnitRef value)?  $default,{required TResult orElse(),}){
final _that = this;
switch (_that) {
case _ReceiptSummaryUnitRef() when $default != null:
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

@optionalTypeArgs TResult map<TResult extends Object?>(TResult Function( _ReceiptSummaryUnitRef value)  $default,){
final _that = this;
switch (_that) {
case _ReceiptSummaryUnitRef():
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

@optionalTypeArgs TResult? mapOrNull<TResult extends Object?>(TResult? Function( _ReceiptSummaryUnitRef value)?  $default,){
final _that = this;
switch (_that) {
case _ReceiptSummaryUnitRef() when $default != null:
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
case _ReceiptSummaryUnitRef() when $default != null:
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
case _ReceiptSummaryUnitRef():
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
case _ReceiptSummaryUnitRef() when $default != null:
return $default(_that.id,_that.code);case _:
  return null;

}
}

}

/// @nodoc
@JsonSerializable()

class _ReceiptSummaryUnitRef implements ReceiptSummaryUnitRef {
  const _ReceiptSummaryUnitRef({required this.id, required this.code});
  factory _ReceiptSummaryUnitRef.fromJson(Map<String, dynamic> json) => _$ReceiptSummaryUnitRefFromJson(json);

@override final  String id;
@override final  String code;

/// Create a copy of ReceiptSummaryUnitRef
/// with the given fields replaced by the non-null parameter values.
@override @JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
_$ReceiptSummaryUnitRefCopyWith<_ReceiptSummaryUnitRef> get copyWith => __$ReceiptSummaryUnitRefCopyWithImpl<_ReceiptSummaryUnitRef>(this, _$identity);

@override
Map<String, dynamic> toJson() {
  return _$ReceiptSummaryUnitRefToJson(this, );
}

@override
bool operator ==(Object other) {
  return identical(this, other) || (other.runtimeType == runtimeType&&other is _ReceiptSummaryUnitRef&&(identical(other.id, id) || other.id == id)&&(identical(other.code, code) || other.code == code));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode => Object.hash(runtimeType,id,code);

@override
String toString() {
  return 'ReceiptSummaryUnitRef(id: $id, code: $code)';
}


}

/// @nodoc
abstract mixin class _$ReceiptSummaryUnitRefCopyWith<$Res> implements $ReceiptSummaryUnitRefCopyWith<$Res> {
  factory _$ReceiptSummaryUnitRefCopyWith(_ReceiptSummaryUnitRef value, $Res Function(_ReceiptSummaryUnitRef) _then) = __$ReceiptSummaryUnitRefCopyWithImpl;
@override @useResult
$Res call({
 String id, String code
});




}
/// @nodoc
class __$ReceiptSummaryUnitRefCopyWithImpl<$Res>
    implements _$ReceiptSummaryUnitRefCopyWith<$Res> {
  __$ReceiptSummaryUnitRefCopyWithImpl(this._self, this._then);

  final _ReceiptSummaryUnitRef _self;
  final $Res Function(_ReceiptSummaryUnitRef) _then;

/// Create a copy of ReceiptSummaryUnitRef
/// with the given fields replaced by the non-null parameter values.
@override @pragma('vm:prefer-inline') $Res call({Object? id = null,Object? code = null,}) {
  return _then(_ReceiptSummaryUnitRef(
id: null == id ? _self.id : id // ignore: cast_nullable_to_non_nullable
as String,code: null == code ? _self.code : code // ignore: cast_nullable_to_non_nullable
as String,
  ));
}


}


/// @nodoc
mixin _$ReceiptSummary {

 String get id; String get receiptNumber; int get amount; String get receivedAt; ReceiptSummaryTenantRef get tenant; ReceiptSummaryUnitRef get unit; String get downloadUrl;
/// Create a copy of ReceiptSummary
/// with the given fields replaced by the non-null parameter values.
@JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
$ReceiptSummaryCopyWith<ReceiptSummary> get copyWith => _$ReceiptSummaryCopyWithImpl<ReceiptSummary>(this as ReceiptSummary, _$identity);

  /// Serializes this ReceiptSummary to a JSON map.
  Map<String, dynamic> toJson();


@override
bool operator ==(Object other) {
  return identical(this, other) || (other.runtimeType == runtimeType&&other is ReceiptSummary&&(identical(other.id, id) || other.id == id)&&(identical(other.receiptNumber, receiptNumber) || other.receiptNumber == receiptNumber)&&(identical(other.amount, amount) || other.amount == amount)&&(identical(other.receivedAt, receivedAt) || other.receivedAt == receivedAt)&&(identical(other.tenant, tenant) || other.tenant == tenant)&&(identical(other.unit, unit) || other.unit == unit)&&(identical(other.downloadUrl, downloadUrl) || other.downloadUrl == downloadUrl));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode => Object.hash(runtimeType,id,receiptNumber,amount,receivedAt,tenant,unit,downloadUrl);

@override
String toString() {
  return 'ReceiptSummary(id: $id, receiptNumber: $receiptNumber, amount: $amount, receivedAt: $receivedAt, tenant: $tenant, unit: $unit, downloadUrl: $downloadUrl)';
}


}

/// @nodoc
abstract mixin class $ReceiptSummaryCopyWith<$Res>  {
  factory $ReceiptSummaryCopyWith(ReceiptSummary value, $Res Function(ReceiptSummary) _then) = _$ReceiptSummaryCopyWithImpl;
@useResult
$Res call({
 String id, String receiptNumber, int amount, String receivedAt, ReceiptSummaryTenantRef tenant, ReceiptSummaryUnitRef unit, String downloadUrl
});


$ReceiptSummaryTenantRefCopyWith<$Res> get tenant;$ReceiptSummaryUnitRefCopyWith<$Res> get unit;

}
/// @nodoc
class _$ReceiptSummaryCopyWithImpl<$Res>
    implements $ReceiptSummaryCopyWith<$Res> {
  _$ReceiptSummaryCopyWithImpl(this._self, this._then);

  final ReceiptSummary _self;
  final $Res Function(ReceiptSummary) _then;

/// Create a copy of ReceiptSummary
/// with the given fields replaced by the non-null parameter values.
@pragma('vm:prefer-inline') @override $Res call({Object? id = null,Object? receiptNumber = null,Object? amount = null,Object? receivedAt = null,Object? tenant = null,Object? unit = null,Object? downloadUrl = null,}) {
  return _then(_self.copyWith(
id: null == id ? _self.id : id // ignore: cast_nullable_to_non_nullable
as String,receiptNumber: null == receiptNumber ? _self.receiptNumber : receiptNumber // ignore: cast_nullable_to_non_nullable
as String,amount: null == amount ? _self.amount : amount // ignore: cast_nullable_to_non_nullable
as int,receivedAt: null == receivedAt ? _self.receivedAt : receivedAt // ignore: cast_nullable_to_non_nullable
as String,tenant: null == tenant ? _self.tenant : tenant // ignore: cast_nullable_to_non_nullable
as ReceiptSummaryTenantRef,unit: null == unit ? _self.unit : unit // ignore: cast_nullable_to_non_nullable
as ReceiptSummaryUnitRef,downloadUrl: null == downloadUrl ? _self.downloadUrl : downloadUrl // ignore: cast_nullable_to_non_nullable
as String,
  ));
}
/// Create a copy of ReceiptSummary
/// with the given fields replaced by the non-null parameter values.
@override
@pragma('vm:prefer-inline')
$ReceiptSummaryTenantRefCopyWith<$Res> get tenant {
  
  return $ReceiptSummaryTenantRefCopyWith<$Res>(_self.tenant, (value) {
    return _then(_self.copyWith(tenant: value));
  });
}/// Create a copy of ReceiptSummary
/// with the given fields replaced by the non-null parameter values.
@override
@pragma('vm:prefer-inline')
$ReceiptSummaryUnitRefCopyWith<$Res> get unit {
  
  return $ReceiptSummaryUnitRefCopyWith<$Res>(_self.unit, (value) {
    return _then(_self.copyWith(unit: value));
  });
}
}


/// Adds pattern-matching-related methods to [ReceiptSummary].
extension ReceiptSummaryPatterns on ReceiptSummary {
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

@optionalTypeArgs TResult maybeMap<TResult extends Object?>(TResult Function( _ReceiptSummary value)?  $default,{required TResult orElse(),}){
final _that = this;
switch (_that) {
case _ReceiptSummary() when $default != null:
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

@optionalTypeArgs TResult map<TResult extends Object?>(TResult Function( _ReceiptSummary value)  $default,){
final _that = this;
switch (_that) {
case _ReceiptSummary():
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

@optionalTypeArgs TResult? mapOrNull<TResult extends Object?>(TResult? Function( _ReceiptSummary value)?  $default,){
final _that = this;
switch (_that) {
case _ReceiptSummary() when $default != null:
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

@optionalTypeArgs TResult maybeWhen<TResult extends Object?>(TResult Function( String id,  String receiptNumber,  int amount,  String receivedAt,  ReceiptSummaryTenantRef tenant,  ReceiptSummaryUnitRef unit,  String downloadUrl)?  $default,{required TResult orElse(),}) {final _that = this;
switch (_that) {
case _ReceiptSummary() when $default != null:
return $default(_that.id,_that.receiptNumber,_that.amount,_that.receivedAt,_that.tenant,_that.unit,_that.downloadUrl);case _:
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

@optionalTypeArgs TResult when<TResult extends Object?>(TResult Function( String id,  String receiptNumber,  int amount,  String receivedAt,  ReceiptSummaryTenantRef tenant,  ReceiptSummaryUnitRef unit,  String downloadUrl)  $default,) {final _that = this;
switch (_that) {
case _ReceiptSummary():
return $default(_that.id,_that.receiptNumber,_that.amount,_that.receivedAt,_that.tenant,_that.unit,_that.downloadUrl);case _:
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

@optionalTypeArgs TResult? whenOrNull<TResult extends Object?>(TResult? Function( String id,  String receiptNumber,  int amount,  String receivedAt,  ReceiptSummaryTenantRef tenant,  ReceiptSummaryUnitRef unit,  String downloadUrl)?  $default,) {final _that = this;
switch (_that) {
case _ReceiptSummary() when $default != null:
return $default(_that.id,_that.receiptNumber,_that.amount,_that.receivedAt,_that.tenant,_that.unit,_that.downloadUrl);case _:
  return null;

}
}

}

/// @nodoc
@JsonSerializable()

class _ReceiptSummary implements ReceiptSummary {
  const _ReceiptSummary({required this.id, required this.receiptNumber, required this.amount, required this.receivedAt, required this.tenant, required this.unit, required this.downloadUrl});
  factory _ReceiptSummary.fromJson(Map<String, dynamic> json) => _$ReceiptSummaryFromJson(json);

@override final  String id;
@override final  String receiptNumber;
@override final  int amount;
@override final  String receivedAt;
@override final  ReceiptSummaryTenantRef tenant;
@override final  ReceiptSummaryUnitRef unit;
@override final  String downloadUrl;

/// Create a copy of ReceiptSummary
/// with the given fields replaced by the non-null parameter values.
@override @JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
_$ReceiptSummaryCopyWith<_ReceiptSummary> get copyWith => __$ReceiptSummaryCopyWithImpl<_ReceiptSummary>(this, _$identity);

@override
Map<String, dynamic> toJson() {
  return _$ReceiptSummaryToJson(this, );
}

@override
bool operator ==(Object other) {
  return identical(this, other) || (other.runtimeType == runtimeType&&other is _ReceiptSummary&&(identical(other.id, id) || other.id == id)&&(identical(other.receiptNumber, receiptNumber) || other.receiptNumber == receiptNumber)&&(identical(other.amount, amount) || other.amount == amount)&&(identical(other.receivedAt, receivedAt) || other.receivedAt == receivedAt)&&(identical(other.tenant, tenant) || other.tenant == tenant)&&(identical(other.unit, unit) || other.unit == unit)&&(identical(other.downloadUrl, downloadUrl) || other.downloadUrl == downloadUrl));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode => Object.hash(runtimeType,id,receiptNumber,amount,receivedAt,tenant,unit,downloadUrl);

@override
String toString() {
  return 'ReceiptSummary(id: $id, receiptNumber: $receiptNumber, amount: $amount, receivedAt: $receivedAt, tenant: $tenant, unit: $unit, downloadUrl: $downloadUrl)';
}


}

/// @nodoc
abstract mixin class _$ReceiptSummaryCopyWith<$Res> implements $ReceiptSummaryCopyWith<$Res> {
  factory _$ReceiptSummaryCopyWith(_ReceiptSummary value, $Res Function(_ReceiptSummary) _then) = __$ReceiptSummaryCopyWithImpl;
@override @useResult
$Res call({
 String id, String receiptNumber, int amount, String receivedAt, ReceiptSummaryTenantRef tenant, ReceiptSummaryUnitRef unit, String downloadUrl
});


@override $ReceiptSummaryTenantRefCopyWith<$Res> get tenant;@override $ReceiptSummaryUnitRefCopyWith<$Res> get unit;

}
/// @nodoc
class __$ReceiptSummaryCopyWithImpl<$Res>
    implements _$ReceiptSummaryCopyWith<$Res> {
  __$ReceiptSummaryCopyWithImpl(this._self, this._then);

  final _ReceiptSummary _self;
  final $Res Function(_ReceiptSummary) _then;

/// Create a copy of ReceiptSummary
/// with the given fields replaced by the non-null parameter values.
@override @pragma('vm:prefer-inline') $Res call({Object? id = null,Object? receiptNumber = null,Object? amount = null,Object? receivedAt = null,Object? tenant = null,Object? unit = null,Object? downloadUrl = null,}) {
  return _then(_ReceiptSummary(
id: null == id ? _self.id : id // ignore: cast_nullable_to_non_nullable
as String,receiptNumber: null == receiptNumber ? _self.receiptNumber : receiptNumber // ignore: cast_nullable_to_non_nullable
as String,amount: null == amount ? _self.amount : amount // ignore: cast_nullable_to_non_nullable
as int,receivedAt: null == receivedAt ? _self.receivedAt : receivedAt // ignore: cast_nullable_to_non_nullable
as String,tenant: null == tenant ? _self.tenant : tenant // ignore: cast_nullable_to_non_nullable
as ReceiptSummaryTenantRef,unit: null == unit ? _self.unit : unit // ignore: cast_nullable_to_non_nullable
as ReceiptSummaryUnitRef,downloadUrl: null == downloadUrl ? _self.downloadUrl : downloadUrl // ignore: cast_nullable_to_non_nullable
as String,
  ));
}

/// Create a copy of ReceiptSummary
/// with the given fields replaced by the non-null parameter values.
@override
@pragma('vm:prefer-inline')
$ReceiptSummaryTenantRefCopyWith<$Res> get tenant {
  
  return $ReceiptSummaryTenantRefCopyWith<$Res>(_self.tenant, (value) {
    return _then(_self.copyWith(tenant: value));
  });
}/// Create a copy of ReceiptSummary
/// with the given fields replaced by the non-null parameter values.
@override
@pragma('vm:prefer-inline')
$ReceiptSummaryUnitRefCopyWith<$Res> get unit {
  
  return $ReceiptSummaryUnitRefCopyWith<$Res>(_self.unit, (value) {
    return _then(_self.copyWith(unit: value));
  });
}
}

// dart format on
