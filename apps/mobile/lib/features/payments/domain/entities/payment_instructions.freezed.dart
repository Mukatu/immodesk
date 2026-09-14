// GENERATED CODE - DO NOT MODIFY BY HAND
// coverage:ignore-file
// ignore_for_file: type=lint
// ignore_for_file: unused_element, deprecated_member_use, deprecated_member_use_from_same_package, use_function_type_syntax_for_parameters, unnecessary_const, avoid_init_to_null, invalid_override_different_default_values_named, prefer_expression_function_bodies, annotate_overrides, invalid_annotation_target, unnecessary_question_mark

part of 'payment_instructions.dart';

// **************************************************************************
// FreezedGenerator
// **************************************************************************

// dart format off
T _$identity<T>(T value) => value;

/// @nodoc
mixin _$BankAccountSummary {

 String get id; String get bankName; String get accountHolderName; String? get accountNumber; String? get ribKey; String? get iban;
/// Create a copy of BankAccountSummary
/// with the given fields replaced by the non-null parameter values.
@JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
$BankAccountSummaryCopyWith<BankAccountSummary> get copyWith => _$BankAccountSummaryCopyWithImpl<BankAccountSummary>(this as BankAccountSummary, _$identity);

  /// Serializes this BankAccountSummary to a JSON map.
  Map<String, dynamic> toJson();


@override
bool operator ==(Object other) {
  return identical(this, other) || (other.runtimeType == runtimeType&&other is BankAccountSummary&&(identical(other.id, id) || other.id == id)&&(identical(other.bankName, bankName) || other.bankName == bankName)&&(identical(other.accountHolderName, accountHolderName) || other.accountHolderName == accountHolderName)&&(identical(other.accountNumber, accountNumber) || other.accountNumber == accountNumber)&&(identical(other.ribKey, ribKey) || other.ribKey == ribKey)&&(identical(other.iban, iban) || other.iban == iban));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode => Object.hash(runtimeType,id,bankName,accountHolderName,accountNumber,ribKey,iban);

@override
String toString() {
  return 'BankAccountSummary(id: $id, bankName: $bankName, accountHolderName: $accountHolderName, accountNumber: $accountNumber, ribKey: $ribKey, iban: $iban)';
}


}

/// @nodoc
abstract mixin class $BankAccountSummaryCopyWith<$Res>  {
  factory $BankAccountSummaryCopyWith(BankAccountSummary value, $Res Function(BankAccountSummary) _then) = _$BankAccountSummaryCopyWithImpl;
@useResult
$Res call({
 String id, String bankName, String accountHolderName, String? accountNumber, String? ribKey, String? iban
});




}
/// @nodoc
class _$BankAccountSummaryCopyWithImpl<$Res>
    implements $BankAccountSummaryCopyWith<$Res> {
  _$BankAccountSummaryCopyWithImpl(this._self, this._then);

  final BankAccountSummary _self;
  final $Res Function(BankAccountSummary) _then;

/// Create a copy of BankAccountSummary
/// with the given fields replaced by the non-null parameter values.
@pragma('vm:prefer-inline') @override $Res call({Object? id = null,Object? bankName = null,Object? accountHolderName = null,Object? accountNumber = freezed,Object? ribKey = freezed,Object? iban = freezed,}) {
  return _then(_self.copyWith(
id: null == id ? _self.id : id // ignore: cast_nullable_to_non_nullable
as String,bankName: null == bankName ? _self.bankName : bankName // ignore: cast_nullable_to_non_nullable
as String,accountHolderName: null == accountHolderName ? _self.accountHolderName : accountHolderName // ignore: cast_nullable_to_non_nullable
as String,accountNumber: freezed == accountNumber ? _self.accountNumber : accountNumber // ignore: cast_nullable_to_non_nullable
as String?,ribKey: freezed == ribKey ? _self.ribKey : ribKey // ignore: cast_nullable_to_non_nullable
as String?,iban: freezed == iban ? _self.iban : iban // ignore: cast_nullable_to_non_nullable
as String?,
  ));
}

}


/// Adds pattern-matching-related methods to [BankAccountSummary].
extension BankAccountSummaryPatterns on BankAccountSummary {
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

@optionalTypeArgs TResult maybeMap<TResult extends Object?>(TResult Function( _BankAccountSummary value)?  $default,{required TResult orElse(),}){
final _that = this;
switch (_that) {
case _BankAccountSummary() when $default != null:
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

@optionalTypeArgs TResult map<TResult extends Object?>(TResult Function( _BankAccountSummary value)  $default,){
final _that = this;
switch (_that) {
case _BankAccountSummary():
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

@optionalTypeArgs TResult? mapOrNull<TResult extends Object?>(TResult? Function( _BankAccountSummary value)?  $default,){
final _that = this;
switch (_that) {
case _BankAccountSummary() when $default != null:
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

@optionalTypeArgs TResult maybeWhen<TResult extends Object?>(TResult Function( String id,  String bankName,  String accountHolderName,  String? accountNumber,  String? ribKey,  String? iban)?  $default,{required TResult orElse(),}) {final _that = this;
switch (_that) {
case _BankAccountSummary() when $default != null:
return $default(_that.id,_that.bankName,_that.accountHolderName,_that.accountNumber,_that.ribKey,_that.iban);case _:
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

@optionalTypeArgs TResult when<TResult extends Object?>(TResult Function( String id,  String bankName,  String accountHolderName,  String? accountNumber,  String? ribKey,  String? iban)  $default,) {final _that = this;
switch (_that) {
case _BankAccountSummary():
return $default(_that.id,_that.bankName,_that.accountHolderName,_that.accountNumber,_that.ribKey,_that.iban);case _:
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

@optionalTypeArgs TResult? whenOrNull<TResult extends Object?>(TResult? Function( String id,  String bankName,  String accountHolderName,  String? accountNumber,  String? ribKey,  String? iban)?  $default,) {final _that = this;
switch (_that) {
case _BankAccountSummary() when $default != null:
return $default(_that.id,_that.bankName,_that.accountHolderName,_that.accountNumber,_that.ribKey,_that.iban);case _:
  return null;

}
}

}

/// @nodoc
@JsonSerializable()

class _BankAccountSummary implements BankAccountSummary {
  const _BankAccountSummary({required this.id, required this.bankName, required this.accountHolderName, this.accountNumber, this.ribKey, this.iban});
  factory _BankAccountSummary.fromJson(Map<String, dynamic> json) => _$BankAccountSummaryFromJson(json);

@override final  String id;
@override final  String bankName;
@override final  String accountHolderName;
@override final  String? accountNumber;
@override final  String? ribKey;
@override final  String? iban;

/// Create a copy of BankAccountSummary
/// with the given fields replaced by the non-null parameter values.
@override @JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
_$BankAccountSummaryCopyWith<_BankAccountSummary> get copyWith => __$BankAccountSummaryCopyWithImpl<_BankAccountSummary>(this, _$identity);

@override
Map<String, dynamic> toJson() {
  return _$BankAccountSummaryToJson(this, );
}

@override
bool operator ==(Object other) {
  return identical(this, other) || (other.runtimeType == runtimeType&&other is _BankAccountSummary&&(identical(other.id, id) || other.id == id)&&(identical(other.bankName, bankName) || other.bankName == bankName)&&(identical(other.accountHolderName, accountHolderName) || other.accountHolderName == accountHolderName)&&(identical(other.accountNumber, accountNumber) || other.accountNumber == accountNumber)&&(identical(other.ribKey, ribKey) || other.ribKey == ribKey)&&(identical(other.iban, iban) || other.iban == iban));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode => Object.hash(runtimeType,id,bankName,accountHolderName,accountNumber,ribKey,iban);

@override
String toString() {
  return 'BankAccountSummary(id: $id, bankName: $bankName, accountHolderName: $accountHolderName, accountNumber: $accountNumber, ribKey: $ribKey, iban: $iban)';
}


}

/// @nodoc
abstract mixin class _$BankAccountSummaryCopyWith<$Res> implements $BankAccountSummaryCopyWith<$Res> {
  factory _$BankAccountSummaryCopyWith(_BankAccountSummary value, $Res Function(_BankAccountSummary) _then) = __$BankAccountSummaryCopyWithImpl;
@override @useResult
$Res call({
 String id, String bankName, String accountHolderName, String? accountNumber, String? ribKey, String? iban
});




}
/// @nodoc
class __$BankAccountSummaryCopyWithImpl<$Res>
    implements _$BankAccountSummaryCopyWith<$Res> {
  __$BankAccountSummaryCopyWithImpl(this._self, this._then);

  final _BankAccountSummary _self;
  final $Res Function(_BankAccountSummary) _then;

/// Create a copy of BankAccountSummary
/// with the given fields replaced by the non-null parameter values.
@override @pragma('vm:prefer-inline') $Res call({Object? id = null,Object? bankName = null,Object? accountHolderName = null,Object? accountNumber = freezed,Object? ribKey = freezed,Object? iban = freezed,}) {
  return _then(_BankAccountSummary(
id: null == id ? _self.id : id // ignore: cast_nullable_to_non_nullable
as String,bankName: null == bankName ? _self.bankName : bankName // ignore: cast_nullable_to_non_nullable
as String,accountHolderName: null == accountHolderName ? _self.accountHolderName : accountHolderName // ignore: cast_nullable_to_non_nullable
as String,accountNumber: freezed == accountNumber ? _self.accountNumber : accountNumber // ignore: cast_nullable_to_non_nullable
as String?,ribKey: freezed == ribKey ? _self.ribKey : ribKey // ignore: cast_nullable_to_non_nullable
as String?,iban: freezed == iban ? _self.iban : iban // ignore: cast_nullable_to_non_nullable
as String?,
  ));
}


}


/// @nodoc
mixin _$MobileMoneyNumber {

 String get bankAccountId; MomoProvider get provider; String get msisdn; String get holderName;
/// Create a copy of MobileMoneyNumber
/// with the given fields replaced by the non-null parameter values.
@JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
$MobileMoneyNumberCopyWith<MobileMoneyNumber> get copyWith => _$MobileMoneyNumberCopyWithImpl<MobileMoneyNumber>(this as MobileMoneyNumber, _$identity);

  /// Serializes this MobileMoneyNumber to a JSON map.
  Map<String, dynamic> toJson();


@override
bool operator ==(Object other) {
  return identical(this, other) || (other.runtimeType == runtimeType&&other is MobileMoneyNumber&&(identical(other.bankAccountId, bankAccountId) || other.bankAccountId == bankAccountId)&&(identical(other.provider, provider) || other.provider == provider)&&(identical(other.msisdn, msisdn) || other.msisdn == msisdn)&&(identical(other.holderName, holderName) || other.holderName == holderName));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode => Object.hash(runtimeType,bankAccountId,provider,msisdn,holderName);

@override
String toString() {
  return 'MobileMoneyNumber(bankAccountId: $bankAccountId, provider: $provider, msisdn: $msisdn, holderName: $holderName)';
}


}

/// @nodoc
abstract mixin class $MobileMoneyNumberCopyWith<$Res>  {
  factory $MobileMoneyNumberCopyWith(MobileMoneyNumber value, $Res Function(MobileMoneyNumber) _then) = _$MobileMoneyNumberCopyWithImpl;
@useResult
$Res call({
 String bankAccountId, MomoProvider provider, String msisdn, String holderName
});




}
/// @nodoc
class _$MobileMoneyNumberCopyWithImpl<$Res>
    implements $MobileMoneyNumberCopyWith<$Res> {
  _$MobileMoneyNumberCopyWithImpl(this._self, this._then);

  final MobileMoneyNumber _self;
  final $Res Function(MobileMoneyNumber) _then;

/// Create a copy of MobileMoneyNumber
/// with the given fields replaced by the non-null parameter values.
@pragma('vm:prefer-inline') @override $Res call({Object? bankAccountId = null,Object? provider = null,Object? msisdn = null,Object? holderName = null,}) {
  return _then(_self.copyWith(
bankAccountId: null == bankAccountId ? _self.bankAccountId : bankAccountId // ignore: cast_nullable_to_non_nullable
as String,provider: null == provider ? _self.provider : provider // ignore: cast_nullable_to_non_nullable
as MomoProvider,msisdn: null == msisdn ? _self.msisdn : msisdn // ignore: cast_nullable_to_non_nullable
as String,holderName: null == holderName ? _self.holderName : holderName // ignore: cast_nullable_to_non_nullable
as String,
  ));
}

}


/// Adds pattern-matching-related methods to [MobileMoneyNumber].
extension MobileMoneyNumberPatterns on MobileMoneyNumber {
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

@optionalTypeArgs TResult maybeMap<TResult extends Object?>(TResult Function( _MobileMoneyNumber value)?  $default,{required TResult orElse(),}){
final _that = this;
switch (_that) {
case _MobileMoneyNumber() when $default != null:
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

@optionalTypeArgs TResult map<TResult extends Object?>(TResult Function( _MobileMoneyNumber value)  $default,){
final _that = this;
switch (_that) {
case _MobileMoneyNumber():
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

@optionalTypeArgs TResult? mapOrNull<TResult extends Object?>(TResult? Function( _MobileMoneyNumber value)?  $default,){
final _that = this;
switch (_that) {
case _MobileMoneyNumber() when $default != null:
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

@optionalTypeArgs TResult maybeWhen<TResult extends Object?>(TResult Function( String bankAccountId,  MomoProvider provider,  String msisdn,  String holderName)?  $default,{required TResult orElse(),}) {final _that = this;
switch (_that) {
case _MobileMoneyNumber() when $default != null:
return $default(_that.bankAccountId,_that.provider,_that.msisdn,_that.holderName);case _:
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

@optionalTypeArgs TResult when<TResult extends Object?>(TResult Function( String bankAccountId,  MomoProvider provider,  String msisdn,  String holderName)  $default,) {final _that = this;
switch (_that) {
case _MobileMoneyNumber():
return $default(_that.bankAccountId,_that.provider,_that.msisdn,_that.holderName);case _:
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

@optionalTypeArgs TResult? whenOrNull<TResult extends Object?>(TResult? Function( String bankAccountId,  MomoProvider provider,  String msisdn,  String holderName)?  $default,) {final _that = this;
switch (_that) {
case _MobileMoneyNumber() when $default != null:
return $default(_that.bankAccountId,_that.provider,_that.msisdn,_that.holderName);case _:
  return null;

}
}

}

/// @nodoc
@JsonSerializable()

class _MobileMoneyNumber implements MobileMoneyNumber {
  const _MobileMoneyNumber({required this.bankAccountId, required this.provider, required this.msisdn, required this.holderName});
  factory _MobileMoneyNumber.fromJson(Map<String, dynamic> json) => _$MobileMoneyNumberFromJson(json);

@override final  String bankAccountId;
@override final  MomoProvider provider;
@override final  String msisdn;
@override final  String holderName;

/// Create a copy of MobileMoneyNumber
/// with the given fields replaced by the non-null parameter values.
@override @JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
_$MobileMoneyNumberCopyWith<_MobileMoneyNumber> get copyWith => __$MobileMoneyNumberCopyWithImpl<_MobileMoneyNumber>(this, _$identity);

@override
Map<String, dynamic> toJson() {
  return _$MobileMoneyNumberToJson(this, );
}

@override
bool operator ==(Object other) {
  return identical(this, other) || (other.runtimeType == runtimeType&&other is _MobileMoneyNumber&&(identical(other.bankAccountId, bankAccountId) || other.bankAccountId == bankAccountId)&&(identical(other.provider, provider) || other.provider == provider)&&(identical(other.msisdn, msisdn) || other.msisdn == msisdn)&&(identical(other.holderName, holderName) || other.holderName == holderName));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode => Object.hash(runtimeType,bankAccountId,provider,msisdn,holderName);

@override
String toString() {
  return 'MobileMoneyNumber(bankAccountId: $bankAccountId, provider: $provider, msisdn: $msisdn, holderName: $holderName)';
}


}

/// @nodoc
abstract mixin class _$MobileMoneyNumberCopyWith<$Res> implements $MobileMoneyNumberCopyWith<$Res> {
  factory _$MobileMoneyNumberCopyWith(_MobileMoneyNumber value, $Res Function(_MobileMoneyNumber) _then) = __$MobileMoneyNumberCopyWithImpl;
@override @useResult
$Res call({
 String bankAccountId, MomoProvider provider, String msisdn, String holderName
});




}
/// @nodoc
class __$MobileMoneyNumberCopyWithImpl<$Res>
    implements _$MobileMoneyNumberCopyWith<$Res> {
  __$MobileMoneyNumberCopyWithImpl(this._self, this._then);

  final _MobileMoneyNumber _self;
  final $Res Function(_MobileMoneyNumber) _then;

/// Create a copy of MobileMoneyNumber
/// with the given fields replaced by the non-null parameter values.
@override @pragma('vm:prefer-inline') $Res call({Object? bankAccountId = null,Object? provider = null,Object? msisdn = null,Object? holderName = null,}) {
  return _then(_MobileMoneyNumber(
bankAccountId: null == bankAccountId ? _self.bankAccountId : bankAccountId // ignore: cast_nullable_to_non_nullable
as String,provider: null == provider ? _self.provider : provider // ignore: cast_nullable_to_non_nullable
as MomoProvider,msisdn: null == msisdn ? _self.msisdn : msisdn // ignore: cast_nullable_to_non_nullable
as String,holderName: null == holderName ? _self.holderName : holderName // ignore: cast_nullable_to_non_nullable
as String,
  ));
}


}


/// @nodoc
mixin _$PaymentInstructionsInvoiceRef {

 String get id; String? get invoiceNumber; int get balanceAmount;
/// Create a copy of PaymentInstructionsInvoiceRef
/// with the given fields replaced by the non-null parameter values.
@JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
$PaymentInstructionsInvoiceRefCopyWith<PaymentInstructionsInvoiceRef> get copyWith => _$PaymentInstructionsInvoiceRefCopyWithImpl<PaymentInstructionsInvoiceRef>(this as PaymentInstructionsInvoiceRef, _$identity);

  /// Serializes this PaymentInstructionsInvoiceRef to a JSON map.
  Map<String, dynamic> toJson();


@override
bool operator ==(Object other) {
  return identical(this, other) || (other.runtimeType == runtimeType&&other is PaymentInstructionsInvoiceRef&&(identical(other.id, id) || other.id == id)&&(identical(other.invoiceNumber, invoiceNumber) || other.invoiceNumber == invoiceNumber)&&(identical(other.balanceAmount, balanceAmount) || other.balanceAmount == balanceAmount));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode => Object.hash(runtimeType,id,invoiceNumber,balanceAmount);

@override
String toString() {
  return 'PaymentInstructionsInvoiceRef(id: $id, invoiceNumber: $invoiceNumber, balanceAmount: $balanceAmount)';
}


}

/// @nodoc
abstract mixin class $PaymentInstructionsInvoiceRefCopyWith<$Res>  {
  factory $PaymentInstructionsInvoiceRefCopyWith(PaymentInstructionsInvoiceRef value, $Res Function(PaymentInstructionsInvoiceRef) _then) = _$PaymentInstructionsInvoiceRefCopyWithImpl;
@useResult
$Res call({
 String id, String? invoiceNumber, int balanceAmount
});




}
/// @nodoc
class _$PaymentInstructionsInvoiceRefCopyWithImpl<$Res>
    implements $PaymentInstructionsInvoiceRefCopyWith<$Res> {
  _$PaymentInstructionsInvoiceRefCopyWithImpl(this._self, this._then);

  final PaymentInstructionsInvoiceRef _self;
  final $Res Function(PaymentInstructionsInvoiceRef) _then;

/// Create a copy of PaymentInstructionsInvoiceRef
/// with the given fields replaced by the non-null parameter values.
@pragma('vm:prefer-inline') @override $Res call({Object? id = null,Object? invoiceNumber = freezed,Object? balanceAmount = null,}) {
  return _then(_self.copyWith(
id: null == id ? _self.id : id // ignore: cast_nullable_to_non_nullable
as String,invoiceNumber: freezed == invoiceNumber ? _self.invoiceNumber : invoiceNumber // ignore: cast_nullable_to_non_nullable
as String?,balanceAmount: null == balanceAmount ? _self.balanceAmount : balanceAmount // ignore: cast_nullable_to_non_nullable
as int,
  ));
}

}


/// Adds pattern-matching-related methods to [PaymentInstructionsInvoiceRef].
extension PaymentInstructionsInvoiceRefPatterns on PaymentInstructionsInvoiceRef {
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

@optionalTypeArgs TResult maybeMap<TResult extends Object?>(TResult Function( _PaymentInstructionsInvoiceRef value)?  $default,{required TResult orElse(),}){
final _that = this;
switch (_that) {
case _PaymentInstructionsInvoiceRef() when $default != null:
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

@optionalTypeArgs TResult map<TResult extends Object?>(TResult Function( _PaymentInstructionsInvoiceRef value)  $default,){
final _that = this;
switch (_that) {
case _PaymentInstructionsInvoiceRef():
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

@optionalTypeArgs TResult? mapOrNull<TResult extends Object?>(TResult? Function( _PaymentInstructionsInvoiceRef value)?  $default,){
final _that = this;
switch (_that) {
case _PaymentInstructionsInvoiceRef() when $default != null:
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

@optionalTypeArgs TResult maybeWhen<TResult extends Object?>(TResult Function( String id,  String? invoiceNumber,  int balanceAmount)?  $default,{required TResult orElse(),}) {final _that = this;
switch (_that) {
case _PaymentInstructionsInvoiceRef() when $default != null:
return $default(_that.id,_that.invoiceNumber,_that.balanceAmount);case _:
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

@optionalTypeArgs TResult when<TResult extends Object?>(TResult Function( String id,  String? invoiceNumber,  int balanceAmount)  $default,) {final _that = this;
switch (_that) {
case _PaymentInstructionsInvoiceRef():
return $default(_that.id,_that.invoiceNumber,_that.balanceAmount);case _:
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

@optionalTypeArgs TResult? whenOrNull<TResult extends Object?>(TResult? Function( String id,  String? invoiceNumber,  int balanceAmount)?  $default,) {final _that = this;
switch (_that) {
case _PaymentInstructionsInvoiceRef() when $default != null:
return $default(_that.id,_that.invoiceNumber,_that.balanceAmount);case _:
  return null;

}
}

}

/// @nodoc
@JsonSerializable()

class _PaymentInstructionsInvoiceRef implements PaymentInstructionsInvoiceRef {
  const _PaymentInstructionsInvoiceRef({required this.id, this.invoiceNumber, required this.balanceAmount});
  factory _PaymentInstructionsInvoiceRef.fromJson(Map<String, dynamic> json) => _$PaymentInstructionsInvoiceRefFromJson(json);

@override final  String id;
@override final  String? invoiceNumber;
@override final  int balanceAmount;

/// Create a copy of PaymentInstructionsInvoiceRef
/// with the given fields replaced by the non-null parameter values.
@override @JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
_$PaymentInstructionsInvoiceRefCopyWith<_PaymentInstructionsInvoiceRef> get copyWith => __$PaymentInstructionsInvoiceRefCopyWithImpl<_PaymentInstructionsInvoiceRef>(this, _$identity);

@override
Map<String, dynamic> toJson() {
  return _$PaymentInstructionsInvoiceRefToJson(this, );
}

@override
bool operator ==(Object other) {
  return identical(this, other) || (other.runtimeType == runtimeType&&other is _PaymentInstructionsInvoiceRef&&(identical(other.id, id) || other.id == id)&&(identical(other.invoiceNumber, invoiceNumber) || other.invoiceNumber == invoiceNumber)&&(identical(other.balanceAmount, balanceAmount) || other.balanceAmount == balanceAmount));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode => Object.hash(runtimeType,id,invoiceNumber,balanceAmount);

@override
String toString() {
  return 'PaymentInstructionsInvoiceRef(id: $id, invoiceNumber: $invoiceNumber, balanceAmount: $balanceAmount)';
}


}

/// @nodoc
abstract mixin class _$PaymentInstructionsInvoiceRefCopyWith<$Res> implements $PaymentInstructionsInvoiceRefCopyWith<$Res> {
  factory _$PaymentInstructionsInvoiceRefCopyWith(_PaymentInstructionsInvoiceRef value, $Res Function(_PaymentInstructionsInvoiceRef) _then) = __$PaymentInstructionsInvoiceRefCopyWithImpl;
@override @useResult
$Res call({
 String id, String? invoiceNumber, int balanceAmount
});




}
/// @nodoc
class __$PaymentInstructionsInvoiceRefCopyWithImpl<$Res>
    implements _$PaymentInstructionsInvoiceRefCopyWith<$Res> {
  __$PaymentInstructionsInvoiceRefCopyWithImpl(this._self, this._then);

  final _PaymentInstructionsInvoiceRef _self;
  final $Res Function(_PaymentInstructionsInvoiceRef) _then;

/// Create a copy of PaymentInstructionsInvoiceRef
/// with the given fields replaced by the non-null parameter values.
@override @pragma('vm:prefer-inline') $Res call({Object? id = null,Object? invoiceNumber = freezed,Object? balanceAmount = null,}) {
  return _then(_PaymentInstructionsInvoiceRef(
id: null == id ? _self.id : id // ignore: cast_nullable_to_non_nullable
as String,invoiceNumber: freezed == invoiceNumber ? _self.invoiceNumber : invoiceNumber // ignore: cast_nullable_to_non_nullable
as String?,balanceAmount: null == balanceAmount ? _self.balanceAmount : balanceAmount // ignore: cast_nullable_to_non_nullable
as int,
  ));
}


}


/// @nodoc
mixin _$PaymentInstructions {

 String? get transferReference; PaymentInstructionsInvoiceRef? get invoice; List<BankAccountSummary> get bankAccounts; List<MobileMoneyNumber> get mobileMoneyNumbers; bool get aggregatorAvailable;
/// Create a copy of PaymentInstructions
/// with the given fields replaced by the non-null parameter values.
@JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
$PaymentInstructionsCopyWith<PaymentInstructions> get copyWith => _$PaymentInstructionsCopyWithImpl<PaymentInstructions>(this as PaymentInstructions, _$identity);

  /// Serializes this PaymentInstructions to a JSON map.
  Map<String, dynamic> toJson();


@override
bool operator ==(Object other) {
  return identical(this, other) || (other.runtimeType == runtimeType&&other is PaymentInstructions&&(identical(other.transferReference, transferReference) || other.transferReference == transferReference)&&(identical(other.invoice, invoice) || other.invoice == invoice)&&const DeepCollectionEquality().equals(other.bankAccounts, bankAccounts)&&const DeepCollectionEquality().equals(other.mobileMoneyNumbers, mobileMoneyNumbers)&&(identical(other.aggregatorAvailable, aggregatorAvailable) || other.aggregatorAvailable == aggregatorAvailable));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode => Object.hash(runtimeType,transferReference,invoice,const DeepCollectionEquality().hash(bankAccounts),const DeepCollectionEquality().hash(mobileMoneyNumbers),aggregatorAvailable);

@override
String toString() {
  return 'PaymentInstructions(transferReference: $transferReference, invoice: $invoice, bankAccounts: $bankAccounts, mobileMoneyNumbers: $mobileMoneyNumbers, aggregatorAvailable: $aggregatorAvailable)';
}


}

/// @nodoc
abstract mixin class $PaymentInstructionsCopyWith<$Res>  {
  factory $PaymentInstructionsCopyWith(PaymentInstructions value, $Res Function(PaymentInstructions) _then) = _$PaymentInstructionsCopyWithImpl;
@useResult
$Res call({
 String? transferReference, PaymentInstructionsInvoiceRef? invoice, List<BankAccountSummary> bankAccounts, List<MobileMoneyNumber> mobileMoneyNumbers, bool aggregatorAvailable
});


$PaymentInstructionsInvoiceRefCopyWith<$Res>? get invoice;

}
/// @nodoc
class _$PaymentInstructionsCopyWithImpl<$Res>
    implements $PaymentInstructionsCopyWith<$Res> {
  _$PaymentInstructionsCopyWithImpl(this._self, this._then);

  final PaymentInstructions _self;
  final $Res Function(PaymentInstructions) _then;

/// Create a copy of PaymentInstructions
/// with the given fields replaced by the non-null parameter values.
@pragma('vm:prefer-inline') @override $Res call({Object? transferReference = freezed,Object? invoice = freezed,Object? bankAccounts = null,Object? mobileMoneyNumbers = null,Object? aggregatorAvailable = null,}) {
  return _then(_self.copyWith(
transferReference: freezed == transferReference ? _self.transferReference : transferReference // ignore: cast_nullable_to_non_nullable
as String?,invoice: freezed == invoice ? _self.invoice : invoice // ignore: cast_nullable_to_non_nullable
as PaymentInstructionsInvoiceRef?,bankAccounts: null == bankAccounts ? _self.bankAccounts : bankAccounts // ignore: cast_nullable_to_non_nullable
as List<BankAccountSummary>,mobileMoneyNumbers: null == mobileMoneyNumbers ? _self.mobileMoneyNumbers : mobileMoneyNumbers // ignore: cast_nullable_to_non_nullable
as List<MobileMoneyNumber>,aggregatorAvailable: null == aggregatorAvailable ? _self.aggregatorAvailable : aggregatorAvailable // ignore: cast_nullable_to_non_nullable
as bool,
  ));
}
/// Create a copy of PaymentInstructions
/// with the given fields replaced by the non-null parameter values.
@override
@pragma('vm:prefer-inline')
$PaymentInstructionsInvoiceRefCopyWith<$Res>? get invoice {
    if (_self.invoice == null) {
    return null;
  }

  return $PaymentInstructionsInvoiceRefCopyWith<$Res>(_self.invoice!, (value) {
    return _then(_self.copyWith(invoice: value));
  });
}
}


/// Adds pattern-matching-related methods to [PaymentInstructions].
extension PaymentInstructionsPatterns on PaymentInstructions {
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

@optionalTypeArgs TResult maybeMap<TResult extends Object?>(TResult Function( _PaymentInstructions value)?  $default,{required TResult orElse(),}){
final _that = this;
switch (_that) {
case _PaymentInstructions() when $default != null:
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

@optionalTypeArgs TResult map<TResult extends Object?>(TResult Function( _PaymentInstructions value)  $default,){
final _that = this;
switch (_that) {
case _PaymentInstructions():
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

@optionalTypeArgs TResult? mapOrNull<TResult extends Object?>(TResult? Function( _PaymentInstructions value)?  $default,){
final _that = this;
switch (_that) {
case _PaymentInstructions() when $default != null:
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

@optionalTypeArgs TResult maybeWhen<TResult extends Object?>(TResult Function( String? transferReference,  PaymentInstructionsInvoiceRef? invoice,  List<BankAccountSummary> bankAccounts,  List<MobileMoneyNumber> mobileMoneyNumbers,  bool aggregatorAvailable)?  $default,{required TResult orElse(),}) {final _that = this;
switch (_that) {
case _PaymentInstructions() when $default != null:
return $default(_that.transferReference,_that.invoice,_that.bankAccounts,_that.mobileMoneyNumbers,_that.aggregatorAvailable);case _:
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

@optionalTypeArgs TResult when<TResult extends Object?>(TResult Function( String? transferReference,  PaymentInstructionsInvoiceRef? invoice,  List<BankAccountSummary> bankAccounts,  List<MobileMoneyNumber> mobileMoneyNumbers,  bool aggregatorAvailable)  $default,) {final _that = this;
switch (_that) {
case _PaymentInstructions():
return $default(_that.transferReference,_that.invoice,_that.bankAccounts,_that.mobileMoneyNumbers,_that.aggregatorAvailable);case _:
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

@optionalTypeArgs TResult? whenOrNull<TResult extends Object?>(TResult? Function( String? transferReference,  PaymentInstructionsInvoiceRef? invoice,  List<BankAccountSummary> bankAccounts,  List<MobileMoneyNumber> mobileMoneyNumbers,  bool aggregatorAvailable)?  $default,) {final _that = this;
switch (_that) {
case _PaymentInstructions() when $default != null:
return $default(_that.transferReference,_that.invoice,_that.bankAccounts,_that.mobileMoneyNumbers,_that.aggregatorAvailable);case _:
  return null;

}
}

}

/// @nodoc
@JsonSerializable()

class _PaymentInstructions implements PaymentInstructions {
  const _PaymentInstructions({this.transferReference, this.invoice, required final  List<BankAccountSummary> bankAccounts, required final  List<MobileMoneyNumber> mobileMoneyNumbers, required this.aggregatorAvailable}): _bankAccounts = bankAccounts,_mobileMoneyNumbers = mobileMoneyNumbers;
  factory _PaymentInstructions.fromJson(Map<String, dynamic> json) => _$PaymentInstructionsFromJson(json);

@override final  String? transferReference;
@override final  PaymentInstructionsInvoiceRef? invoice;
 final  List<BankAccountSummary> _bankAccounts;
@override List<BankAccountSummary> get bankAccounts {
  if (_bankAccounts is EqualUnmodifiableListView) return _bankAccounts;
  // ignore: implicit_dynamic_type
  return EqualUnmodifiableListView(_bankAccounts);
}

 final  List<MobileMoneyNumber> _mobileMoneyNumbers;
@override List<MobileMoneyNumber> get mobileMoneyNumbers {
  if (_mobileMoneyNumbers is EqualUnmodifiableListView) return _mobileMoneyNumbers;
  // ignore: implicit_dynamic_type
  return EqualUnmodifiableListView(_mobileMoneyNumbers);
}

@override final  bool aggregatorAvailable;

/// Create a copy of PaymentInstructions
/// with the given fields replaced by the non-null parameter values.
@override @JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
_$PaymentInstructionsCopyWith<_PaymentInstructions> get copyWith => __$PaymentInstructionsCopyWithImpl<_PaymentInstructions>(this, _$identity);

@override
Map<String, dynamic> toJson() {
  return _$PaymentInstructionsToJson(this, );
}

@override
bool operator ==(Object other) {
  return identical(this, other) || (other.runtimeType == runtimeType&&other is _PaymentInstructions&&(identical(other.transferReference, transferReference) || other.transferReference == transferReference)&&(identical(other.invoice, invoice) || other.invoice == invoice)&&const DeepCollectionEquality().equals(other._bankAccounts, _bankAccounts)&&const DeepCollectionEquality().equals(other._mobileMoneyNumbers, _mobileMoneyNumbers)&&(identical(other.aggregatorAvailable, aggregatorAvailable) || other.aggregatorAvailable == aggregatorAvailable));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode => Object.hash(runtimeType,transferReference,invoice,const DeepCollectionEquality().hash(_bankAccounts),const DeepCollectionEquality().hash(_mobileMoneyNumbers),aggregatorAvailable);

@override
String toString() {
  return 'PaymentInstructions(transferReference: $transferReference, invoice: $invoice, bankAccounts: $bankAccounts, mobileMoneyNumbers: $mobileMoneyNumbers, aggregatorAvailable: $aggregatorAvailable)';
}


}

/// @nodoc
abstract mixin class _$PaymentInstructionsCopyWith<$Res> implements $PaymentInstructionsCopyWith<$Res> {
  factory _$PaymentInstructionsCopyWith(_PaymentInstructions value, $Res Function(_PaymentInstructions) _then) = __$PaymentInstructionsCopyWithImpl;
@override @useResult
$Res call({
 String? transferReference, PaymentInstructionsInvoiceRef? invoice, List<BankAccountSummary> bankAccounts, List<MobileMoneyNumber> mobileMoneyNumbers, bool aggregatorAvailable
});


@override $PaymentInstructionsInvoiceRefCopyWith<$Res>? get invoice;

}
/// @nodoc
class __$PaymentInstructionsCopyWithImpl<$Res>
    implements _$PaymentInstructionsCopyWith<$Res> {
  __$PaymentInstructionsCopyWithImpl(this._self, this._then);

  final _PaymentInstructions _self;
  final $Res Function(_PaymentInstructions) _then;

/// Create a copy of PaymentInstructions
/// with the given fields replaced by the non-null parameter values.
@override @pragma('vm:prefer-inline') $Res call({Object? transferReference = freezed,Object? invoice = freezed,Object? bankAccounts = null,Object? mobileMoneyNumbers = null,Object? aggregatorAvailable = null,}) {
  return _then(_PaymentInstructions(
transferReference: freezed == transferReference ? _self.transferReference : transferReference // ignore: cast_nullable_to_non_nullable
as String?,invoice: freezed == invoice ? _self.invoice : invoice // ignore: cast_nullable_to_non_nullable
as PaymentInstructionsInvoiceRef?,bankAccounts: null == bankAccounts ? _self._bankAccounts : bankAccounts // ignore: cast_nullable_to_non_nullable
as List<BankAccountSummary>,mobileMoneyNumbers: null == mobileMoneyNumbers ? _self._mobileMoneyNumbers : mobileMoneyNumbers // ignore: cast_nullable_to_non_nullable
as List<MobileMoneyNumber>,aggregatorAvailable: null == aggregatorAvailable ? _self.aggregatorAvailable : aggregatorAvailable // ignore: cast_nullable_to_non_nullable
as bool,
  ));
}

/// Create a copy of PaymentInstructions
/// with the given fields replaced by the non-null parameter values.
@override
@pragma('vm:prefer-inline')
$PaymentInstructionsInvoiceRefCopyWith<$Res>? get invoice {
    if (_self.invoice == null) {
    return null;
  }

  return $PaymentInstructionsInvoiceRefCopyWith<$Res>(_self.invoice!, (value) {
    return _then(_self.copyWith(invoice: value));
  });
}
}

// dart format on
