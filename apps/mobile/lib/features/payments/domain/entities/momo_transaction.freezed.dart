// GENERATED CODE - DO NOT MODIFY BY HAND
// coverage:ignore-file
// ignore_for_file: type=lint
// ignore_for_file: unused_element, deprecated_member_use, deprecated_member_use_from_same_package, use_function_type_syntax_for_parameters, unnecessary_const, avoid_init_to_null, invalid_override_different_default_values_named, prefer_expression_function_bodies, annotate_overrides, invalid_annotation_target, unnecessary_question_mark

part of 'momo_transaction.dart';

// **************************************************************************
// FreezedGenerator
// **************************************************************************

// dart format off
T _$identity<T>(T value) => value;

/// @nodoc
mixin _$MomoTransaction {

 String get id; String get channel; MomoStatus get status; MomoProvider get provider; String? get merchantReference; String? get providerTransactionId; String? get aggregatorTransactionId; String get payerMsisdn; String? get payeeMsisdn; int get amount; int get feeAmount; int? get netAmount; String? get paymentId; String? get rejectionReason; String? get failureCode; String? get failureMessage; String? get expiresAt; String? get clientRef;
/// Create a copy of MomoTransaction
/// with the given fields replaced by the non-null parameter values.
@JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
$MomoTransactionCopyWith<MomoTransaction> get copyWith => _$MomoTransactionCopyWithImpl<MomoTransaction>(this as MomoTransaction, _$identity);

  /// Serializes this MomoTransaction to a JSON map.
  Map<String, dynamic> toJson();


@override
bool operator ==(Object other) {
  return identical(this, other) || (other.runtimeType == runtimeType&&other is MomoTransaction&&(identical(other.id, id) || other.id == id)&&(identical(other.channel, channel) || other.channel == channel)&&(identical(other.status, status) || other.status == status)&&(identical(other.provider, provider) || other.provider == provider)&&(identical(other.merchantReference, merchantReference) || other.merchantReference == merchantReference)&&(identical(other.providerTransactionId, providerTransactionId) || other.providerTransactionId == providerTransactionId)&&(identical(other.aggregatorTransactionId, aggregatorTransactionId) || other.aggregatorTransactionId == aggregatorTransactionId)&&(identical(other.payerMsisdn, payerMsisdn) || other.payerMsisdn == payerMsisdn)&&(identical(other.payeeMsisdn, payeeMsisdn) || other.payeeMsisdn == payeeMsisdn)&&(identical(other.amount, amount) || other.amount == amount)&&(identical(other.feeAmount, feeAmount) || other.feeAmount == feeAmount)&&(identical(other.netAmount, netAmount) || other.netAmount == netAmount)&&(identical(other.paymentId, paymentId) || other.paymentId == paymentId)&&(identical(other.rejectionReason, rejectionReason) || other.rejectionReason == rejectionReason)&&(identical(other.failureCode, failureCode) || other.failureCode == failureCode)&&(identical(other.failureMessage, failureMessage) || other.failureMessage == failureMessage)&&(identical(other.expiresAt, expiresAt) || other.expiresAt == expiresAt)&&(identical(other.clientRef, clientRef) || other.clientRef == clientRef));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode => Object.hash(runtimeType,id,channel,status,provider,merchantReference,providerTransactionId,aggregatorTransactionId,payerMsisdn,payeeMsisdn,amount,feeAmount,netAmount,paymentId,rejectionReason,failureCode,failureMessage,expiresAt,clientRef);

@override
String toString() {
  return 'MomoTransaction(id: $id, channel: $channel, status: $status, provider: $provider, merchantReference: $merchantReference, providerTransactionId: $providerTransactionId, aggregatorTransactionId: $aggregatorTransactionId, payerMsisdn: $payerMsisdn, payeeMsisdn: $payeeMsisdn, amount: $amount, feeAmount: $feeAmount, netAmount: $netAmount, paymentId: $paymentId, rejectionReason: $rejectionReason, failureCode: $failureCode, failureMessage: $failureMessage, expiresAt: $expiresAt, clientRef: $clientRef)';
}


}

/// @nodoc
abstract mixin class $MomoTransactionCopyWith<$Res>  {
  factory $MomoTransactionCopyWith(MomoTransaction value, $Res Function(MomoTransaction) _then) = _$MomoTransactionCopyWithImpl;
@useResult
$Res call({
 String id, String channel, MomoStatus status, MomoProvider provider, String? merchantReference, String? providerTransactionId, String? aggregatorTransactionId, String payerMsisdn, String? payeeMsisdn, int amount, int feeAmount, int? netAmount, String? paymentId, String? rejectionReason, String? failureCode, String? failureMessage, String? expiresAt, String? clientRef
});




}
/// @nodoc
class _$MomoTransactionCopyWithImpl<$Res>
    implements $MomoTransactionCopyWith<$Res> {
  _$MomoTransactionCopyWithImpl(this._self, this._then);

  final MomoTransaction _self;
  final $Res Function(MomoTransaction) _then;

/// Create a copy of MomoTransaction
/// with the given fields replaced by the non-null parameter values.
@pragma('vm:prefer-inline') @override $Res call({Object? id = null,Object? channel = null,Object? status = null,Object? provider = null,Object? merchantReference = freezed,Object? providerTransactionId = freezed,Object? aggregatorTransactionId = freezed,Object? payerMsisdn = null,Object? payeeMsisdn = freezed,Object? amount = null,Object? feeAmount = null,Object? netAmount = freezed,Object? paymentId = freezed,Object? rejectionReason = freezed,Object? failureCode = freezed,Object? failureMessage = freezed,Object? expiresAt = freezed,Object? clientRef = freezed,}) {
  return _then(_self.copyWith(
id: null == id ? _self.id : id // ignore: cast_nullable_to_non_nullable
as String,channel: null == channel ? _self.channel : channel // ignore: cast_nullable_to_non_nullable
as String,status: null == status ? _self.status : status // ignore: cast_nullable_to_non_nullable
as MomoStatus,provider: null == provider ? _self.provider : provider // ignore: cast_nullable_to_non_nullable
as MomoProvider,merchantReference: freezed == merchantReference ? _self.merchantReference : merchantReference // ignore: cast_nullable_to_non_nullable
as String?,providerTransactionId: freezed == providerTransactionId ? _self.providerTransactionId : providerTransactionId // ignore: cast_nullable_to_non_nullable
as String?,aggregatorTransactionId: freezed == aggregatorTransactionId ? _self.aggregatorTransactionId : aggregatorTransactionId // ignore: cast_nullable_to_non_nullable
as String?,payerMsisdn: null == payerMsisdn ? _self.payerMsisdn : payerMsisdn // ignore: cast_nullable_to_non_nullable
as String,payeeMsisdn: freezed == payeeMsisdn ? _self.payeeMsisdn : payeeMsisdn // ignore: cast_nullable_to_non_nullable
as String?,amount: null == amount ? _self.amount : amount // ignore: cast_nullable_to_non_nullable
as int,feeAmount: null == feeAmount ? _self.feeAmount : feeAmount // ignore: cast_nullable_to_non_nullable
as int,netAmount: freezed == netAmount ? _self.netAmount : netAmount // ignore: cast_nullable_to_non_nullable
as int?,paymentId: freezed == paymentId ? _self.paymentId : paymentId // ignore: cast_nullable_to_non_nullable
as String?,rejectionReason: freezed == rejectionReason ? _self.rejectionReason : rejectionReason // ignore: cast_nullable_to_non_nullable
as String?,failureCode: freezed == failureCode ? _self.failureCode : failureCode // ignore: cast_nullable_to_non_nullable
as String?,failureMessage: freezed == failureMessage ? _self.failureMessage : failureMessage // ignore: cast_nullable_to_non_nullable
as String?,expiresAt: freezed == expiresAt ? _self.expiresAt : expiresAt // ignore: cast_nullable_to_non_nullable
as String?,clientRef: freezed == clientRef ? _self.clientRef : clientRef // ignore: cast_nullable_to_non_nullable
as String?,
  ));
}

}


/// Adds pattern-matching-related methods to [MomoTransaction].
extension MomoTransactionPatterns on MomoTransaction {
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

@optionalTypeArgs TResult maybeMap<TResult extends Object?>(TResult Function( _MomoTransaction value)?  $default,{required TResult orElse(),}){
final _that = this;
switch (_that) {
case _MomoTransaction() when $default != null:
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

@optionalTypeArgs TResult map<TResult extends Object?>(TResult Function( _MomoTransaction value)  $default,){
final _that = this;
switch (_that) {
case _MomoTransaction():
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

@optionalTypeArgs TResult? mapOrNull<TResult extends Object?>(TResult? Function( _MomoTransaction value)?  $default,){
final _that = this;
switch (_that) {
case _MomoTransaction() when $default != null:
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

@optionalTypeArgs TResult maybeWhen<TResult extends Object?>(TResult Function( String id,  String channel,  MomoStatus status,  MomoProvider provider,  String? merchantReference,  String? providerTransactionId,  String? aggregatorTransactionId,  String payerMsisdn,  String? payeeMsisdn,  int amount,  int feeAmount,  int? netAmount,  String? paymentId,  String? rejectionReason,  String? failureCode,  String? failureMessage,  String? expiresAt,  String? clientRef)?  $default,{required TResult orElse(),}) {final _that = this;
switch (_that) {
case _MomoTransaction() when $default != null:
return $default(_that.id,_that.channel,_that.status,_that.provider,_that.merchantReference,_that.providerTransactionId,_that.aggregatorTransactionId,_that.payerMsisdn,_that.payeeMsisdn,_that.amount,_that.feeAmount,_that.netAmount,_that.paymentId,_that.rejectionReason,_that.failureCode,_that.failureMessage,_that.expiresAt,_that.clientRef);case _:
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

@optionalTypeArgs TResult when<TResult extends Object?>(TResult Function( String id,  String channel,  MomoStatus status,  MomoProvider provider,  String? merchantReference,  String? providerTransactionId,  String? aggregatorTransactionId,  String payerMsisdn,  String? payeeMsisdn,  int amount,  int feeAmount,  int? netAmount,  String? paymentId,  String? rejectionReason,  String? failureCode,  String? failureMessage,  String? expiresAt,  String? clientRef)  $default,) {final _that = this;
switch (_that) {
case _MomoTransaction():
return $default(_that.id,_that.channel,_that.status,_that.provider,_that.merchantReference,_that.providerTransactionId,_that.aggregatorTransactionId,_that.payerMsisdn,_that.payeeMsisdn,_that.amount,_that.feeAmount,_that.netAmount,_that.paymentId,_that.rejectionReason,_that.failureCode,_that.failureMessage,_that.expiresAt,_that.clientRef);case _:
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

@optionalTypeArgs TResult? whenOrNull<TResult extends Object?>(TResult? Function( String id,  String channel,  MomoStatus status,  MomoProvider provider,  String? merchantReference,  String? providerTransactionId,  String? aggregatorTransactionId,  String payerMsisdn,  String? payeeMsisdn,  int amount,  int feeAmount,  int? netAmount,  String? paymentId,  String? rejectionReason,  String? failureCode,  String? failureMessage,  String? expiresAt,  String? clientRef)?  $default,) {final _that = this;
switch (_that) {
case _MomoTransaction() when $default != null:
return $default(_that.id,_that.channel,_that.status,_that.provider,_that.merchantReference,_that.providerTransactionId,_that.aggregatorTransactionId,_that.payerMsisdn,_that.payeeMsisdn,_that.amount,_that.feeAmount,_that.netAmount,_that.paymentId,_that.rejectionReason,_that.failureCode,_that.failureMessage,_that.expiresAt,_that.clientRef);case _:
  return null;

}
}

}

/// @nodoc
@JsonSerializable()

class _MomoTransaction implements MomoTransaction {
  const _MomoTransaction({required this.id, required this.channel, required this.status, required this.provider, this.merchantReference, this.providerTransactionId, this.aggregatorTransactionId, required this.payerMsisdn, this.payeeMsisdn, required this.amount, this.feeAmount = 0, this.netAmount, this.paymentId, this.rejectionReason, this.failureCode, this.failureMessage, this.expiresAt, this.clientRef});
  factory _MomoTransaction.fromJson(Map<String, dynamic> json) => _$MomoTransactionFromJson(json);

@override final  String id;
@override final  String channel;
@override final  MomoStatus status;
@override final  MomoProvider provider;
@override final  String? merchantReference;
@override final  String? providerTransactionId;
@override final  String? aggregatorTransactionId;
@override final  String payerMsisdn;
@override final  String? payeeMsisdn;
@override final  int amount;
@override@JsonKey() final  int feeAmount;
@override final  int? netAmount;
@override final  String? paymentId;
@override final  String? rejectionReason;
@override final  String? failureCode;
@override final  String? failureMessage;
@override final  String? expiresAt;
@override final  String? clientRef;

/// Create a copy of MomoTransaction
/// with the given fields replaced by the non-null parameter values.
@override @JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
_$MomoTransactionCopyWith<_MomoTransaction> get copyWith => __$MomoTransactionCopyWithImpl<_MomoTransaction>(this, _$identity);

@override
Map<String, dynamic> toJson() {
  return _$MomoTransactionToJson(this, );
}

@override
bool operator ==(Object other) {
  return identical(this, other) || (other.runtimeType == runtimeType&&other is _MomoTransaction&&(identical(other.id, id) || other.id == id)&&(identical(other.channel, channel) || other.channel == channel)&&(identical(other.status, status) || other.status == status)&&(identical(other.provider, provider) || other.provider == provider)&&(identical(other.merchantReference, merchantReference) || other.merchantReference == merchantReference)&&(identical(other.providerTransactionId, providerTransactionId) || other.providerTransactionId == providerTransactionId)&&(identical(other.aggregatorTransactionId, aggregatorTransactionId) || other.aggregatorTransactionId == aggregatorTransactionId)&&(identical(other.payerMsisdn, payerMsisdn) || other.payerMsisdn == payerMsisdn)&&(identical(other.payeeMsisdn, payeeMsisdn) || other.payeeMsisdn == payeeMsisdn)&&(identical(other.amount, amount) || other.amount == amount)&&(identical(other.feeAmount, feeAmount) || other.feeAmount == feeAmount)&&(identical(other.netAmount, netAmount) || other.netAmount == netAmount)&&(identical(other.paymentId, paymentId) || other.paymentId == paymentId)&&(identical(other.rejectionReason, rejectionReason) || other.rejectionReason == rejectionReason)&&(identical(other.failureCode, failureCode) || other.failureCode == failureCode)&&(identical(other.failureMessage, failureMessage) || other.failureMessage == failureMessage)&&(identical(other.expiresAt, expiresAt) || other.expiresAt == expiresAt)&&(identical(other.clientRef, clientRef) || other.clientRef == clientRef));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode => Object.hash(runtimeType,id,channel,status,provider,merchantReference,providerTransactionId,aggregatorTransactionId,payerMsisdn,payeeMsisdn,amount,feeAmount,netAmount,paymentId,rejectionReason,failureCode,failureMessage,expiresAt,clientRef);

@override
String toString() {
  return 'MomoTransaction(id: $id, channel: $channel, status: $status, provider: $provider, merchantReference: $merchantReference, providerTransactionId: $providerTransactionId, aggregatorTransactionId: $aggregatorTransactionId, payerMsisdn: $payerMsisdn, payeeMsisdn: $payeeMsisdn, amount: $amount, feeAmount: $feeAmount, netAmount: $netAmount, paymentId: $paymentId, rejectionReason: $rejectionReason, failureCode: $failureCode, failureMessage: $failureMessage, expiresAt: $expiresAt, clientRef: $clientRef)';
}


}

/// @nodoc
abstract mixin class _$MomoTransactionCopyWith<$Res> implements $MomoTransactionCopyWith<$Res> {
  factory _$MomoTransactionCopyWith(_MomoTransaction value, $Res Function(_MomoTransaction) _then) = __$MomoTransactionCopyWithImpl;
@override @useResult
$Res call({
 String id, String channel, MomoStatus status, MomoProvider provider, String? merchantReference, String? providerTransactionId, String? aggregatorTransactionId, String payerMsisdn, String? payeeMsisdn, int amount, int feeAmount, int? netAmount, String? paymentId, String? rejectionReason, String? failureCode, String? failureMessage, String? expiresAt, String? clientRef
});




}
/// @nodoc
class __$MomoTransactionCopyWithImpl<$Res>
    implements _$MomoTransactionCopyWith<$Res> {
  __$MomoTransactionCopyWithImpl(this._self, this._then);

  final _MomoTransaction _self;
  final $Res Function(_MomoTransaction) _then;

/// Create a copy of MomoTransaction
/// with the given fields replaced by the non-null parameter values.
@override @pragma('vm:prefer-inline') $Res call({Object? id = null,Object? channel = null,Object? status = null,Object? provider = null,Object? merchantReference = freezed,Object? providerTransactionId = freezed,Object? aggregatorTransactionId = freezed,Object? payerMsisdn = null,Object? payeeMsisdn = freezed,Object? amount = null,Object? feeAmount = null,Object? netAmount = freezed,Object? paymentId = freezed,Object? rejectionReason = freezed,Object? failureCode = freezed,Object? failureMessage = freezed,Object? expiresAt = freezed,Object? clientRef = freezed,}) {
  return _then(_MomoTransaction(
id: null == id ? _self.id : id // ignore: cast_nullable_to_non_nullable
as String,channel: null == channel ? _self.channel : channel // ignore: cast_nullable_to_non_nullable
as String,status: null == status ? _self.status : status // ignore: cast_nullable_to_non_nullable
as MomoStatus,provider: null == provider ? _self.provider : provider // ignore: cast_nullable_to_non_nullable
as MomoProvider,merchantReference: freezed == merchantReference ? _self.merchantReference : merchantReference // ignore: cast_nullable_to_non_nullable
as String?,providerTransactionId: freezed == providerTransactionId ? _self.providerTransactionId : providerTransactionId // ignore: cast_nullable_to_non_nullable
as String?,aggregatorTransactionId: freezed == aggregatorTransactionId ? _self.aggregatorTransactionId : aggregatorTransactionId // ignore: cast_nullable_to_non_nullable
as String?,payerMsisdn: null == payerMsisdn ? _self.payerMsisdn : payerMsisdn // ignore: cast_nullable_to_non_nullable
as String,payeeMsisdn: freezed == payeeMsisdn ? _self.payeeMsisdn : payeeMsisdn // ignore: cast_nullable_to_non_nullable
as String?,amount: null == amount ? _self.amount : amount // ignore: cast_nullable_to_non_nullable
as int,feeAmount: null == feeAmount ? _self.feeAmount : feeAmount // ignore: cast_nullable_to_non_nullable
as int,netAmount: freezed == netAmount ? _self.netAmount : netAmount // ignore: cast_nullable_to_non_nullable
as int?,paymentId: freezed == paymentId ? _self.paymentId : paymentId // ignore: cast_nullable_to_non_nullable
as String?,rejectionReason: freezed == rejectionReason ? _self.rejectionReason : rejectionReason // ignore: cast_nullable_to_non_nullable
as String?,failureCode: freezed == failureCode ? _self.failureCode : failureCode // ignore: cast_nullable_to_non_nullable
as String?,failureMessage: freezed == failureMessage ? _self.failureMessage : failureMessage // ignore: cast_nullable_to_non_nullable
as String?,expiresAt: freezed == expiresAt ? _self.expiresAt : expiresAt // ignore: cast_nullable_to_non_nullable
as String?,clientRef: freezed == clientRef ? _self.clientRef : clientRef // ignore: cast_nullable_to_non_nullable
as String?,
  ));
}


}

// dart format on
