// GENERATED CODE - DO NOT MODIFY BY HAND
// coverage:ignore-file
// ignore_for_file: type=lint
// ignore_for_file: unused_element, deprecated_member_use, deprecated_member_use_from_same_package, use_function_type_syntax_for_parameters, unnecessary_const, avoid_init_to_null, invalid_override_different_default_values_named, prefer_expression_function_bodies, annotate_overrides, invalid_annotation_target, unnecessary_question_mark

part of 'cash_receipt_summary.dart';

// **************************************************************************
// FreezedGenerator
// **************************************************************************

// dart format off
T _$identity<T>(T value) => value;

/// @nodoc
mixin _$CashReceiptSummaryTenantRef {

 String get id; String get displayName;
/// Create a copy of CashReceiptSummaryTenantRef
/// with the given fields replaced by the non-null parameter values.
@JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
$CashReceiptSummaryTenantRefCopyWith<CashReceiptSummaryTenantRef> get copyWith => _$CashReceiptSummaryTenantRefCopyWithImpl<CashReceiptSummaryTenantRef>(this as CashReceiptSummaryTenantRef, _$identity);

  /// Serializes this CashReceiptSummaryTenantRef to a JSON map.
  Map<String, dynamic> toJson();


@override
bool operator ==(Object other) {
  return identical(this, other) || (other.runtimeType == runtimeType&&other is CashReceiptSummaryTenantRef&&(identical(other.id, id) || other.id == id)&&(identical(other.displayName, displayName) || other.displayName == displayName));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode => Object.hash(runtimeType,id,displayName);

@override
String toString() {
  return 'CashReceiptSummaryTenantRef(id: $id, displayName: $displayName)';
}


}

/// @nodoc
abstract mixin class $CashReceiptSummaryTenantRefCopyWith<$Res>  {
  factory $CashReceiptSummaryTenantRefCopyWith(CashReceiptSummaryTenantRef value, $Res Function(CashReceiptSummaryTenantRef) _then) = _$CashReceiptSummaryTenantRefCopyWithImpl;
@useResult
$Res call({
 String id, String displayName
});




}
/// @nodoc
class _$CashReceiptSummaryTenantRefCopyWithImpl<$Res>
    implements $CashReceiptSummaryTenantRefCopyWith<$Res> {
  _$CashReceiptSummaryTenantRefCopyWithImpl(this._self, this._then);

  final CashReceiptSummaryTenantRef _self;
  final $Res Function(CashReceiptSummaryTenantRef) _then;

/// Create a copy of CashReceiptSummaryTenantRef
/// with the given fields replaced by the non-null parameter values.
@pragma('vm:prefer-inline') @override $Res call({Object? id = null,Object? displayName = null,}) {
  return _then(_self.copyWith(
id: null == id ? _self.id : id // ignore: cast_nullable_to_non_nullable
as String,displayName: null == displayName ? _self.displayName : displayName // ignore: cast_nullable_to_non_nullable
as String,
  ));
}

}


/// Adds pattern-matching-related methods to [CashReceiptSummaryTenantRef].
extension CashReceiptSummaryTenantRefPatterns on CashReceiptSummaryTenantRef {
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

@optionalTypeArgs TResult maybeMap<TResult extends Object?>(TResult Function( _CashReceiptSummaryTenantRef value)?  $default,{required TResult orElse(),}){
final _that = this;
switch (_that) {
case _CashReceiptSummaryTenantRef() when $default != null:
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

@optionalTypeArgs TResult map<TResult extends Object?>(TResult Function( _CashReceiptSummaryTenantRef value)  $default,){
final _that = this;
switch (_that) {
case _CashReceiptSummaryTenantRef():
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

@optionalTypeArgs TResult? mapOrNull<TResult extends Object?>(TResult? Function( _CashReceiptSummaryTenantRef value)?  $default,){
final _that = this;
switch (_that) {
case _CashReceiptSummaryTenantRef() when $default != null:
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
case _CashReceiptSummaryTenantRef() when $default != null:
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
case _CashReceiptSummaryTenantRef():
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
case _CashReceiptSummaryTenantRef() when $default != null:
return $default(_that.id,_that.displayName);case _:
  return null;

}
}

}

/// @nodoc
@JsonSerializable()

class _CashReceiptSummaryTenantRef implements CashReceiptSummaryTenantRef {
  const _CashReceiptSummaryTenantRef({required this.id, required this.displayName});
  factory _CashReceiptSummaryTenantRef.fromJson(Map<String, dynamic> json) => _$CashReceiptSummaryTenantRefFromJson(json);

@override final  String id;
@override final  String displayName;

/// Create a copy of CashReceiptSummaryTenantRef
/// with the given fields replaced by the non-null parameter values.
@override @JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
_$CashReceiptSummaryTenantRefCopyWith<_CashReceiptSummaryTenantRef> get copyWith => __$CashReceiptSummaryTenantRefCopyWithImpl<_CashReceiptSummaryTenantRef>(this, _$identity);

@override
Map<String, dynamic> toJson() {
  return _$CashReceiptSummaryTenantRefToJson(this, );
}

@override
bool operator ==(Object other) {
  return identical(this, other) || (other.runtimeType == runtimeType&&other is _CashReceiptSummaryTenantRef&&(identical(other.id, id) || other.id == id)&&(identical(other.displayName, displayName) || other.displayName == displayName));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode => Object.hash(runtimeType,id,displayName);

@override
String toString() {
  return 'CashReceiptSummaryTenantRef(id: $id, displayName: $displayName)';
}


}

/// @nodoc
abstract mixin class _$CashReceiptSummaryTenantRefCopyWith<$Res> implements $CashReceiptSummaryTenantRefCopyWith<$Res> {
  factory _$CashReceiptSummaryTenantRefCopyWith(_CashReceiptSummaryTenantRef value, $Res Function(_CashReceiptSummaryTenantRef) _then) = __$CashReceiptSummaryTenantRefCopyWithImpl;
@override @useResult
$Res call({
 String id, String displayName
});




}
/// @nodoc
class __$CashReceiptSummaryTenantRefCopyWithImpl<$Res>
    implements _$CashReceiptSummaryTenantRefCopyWith<$Res> {
  __$CashReceiptSummaryTenantRefCopyWithImpl(this._self, this._then);

  final _CashReceiptSummaryTenantRef _self;
  final $Res Function(_CashReceiptSummaryTenantRef) _then;

/// Create a copy of CashReceiptSummaryTenantRef
/// with the given fields replaced by the non-null parameter values.
@override @pragma('vm:prefer-inline') $Res call({Object? id = null,Object? displayName = null,}) {
  return _then(_CashReceiptSummaryTenantRef(
id: null == id ? _self.id : id // ignore: cast_nullable_to_non_nullable
as String,displayName: null == displayName ? _self.displayName : displayName // ignore: cast_nullable_to_non_nullable
as String,
  ));
}


}


/// @nodoc
mixin _$CashReceiptSummary {

 String get id; String get receiptNumber; CashReceiptStatus get status; int get amount; String get receivedAt; CashReceiptSummaryTenantRef get tenant; String get collectorUserId; String get collectorName; String? get remittanceId; String? get paymentId;
/// Create a copy of CashReceiptSummary
/// with the given fields replaced by the non-null parameter values.
@JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
$CashReceiptSummaryCopyWith<CashReceiptSummary> get copyWith => _$CashReceiptSummaryCopyWithImpl<CashReceiptSummary>(this as CashReceiptSummary, _$identity);

  /// Serializes this CashReceiptSummary to a JSON map.
  Map<String, dynamic> toJson();


@override
bool operator ==(Object other) {
  return identical(this, other) || (other.runtimeType == runtimeType&&other is CashReceiptSummary&&(identical(other.id, id) || other.id == id)&&(identical(other.receiptNumber, receiptNumber) || other.receiptNumber == receiptNumber)&&(identical(other.status, status) || other.status == status)&&(identical(other.amount, amount) || other.amount == amount)&&(identical(other.receivedAt, receivedAt) || other.receivedAt == receivedAt)&&(identical(other.tenant, tenant) || other.tenant == tenant)&&(identical(other.collectorUserId, collectorUserId) || other.collectorUserId == collectorUserId)&&(identical(other.collectorName, collectorName) || other.collectorName == collectorName)&&(identical(other.remittanceId, remittanceId) || other.remittanceId == remittanceId)&&(identical(other.paymentId, paymentId) || other.paymentId == paymentId));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode => Object.hash(runtimeType,id,receiptNumber,status,amount,receivedAt,tenant,collectorUserId,collectorName,remittanceId,paymentId);

@override
String toString() {
  return 'CashReceiptSummary(id: $id, receiptNumber: $receiptNumber, status: $status, amount: $amount, receivedAt: $receivedAt, tenant: $tenant, collectorUserId: $collectorUserId, collectorName: $collectorName, remittanceId: $remittanceId, paymentId: $paymentId)';
}


}

/// @nodoc
abstract mixin class $CashReceiptSummaryCopyWith<$Res>  {
  factory $CashReceiptSummaryCopyWith(CashReceiptSummary value, $Res Function(CashReceiptSummary) _then) = _$CashReceiptSummaryCopyWithImpl;
@useResult
$Res call({
 String id, String receiptNumber, CashReceiptStatus status, int amount, String receivedAt, CashReceiptSummaryTenantRef tenant, String collectorUserId, String collectorName, String? remittanceId, String? paymentId
});


$CashReceiptSummaryTenantRefCopyWith<$Res> get tenant;

}
/// @nodoc
class _$CashReceiptSummaryCopyWithImpl<$Res>
    implements $CashReceiptSummaryCopyWith<$Res> {
  _$CashReceiptSummaryCopyWithImpl(this._self, this._then);

  final CashReceiptSummary _self;
  final $Res Function(CashReceiptSummary) _then;

/// Create a copy of CashReceiptSummary
/// with the given fields replaced by the non-null parameter values.
@pragma('vm:prefer-inline') @override $Res call({Object? id = null,Object? receiptNumber = null,Object? status = null,Object? amount = null,Object? receivedAt = null,Object? tenant = null,Object? collectorUserId = null,Object? collectorName = null,Object? remittanceId = freezed,Object? paymentId = freezed,}) {
  return _then(_self.copyWith(
id: null == id ? _self.id : id // ignore: cast_nullable_to_non_nullable
as String,receiptNumber: null == receiptNumber ? _self.receiptNumber : receiptNumber // ignore: cast_nullable_to_non_nullable
as String,status: null == status ? _self.status : status // ignore: cast_nullable_to_non_nullable
as CashReceiptStatus,amount: null == amount ? _self.amount : amount // ignore: cast_nullable_to_non_nullable
as int,receivedAt: null == receivedAt ? _self.receivedAt : receivedAt // ignore: cast_nullable_to_non_nullable
as String,tenant: null == tenant ? _self.tenant : tenant // ignore: cast_nullable_to_non_nullable
as CashReceiptSummaryTenantRef,collectorUserId: null == collectorUserId ? _self.collectorUserId : collectorUserId // ignore: cast_nullable_to_non_nullable
as String,collectorName: null == collectorName ? _self.collectorName : collectorName // ignore: cast_nullable_to_non_nullable
as String,remittanceId: freezed == remittanceId ? _self.remittanceId : remittanceId // ignore: cast_nullable_to_non_nullable
as String?,paymentId: freezed == paymentId ? _self.paymentId : paymentId // ignore: cast_nullable_to_non_nullable
as String?,
  ));
}
/// Create a copy of CashReceiptSummary
/// with the given fields replaced by the non-null parameter values.
@override
@pragma('vm:prefer-inline')
$CashReceiptSummaryTenantRefCopyWith<$Res> get tenant {
  
  return $CashReceiptSummaryTenantRefCopyWith<$Res>(_self.tenant, (value) {
    return _then(_self.copyWith(tenant: value));
  });
}
}


/// Adds pattern-matching-related methods to [CashReceiptSummary].
extension CashReceiptSummaryPatterns on CashReceiptSummary {
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

@optionalTypeArgs TResult maybeMap<TResult extends Object?>(TResult Function( _CashReceiptSummary value)?  $default,{required TResult orElse(),}){
final _that = this;
switch (_that) {
case _CashReceiptSummary() when $default != null:
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

@optionalTypeArgs TResult map<TResult extends Object?>(TResult Function( _CashReceiptSummary value)  $default,){
final _that = this;
switch (_that) {
case _CashReceiptSummary():
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

@optionalTypeArgs TResult? mapOrNull<TResult extends Object?>(TResult? Function( _CashReceiptSummary value)?  $default,){
final _that = this;
switch (_that) {
case _CashReceiptSummary() when $default != null:
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

@optionalTypeArgs TResult maybeWhen<TResult extends Object?>(TResult Function( String id,  String receiptNumber,  CashReceiptStatus status,  int amount,  String receivedAt,  CashReceiptSummaryTenantRef tenant,  String collectorUserId,  String collectorName,  String? remittanceId,  String? paymentId)?  $default,{required TResult orElse(),}) {final _that = this;
switch (_that) {
case _CashReceiptSummary() when $default != null:
return $default(_that.id,_that.receiptNumber,_that.status,_that.amount,_that.receivedAt,_that.tenant,_that.collectorUserId,_that.collectorName,_that.remittanceId,_that.paymentId);case _:
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

@optionalTypeArgs TResult when<TResult extends Object?>(TResult Function( String id,  String receiptNumber,  CashReceiptStatus status,  int amount,  String receivedAt,  CashReceiptSummaryTenantRef tenant,  String collectorUserId,  String collectorName,  String? remittanceId,  String? paymentId)  $default,) {final _that = this;
switch (_that) {
case _CashReceiptSummary():
return $default(_that.id,_that.receiptNumber,_that.status,_that.amount,_that.receivedAt,_that.tenant,_that.collectorUserId,_that.collectorName,_that.remittanceId,_that.paymentId);case _:
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

@optionalTypeArgs TResult? whenOrNull<TResult extends Object?>(TResult? Function( String id,  String receiptNumber,  CashReceiptStatus status,  int amount,  String receivedAt,  CashReceiptSummaryTenantRef tenant,  String collectorUserId,  String collectorName,  String? remittanceId,  String? paymentId)?  $default,) {final _that = this;
switch (_that) {
case _CashReceiptSummary() when $default != null:
return $default(_that.id,_that.receiptNumber,_that.status,_that.amount,_that.receivedAt,_that.tenant,_that.collectorUserId,_that.collectorName,_that.remittanceId,_that.paymentId);case _:
  return null;

}
}

}

/// @nodoc
@JsonSerializable()

class _CashReceiptSummary implements CashReceiptSummary {
  const _CashReceiptSummary({required this.id, required this.receiptNumber, required this.status, required this.amount, required this.receivedAt, required this.tenant, required this.collectorUserId, required this.collectorName, this.remittanceId, this.paymentId});
  factory _CashReceiptSummary.fromJson(Map<String, dynamic> json) => _$CashReceiptSummaryFromJson(json);

@override final  String id;
@override final  String receiptNumber;
@override final  CashReceiptStatus status;
@override final  int amount;
@override final  String receivedAt;
@override final  CashReceiptSummaryTenantRef tenant;
@override final  String collectorUserId;
@override final  String collectorName;
@override final  String? remittanceId;
@override final  String? paymentId;

/// Create a copy of CashReceiptSummary
/// with the given fields replaced by the non-null parameter values.
@override @JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
_$CashReceiptSummaryCopyWith<_CashReceiptSummary> get copyWith => __$CashReceiptSummaryCopyWithImpl<_CashReceiptSummary>(this, _$identity);

@override
Map<String, dynamic> toJson() {
  return _$CashReceiptSummaryToJson(this, );
}

@override
bool operator ==(Object other) {
  return identical(this, other) || (other.runtimeType == runtimeType&&other is _CashReceiptSummary&&(identical(other.id, id) || other.id == id)&&(identical(other.receiptNumber, receiptNumber) || other.receiptNumber == receiptNumber)&&(identical(other.status, status) || other.status == status)&&(identical(other.amount, amount) || other.amount == amount)&&(identical(other.receivedAt, receivedAt) || other.receivedAt == receivedAt)&&(identical(other.tenant, tenant) || other.tenant == tenant)&&(identical(other.collectorUserId, collectorUserId) || other.collectorUserId == collectorUserId)&&(identical(other.collectorName, collectorName) || other.collectorName == collectorName)&&(identical(other.remittanceId, remittanceId) || other.remittanceId == remittanceId)&&(identical(other.paymentId, paymentId) || other.paymentId == paymentId));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode => Object.hash(runtimeType,id,receiptNumber,status,amount,receivedAt,tenant,collectorUserId,collectorName,remittanceId,paymentId);

@override
String toString() {
  return 'CashReceiptSummary(id: $id, receiptNumber: $receiptNumber, status: $status, amount: $amount, receivedAt: $receivedAt, tenant: $tenant, collectorUserId: $collectorUserId, collectorName: $collectorName, remittanceId: $remittanceId, paymentId: $paymentId)';
}


}

/// @nodoc
abstract mixin class _$CashReceiptSummaryCopyWith<$Res> implements $CashReceiptSummaryCopyWith<$Res> {
  factory _$CashReceiptSummaryCopyWith(_CashReceiptSummary value, $Res Function(_CashReceiptSummary) _then) = __$CashReceiptSummaryCopyWithImpl;
@override @useResult
$Res call({
 String id, String receiptNumber, CashReceiptStatus status, int amount, String receivedAt, CashReceiptSummaryTenantRef tenant, String collectorUserId, String collectorName, String? remittanceId, String? paymentId
});


@override $CashReceiptSummaryTenantRefCopyWith<$Res> get tenant;

}
/// @nodoc
class __$CashReceiptSummaryCopyWithImpl<$Res>
    implements _$CashReceiptSummaryCopyWith<$Res> {
  __$CashReceiptSummaryCopyWithImpl(this._self, this._then);

  final _CashReceiptSummary _self;
  final $Res Function(_CashReceiptSummary) _then;

/// Create a copy of CashReceiptSummary
/// with the given fields replaced by the non-null parameter values.
@override @pragma('vm:prefer-inline') $Res call({Object? id = null,Object? receiptNumber = null,Object? status = null,Object? amount = null,Object? receivedAt = null,Object? tenant = null,Object? collectorUserId = null,Object? collectorName = null,Object? remittanceId = freezed,Object? paymentId = freezed,}) {
  return _then(_CashReceiptSummary(
id: null == id ? _self.id : id // ignore: cast_nullable_to_non_nullable
as String,receiptNumber: null == receiptNumber ? _self.receiptNumber : receiptNumber // ignore: cast_nullable_to_non_nullable
as String,status: null == status ? _self.status : status // ignore: cast_nullable_to_non_nullable
as CashReceiptStatus,amount: null == amount ? _self.amount : amount // ignore: cast_nullable_to_non_nullable
as int,receivedAt: null == receivedAt ? _self.receivedAt : receivedAt // ignore: cast_nullable_to_non_nullable
as String,tenant: null == tenant ? _self.tenant : tenant // ignore: cast_nullable_to_non_nullable
as CashReceiptSummaryTenantRef,collectorUserId: null == collectorUserId ? _self.collectorUserId : collectorUserId // ignore: cast_nullable_to_non_nullable
as String,collectorName: null == collectorName ? _self.collectorName : collectorName // ignore: cast_nullable_to_non_nullable
as String,remittanceId: freezed == remittanceId ? _self.remittanceId : remittanceId // ignore: cast_nullable_to_non_nullable
as String?,paymentId: freezed == paymentId ? _self.paymentId : paymentId // ignore: cast_nullable_to_non_nullable
as String?,
  ));
}

/// Create a copy of CashReceiptSummary
/// with the given fields replaced by the non-null parameter values.
@override
@pragma('vm:prefer-inline')
$CashReceiptSummaryTenantRefCopyWith<$Res> get tenant {
  
  return $CashReceiptSummaryTenantRefCopyWith<$Res>(_self.tenant, (value) {
    return _then(_self.copyWith(tenant: value));
  });
}
}

// dart format on
