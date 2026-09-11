// GENERATED CODE - DO NOT MODIFY BY HAND
// coverage:ignore-file
// ignore_for_file: type=lint
// ignore_for_file: unused_element, deprecated_member_use, deprecated_member_use_from_same_package, use_function_type_syntax_for_parameters, unnecessary_const, avoid_init_to_null, invalid_override_different_default_values_named, prefer_expression_function_bodies, annotate_overrides, invalid_annotation_target, unnecessary_question_mark

part of 'cash_receipt_result.dart';

// **************************************************************************
// FreezedGenerator
// **************************************************************************

// dart format off
T _$identity<T>(T value) => value;

/// @nodoc
mixin _$CashReceiptTenantRef {

 String get id; String get displayName;
/// Create a copy of CashReceiptTenantRef
/// with the given fields replaced by the non-null parameter values.
@JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
$CashReceiptTenantRefCopyWith<CashReceiptTenantRef> get copyWith => _$CashReceiptTenantRefCopyWithImpl<CashReceiptTenantRef>(this as CashReceiptTenantRef, _$identity);

  /// Serializes this CashReceiptTenantRef to a JSON map.
  Map<String, dynamic> toJson();


@override
bool operator ==(Object other) {
  return identical(this, other) || (other.runtimeType == runtimeType&&other is CashReceiptTenantRef&&(identical(other.id, id) || other.id == id)&&(identical(other.displayName, displayName) || other.displayName == displayName));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode => Object.hash(runtimeType,id,displayName);

@override
String toString() {
  return 'CashReceiptTenantRef(id: $id, displayName: $displayName)';
}


}

/// @nodoc
abstract mixin class $CashReceiptTenantRefCopyWith<$Res>  {
  factory $CashReceiptTenantRefCopyWith(CashReceiptTenantRef value, $Res Function(CashReceiptTenantRef) _then) = _$CashReceiptTenantRefCopyWithImpl;
@useResult
$Res call({
 String id, String displayName
});




}
/// @nodoc
class _$CashReceiptTenantRefCopyWithImpl<$Res>
    implements $CashReceiptTenantRefCopyWith<$Res> {
  _$CashReceiptTenantRefCopyWithImpl(this._self, this._then);

  final CashReceiptTenantRef _self;
  final $Res Function(CashReceiptTenantRef) _then;

/// Create a copy of CashReceiptTenantRef
/// with the given fields replaced by the non-null parameter values.
@pragma('vm:prefer-inline') @override $Res call({Object? id = null,Object? displayName = null,}) {
  return _then(_self.copyWith(
id: null == id ? _self.id : id // ignore: cast_nullable_to_non_nullable
as String,displayName: null == displayName ? _self.displayName : displayName // ignore: cast_nullable_to_non_nullable
as String,
  ));
}

}


/// Adds pattern-matching-related methods to [CashReceiptTenantRef].
extension CashReceiptTenantRefPatterns on CashReceiptTenantRef {
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

@optionalTypeArgs TResult maybeMap<TResult extends Object?>(TResult Function( _CashReceiptTenantRef value)?  $default,{required TResult orElse(),}){
final _that = this;
switch (_that) {
case _CashReceiptTenantRef() when $default != null:
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

@optionalTypeArgs TResult map<TResult extends Object?>(TResult Function( _CashReceiptTenantRef value)  $default,){
final _that = this;
switch (_that) {
case _CashReceiptTenantRef():
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

@optionalTypeArgs TResult? mapOrNull<TResult extends Object?>(TResult? Function( _CashReceiptTenantRef value)?  $default,){
final _that = this;
switch (_that) {
case _CashReceiptTenantRef() when $default != null:
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
case _CashReceiptTenantRef() when $default != null:
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
case _CashReceiptTenantRef():
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
case _CashReceiptTenantRef() when $default != null:
return $default(_that.id,_that.displayName);case _:
  return null;

}
}

}

/// @nodoc
@JsonSerializable()

class _CashReceiptTenantRef implements CashReceiptTenantRef {
  const _CashReceiptTenantRef({required this.id, required this.displayName});
  factory _CashReceiptTenantRef.fromJson(Map<String, dynamic> json) => _$CashReceiptTenantRefFromJson(json);

@override final  String id;
@override final  String displayName;

/// Create a copy of CashReceiptTenantRef
/// with the given fields replaced by the non-null parameter values.
@override @JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
_$CashReceiptTenantRefCopyWith<_CashReceiptTenantRef> get copyWith => __$CashReceiptTenantRefCopyWithImpl<_CashReceiptTenantRef>(this, _$identity);

@override
Map<String, dynamic> toJson() {
  return _$CashReceiptTenantRefToJson(this, );
}

@override
bool operator ==(Object other) {
  return identical(this, other) || (other.runtimeType == runtimeType&&other is _CashReceiptTenantRef&&(identical(other.id, id) || other.id == id)&&(identical(other.displayName, displayName) || other.displayName == displayName));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode => Object.hash(runtimeType,id,displayName);

@override
String toString() {
  return 'CashReceiptTenantRef(id: $id, displayName: $displayName)';
}


}

/// @nodoc
abstract mixin class _$CashReceiptTenantRefCopyWith<$Res> implements $CashReceiptTenantRefCopyWith<$Res> {
  factory _$CashReceiptTenantRefCopyWith(_CashReceiptTenantRef value, $Res Function(_CashReceiptTenantRef) _then) = __$CashReceiptTenantRefCopyWithImpl;
@override @useResult
$Res call({
 String id, String displayName
});




}
/// @nodoc
class __$CashReceiptTenantRefCopyWithImpl<$Res>
    implements _$CashReceiptTenantRefCopyWith<$Res> {
  __$CashReceiptTenantRefCopyWithImpl(this._self, this._then);

  final _CashReceiptTenantRef _self;
  final $Res Function(_CashReceiptTenantRef) _then;

/// Create a copy of CashReceiptTenantRef
/// with the given fields replaced by the non-null parameter values.
@override @pragma('vm:prefer-inline') $Res call({Object? id = null,Object? displayName = null,}) {
  return _then(_CashReceiptTenantRef(
id: null == id ? _self.id : id // ignore: cast_nullable_to_non_nullable
as String,displayName: null == displayName ? _self.displayName : displayName // ignore: cast_nullable_to_non_nullable
as String,
  ));
}


}


/// @nodoc
mixin _$CashReceiptResult {

 String get id; String get receiptNumber; String get status; int get amount; String get receivedAt; CashReceiptTenantRef get tenant; String? get documentId; String? get clientRef;
/// Create a copy of CashReceiptResult
/// with the given fields replaced by the non-null parameter values.
@JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
$CashReceiptResultCopyWith<CashReceiptResult> get copyWith => _$CashReceiptResultCopyWithImpl<CashReceiptResult>(this as CashReceiptResult, _$identity);

  /// Serializes this CashReceiptResult to a JSON map.
  Map<String, dynamic> toJson();


@override
bool operator ==(Object other) {
  return identical(this, other) || (other.runtimeType == runtimeType&&other is CashReceiptResult&&(identical(other.id, id) || other.id == id)&&(identical(other.receiptNumber, receiptNumber) || other.receiptNumber == receiptNumber)&&(identical(other.status, status) || other.status == status)&&(identical(other.amount, amount) || other.amount == amount)&&(identical(other.receivedAt, receivedAt) || other.receivedAt == receivedAt)&&(identical(other.tenant, tenant) || other.tenant == tenant)&&(identical(other.documentId, documentId) || other.documentId == documentId)&&(identical(other.clientRef, clientRef) || other.clientRef == clientRef));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode => Object.hash(runtimeType,id,receiptNumber,status,amount,receivedAt,tenant,documentId,clientRef);

@override
String toString() {
  return 'CashReceiptResult(id: $id, receiptNumber: $receiptNumber, status: $status, amount: $amount, receivedAt: $receivedAt, tenant: $tenant, documentId: $documentId, clientRef: $clientRef)';
}


}

/// @nodoc
abstract mixin class $CashReceiptResultCopyWith<$Res>  {
  factory $CashReceiptResultCopyWith(CashReceiptResult value, $Res Function(CashReceiptResult) _then) = _$CashReceiptResultCopyWithImpl;
@useResult
$Res call({
 String id, String receiptNumber, String status, int amount, String receivedAt, CashReceiptTenantRef tenant, String? documentId, String? clientRef
});


$CashReceiptTenantRefCopyWith<$Res> get tenant;

}
/// @nodoc
class _$CashReceiptResultCopyWithImpl<$Res>
    implements $CashReceiptResultCopyWith<$Res> {
  _$CashReceiptResultCopyWithImpl(this._self, this._then);

  final CashReceiptResult _self;
  final $Res Function(CashReceiptResult) _then;

/// Create a copy of CashReceiptResult
/// with the given fields replaced by the non-null parameter values.
@pragma('vm:prefer-inline') @override $Res call({Object? id = null,Object? receiptNumber = null,Object? status = null,Object? amount = null,Object? receivedAt = null,Object? tenant = null,Object? documentId = freezed,Object? clientRef = freezed,}) {
  return _then(_self.copyWith(
id: null == id ? _self.id : id // ignore: cast_nullable_to_non_nullable
as String,receiptNumber: null == receiptNumber ? _self.receiptNumber : receiptNumber // ignore: cast_nullable_to_non_nullable
as String,status: null == status ? _self.status : status // ignore: cast_nullable_to_non_nullable
as String,amount: null == amount ? _self.amount : amount // ignore: cast_nullable_to_non_nullable
as int,receivedAt: null == receivedAt ? _self.receivedAt : receivedAt // ignore: cast_nullable_to_non_nullable
as String,tenant: null == tenant ? _self.tenant : tenant // ignore: cast_nullable_to_non_nullable
as CashReceiptTenantRef,documentId: freezed == documentId ? _self.documentId : documentId // ignore: cast_nullable_to_non_nullable
as String?,clientRef: freezed == clientRef ? _self.clientRef : clientRef // ignore: cast_nullable_to_non_nullable
as String?,
  ));
}
/// Create a copy of CashReceiptResult
/// with the given fields replaced by the non-null parameter values.
@override
@pragma('vm:prefer-inline')
$CashReceiptTenantRefCopyWith<$Res> get tenant {
  
  return $CashReceiptTenantRefCopyWith<$Res>(_self.tenant, (value) {
    return _then(_self.copyWith(tenant: value));
  });
}
}


/// Adds pattern-matching-related methods to [CashReceiptResult].
extension CashReceiptResultPatterns on CashReceiptResult {
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

@optionalTypeArgs TResult maybeMap<TResult extends Object?>(TResult Function( _CashReceiptResult value)?  $default,{required TResult orElse(),}){
final _that = this;
switch (_that) {
case _CashReceiptResult() when $default != null:
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

@optionalTypeArgs TResult map<TResult extends Object?>(TResult Function( _CashReceiptResult value)  $default,){
final _that = this;
switch (_that) {
case _CashReceiptResult():
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

@optionalTypeArgs TResult? mapOrNull<TResult extends Object?>(TResult? Function( _CashReceiptResult value)?  $default,){
final _that = this;
switch (_that) {
case _CashReceiptResult() when $default != null:
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

@optionalTypeArgs TResult maybeWhen<TResult extends Object?>(TResult Function( String id,  String receiptNumber,  String status,  int amount,  String receivedAt,  CashReceiptTenantRef tenant,  String? documentId,  String? clientRef)?  $default,{required TResult orElse(),}) {final _that = this;
switch (_that) {
case _CashReceiptResult() when $default != null:
return $default(_that.id,_that.receiptNumber,_that.status,_that.amount,_that.receivedAt,_that.tenant,_that.documentId,_that.clientRef);case _:
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

@optionalTypeArgs TResult when<TResult extends Object?>(TResult Function( String id,  String receiptNumber,  String status,  int amount,  String receivedAt,  CashReceiptTenantRef tenant,  String? documentId,  String? clientRef)  $default,) {final _that = this;
switch (_that) {
case _CashReceiptResult():
return $default(_that.id,_that.receiptNumber,_that.status,_that.amount,_that.receivedAt,_that.tenant,_that.documentId,_that.clientRef);case _:
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

@optionalTypeArgs TResult? whenOrNull<TResult extends Object?>(TResult? Function( String id,  String receiptNumber,  String status,  int amount,  String receivedAt,  CashReceiptTenantRef tenant,  String? documentId,  String? clientRef)?  $default,) {final _that = this;
switch (_that) {
case _CashReceiptResult() when $default != null:
return $default(_that.id,_that.receiptNumber,_that.status,_that.amount,_that.receivedAt,_that.tenant,_that.documentId,_that.clientRef);case _:
  return null;

}
}

}

/// @nodoc
@JsonSerializable()

class _CashReceiptResult implements CashReceiptResult {
  const _CashReceiptResult({required this.id, required this.receiptNumber, required this.status, required this.amount, required this.receivedAt, required this.tenant, this.documentId, this.clientRef});
  factory _CashReceiptResult.fromJson(Map<String, dynamic> json) => _$CashReceiptResultFromJson(json);

@override final  String id;
@override final  String receiptNumber;
@override final  String status;
@override final  int amount;
@override final  String receivedAt;
@override final  CashReceiptTenantRef tenant;
@override final  String? documentId;
@override final  String? clientRef;

/// Create a copy of CashReceiptResult
/// with the given fields replaced by the non-null parameter values.
@override @JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
_$CashReceiptResultCopyWith<_CashReceiptResult> get copyWith => __$CashReceiptResultCopyWithImpl<_CashReceiptResult>(this, _$identity);

@override
Map<String, dynamic> toJson() {
  return _$CashReceiptResultToJson(this, );
}

@override
bool operator ==(Object other) {
  return identical(this, other) || (other.runtimeType == runtimeType&&other is _CashReceiptResult&&(identical(other.id, id) || other.id == id)&&(identical(other.receiptNumber, receiptNumber) || other.receiptNumber == receiptNumber)&&(identical(other.status, status) || other.status == status)&&(identical(other.amount, amount) || other.amount == amount)&&(identical(other.receivedAt, receivedAt) || other.receivedAt == receivedAt)&&(identical(other.tenant, tenant) || other.tenant == tenant)&&(identical(other.documentId, documentId) || other.documentId == documentId)&&(identical(other.clientRef, clientRef) || other.clientRef == clientRef));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode => Object.hash(runtimeType,id,receiptNumber,status,amount,receivedAt,tenant,documentId,clientRef);

@override
String toString() {
  return 'CashReceiptResult(id: $id, receiptNumber: $receiptNumber, status: $status, amount: $amount, receivedAt: $receivedAt, tenant: $tenant, documentId: $documentId, clientRef: $clientRef)';
}


}

/// @nodoc
abstract mixin class _$CashReceiptResultCopyWith<$Res> implements $CashReceiptResultCopyWith<$Res> {
  factory _$CashReceiptResultCopyWith(_CashReceiptResult value, $Res Function(_CashReceiptResult) _then) = __$CashReceiptResultCopyWithImpl;
@override @useResult
$Res call({
 String id, String receiptNumber, String status, int amount, String receivedAt, CashReceiptTenantRef tenant, String? documentId, String? clientRef
});


@override $CashReceiptTenantRefCopyWith<$Res> get tenant;

}
/// @nodoc
class __$CashReceiptResultCopyWithImpl<$Res>
    implements _$CashReceiptResultCopyWith<$Res> {
  __$CashReceiptResultCopyWithImpl(this._self, this._then);

  final _CashReceiptResult _self;
  final $Res Function(_CashReceiptResult) _then;

/// Create a copy of CashReceiptResult
/// with the given fields replaced by the non-null parameter values.
@override @pragma('vm:prefer-inline') $Res call({Object? id = null,Object? receiptNumber = null,Object? status = null,Object? amount = null,Object? receivedAt = null,Object? tenant = null,Object? documentId = freezed,Object? clientRef = freezed,}) {
  return _then(_CashReceiptResult(
id: null == id ? _self.id : id // ignore: cast_nullable_to_non_nullable
as String,receiptNumber: null == receiptNumber ? _self.receiptNumber : receiptNumber // ignore: cast_nullable_to_non_nullable
as String,status: null == status ? _self.status : status // ignore: cast_nullable_to_non_nullable
as String,amount: null == amount ? _self.amount : amount // ignore: cast_nullable_to_non_nullable
as int,receivedAt: null == receivedAt ? _self.receivedAt : receivedAt // ignore: cast_nullable_to_non_nullable
as String,tenant: null == tenant ? _self.tenant : tenant // ignore: cast_nullable_to_non_nullable
as CashReceiptTenantRef,documentId: freezed == documentId ? _self.documentId : documentId // ignore: cast_nullable_to_non_nullable
as String?,clientRef: freezed == clientRef ? _self.clientRef : clientRef // ignore: cast_nullable_to_non_nullable
as String?,
  ));
}

/// Create a copy of CashReceiptResult
/// with the given fields replaced by the non-null parameter values.
@override
@pragma('vm:prefer-inline')
$CashReceiptTenantRefCopyWith<$Res> get tenant {
  
  return $CashReceiptTenantRefCopyWith<$Res>(_self.tenant, (value) {
    return _then(_self.copyWith(tenant: value));
  });
}
}

// dart format on
