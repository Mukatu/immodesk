// GENERATED CODE - DO NOT MODIFY BY HAND
// coverage:ignore-file
// ignore_for_file: type=lint
// ignore_for_file: unused_element, deprecated_member_use, deprecated_member_use_from_same_package, use_function_type_syntax_for_parameters, unnecessary_const, avoid_init_to_null, invalid_override_different_default_values_named, prefer_expression_function_bodies, annotate_overrides, invalid_annotation_target, unnecessary_question_mark

part of 'deposit.dart';

// **************************************************************************
// FreezedGenerator
// **************************************************************************

// dart format off
T _$identity<T>(T value) => value;

/// @nodoc
mixin _$Deposit {

 String get id; String get leaseId; String get tenantId; DepositStatus get status; int get requiredAmount; int get collectedAmount; int get deductedAmount; int get refundedAmount; int get heldAmount; String get currency; int? get monthsEquivalent; String? get dueDate; String? get refundDueDate; String? get refundedAt;
/// Create a copy of Deposit
/// with the given fields replaced by the non-null parameter values.
@JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
$DepositCopyWith<Deposit> get copyWith => _$DepositCopyWithImpl<Deposit>(this as Deposit, _$identity);

  /// Serializes this Deposit to a JSON map.
  Map<String, dynamic> toJson();


@override
bool operator ==(Object other) {
  return identical(this, other) || (other.runtimeType == runtimeType&&other is Deposit&&(identical(other.id, id) || other.id == id)&&(identical(other.leaseId, leaseId) || other.leaseId == leaseId)&&(identical(other.tenantId, tenantId) || other.tenantId == tenantId)&&(identical(other.status, status) || other.status == status)&&(identical(other.requiredAmount, requiredAmount) || other.requiredAmount == requiredAmount)&&(identical(other.collectedAmount, collectedAmount) || other.collectedAmount == collectedAmount)&&(identical(other.deductedAmount, deductedAmount) || other.deductedAmount == deductedAmount)&&(identical(other.refundedAmount, refundedAmount) || other.refundedAmount == refundedAmount)&&(identical(other.heldAmount, heldAmount) || other.heldAmount == heldAmount)&&(identical(other.currency, currency) || other.currency == currency)&&(identical(other.monthsEquivalent, monthsEquivalent) || other.monthsEquivalent == monthsEquivalent)&&(identical(other.dueDate, dueDate) || other.dueDate == dueDate)&&(identical(other.refundDueDate, refundDueDate) || other.refundDueDate == refundDueDate)&&(identical(other.refundedAt, refundedAt) || other.refundedAt == refundedAt));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode => Object.hash(runtimeType,id,leaseId,tenantId,status,requiredAmount,collectedAmount,deductedAmount,refundedAmount,heldAmount,currency,monthsEquivalent,dueDate,refundDueDate,refundedAt);

@override
String toString() {
  return 'Deposit(id: $id, leaseId: $leaseId, tenantId: $tenantId, status: $status, requiredAmount: $requiredAmount, collectedAmount: $collectedAmount, deductedAmount: $deductedAmount, refundedAmount: $refundedAmount, heldAmount: $heldAmount, currency: $currency, monthsEquivalent: $monthsEquivalent, dueDate: $dueDate, refundDueDate: $refundDueDate, refundedAt: $refundedAt)';
}


}

/// @nodoc
abstract mixin class $DepositCopyWith<$Res>  {
  factory $DepositCopyWith(Deposit value, $Res Function(Deposit) _then) = _$DepositCopyWithImpl;
@useResult
$Res call({
 String id, String leaseId, String tenantId, DepositStatus status, int requiredAmount, int collectedAmount, int deductedAmount, int refundedAmount, int heldAmount, String currency, int? monthsEquivalent, String? dueDate, String? refundDueDate, String? refundedAt
});




}
/// @nodoc
class _$DepositCopyWithImpl<$Res>
    implements $DepositCopyWith<$Res> {
  _$DepositCopyWithImpl(this._self, this._then);

  final Deposit _self;
  final $Res Function(Deposit) _then;

/// Create a copy of Deposit
/// with the given fields replaced by the non-null parameter values.
@pragma('vm:prefer-inline') @override $Res call({Object? id = null,Object? leaseId = null,Object? tenantId = null,Object? status = null,Object? requiredAmount = null,Object? collectedAmount = null,Object? deductedAmount = null,Object? refundedAmount = null,Object? heldAmount = null,Object? currency = null,Object? monthsEquivalent = freezed,Object? dueDate = freezed,Object? refundDueDate = freezed,Object? refundedAt = freezed,}) {
  return _then(_self.copyWith(
id: null == id ? _self.id : id // ignore: cast_nullable_to_non_nullable
as String,leaseId: null == leaseId ? _self.leaseId : leaseId // ignore: cast_nullable_to_non_nullable
as String,tenantId: null == tenantId ? _self.tenantId : tenantId // ignore: cast_nullable_to_non_nullable
as String,status: null == status ? _self.status : status // ignore: cast_nullable_to_non_nullable
as DepositStatus,requiredAmount: null == requiredAmount ? _self.requiredAmount : requiredAmount // ignore: cast_nullable_to_non_nullable
as int,collectedAmount: null == collectedAmount ? _self.collectedAmount : collectedAmount // ignore: cast_nullable_to_non_nullable
as int,deductedAmount: null == deductedAmount ? _self.deductedAmount : deductedAmount // ignore: cast_nullable_to_non_nullable
as int,refundedAmount: null == refundedAmount ? _self.refundedAmount : refundedAmount // ignore: cast_nullable_to_non_nullable
as int,heldAmount: null == heldAmount ? _self.heldAmount : heldAmount // ignore: cast_nullable_to_non_nullable
as int,currency: null == currency ? _self.currency : currency // ignore: cast_nullable_to_non_nullable
as String,monthsEquivalent: freezed == monthsEquivalent ? _self.monthsEquivalent : monthsEquivalent // ignore: cast_nullable_to_non_nullable
as int?,dueDate: freezed == dueDate ? _self.dueDate : dueDate // ignore: cast_nullable_to_non_nullable
as String?,refundDueDate: freezed == refundDueDate ? _self.refundDueDate : refundDueDate // ignore: cast_nullable_to_non_nullable
as String?,refundedAt: freezed == refundedAt ? _self.refundedAt : refundedAt // ignore: cast_nullable_to_non_nullable
as String?,
  ));
}

}


/// Adds pattern-matching-related methods to [Deposit].
extension DepositPatterns on Deposit {
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

@optionalTypeArgs TResult maybeMap<TResult extends Object?>(TResult Function( _Deposit value)?  $default,{required TResult orElse(),}){
final _that = this;
switch (_that) {
case _Deposit() when $default != null:
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

@optionalTypeArgs TResult map<TResult extends Object?>(TResult Function( _Deposit value)  $default,){
final _that = this;
switch (_that) {
case _Deposit():
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

@optionalTypeArgs TResult? mapOrNull<TResult extends Object?>(TResult? Function( _Deposit value)?  $default,){
final _that = this;
switch (_that) {
case _Deposit() when $default != null:
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

@optionalTypeArgs TResult maybeWhen<TResult extends Object?>(TResult Function( String id,  String leaseId,  String tenantId,  DepositStatus status,  int requiredAmount,  int collectedAmount,  int deductedAmount,  int refundedAmount,  int heldAmount,  String currency,  int? monthsEquivalent,  String? dueDate,  String? refundDueDate,  String? refundedAt)?  $default,{required TResult orElse(),}) {final _that = this;
switch (_that) {
case _Deposit() when $default != null:
return $default(_that.id,_that.leaseId,_that.tenantId,_that.status,_that.requiredAmount,_that.collectedAmount,_that.deductedAmount,_that.refundedAmount,_that.heldAmount,_that.currency,_that.monthsEquivalent,_that.dueDate,_that.refundDueDate,_that.refundedAt);case _:
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

@optionalTypeArgs TResult when<TResult extends Object?>(TResult Function( String id,  String leaseId,  String tenantId,  DepositStatus status,  int requiredAmount,  int collectedAmount,  int deductedAmount,  int refundedAmount,  int heldAmount,  String currency,  int? monthsEquivalent,  String? dueDate,  String? refundDueDate,  String? refundedAt)  $default,) {final _that = this;
switch (_that) {
case _Deposit():
return $default(_that.id,_that.leaseId,_that.tenantId,_that.status,_that.requiredAmount,_that.collectedAmount,_that.deductedAmount,_that.refundedAmount,_that.heldAmount,_that.currency,_that.monthsEquivalent,_that.dueDate,_that.refundDueDate,_that.refundedAt);case _:
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

@optionalTypeArgs TResult? whenOrNull<TResult extends Object?>(TResult? Function( String id,  String leaseId,  String tenantId,  DepositStatus status,  int requiredAmount,  int collectedAmount,  int deductedAmount,  int refundedAmount,  int heldAmount,  String currency,  int? monthsEquivalent,  String? dueDate,  String? refundDueDate,  String? refundedAt)?  $default,) {final _that = this;
switch (_that) {
case _Deposit() when $default != null:
return $default(_that.id,_that.leaseId,_that.tenantId,_that.status,_that.requiredAmount,_that.collectedAmount,_that.deductedAmount,_that.refundedAmount,_that.heldAmount,_that.currency,_that.monthsEquivalent,_that.dueDate,_that.refundDueDate,_that.refundedAt);case _:
  return null;

}
}

}

/// @nodoc
@JsonSerializable()

class _Deposit implements Deposit {
  const _Deposit({required this.id, required this.leaseId, required this.tenantId, required this.status, required this.requiredAmount, this.collectedAmount = 0, this.deductedAmount = 0, this.refundedAmount = 0, this.heldAmount = 0, this.currency = 'XAF', this.monthsEquivalent, this.dueDate, this.refundDueDate, this.refundedAt});
  factory _Deposit.fromJson(Map<String, dynamic> json) => _$DepositFromJson(json);

@override final  String id;
@override final  String leaseId;
@override final  String tenantId;
@override final  DepositStatus status;
@override final  int requiredAmount;
@override@JsonKey() final  int collectedAmount;
@override@JsonKey() final  int deductedAmount;
@override@JsonKey() final  int refundedAmount;
@override@JsonKey() final  int heldAmount;
@override@JsonKey() final  String currency;
@override final  int? monthsEquivalent;
@override final  String? dueDate;
@override final  String? refundDueDate;
@override final  String? refundedAt;

/// Create a copy of Deposit
/// with the given fields replaced by the non-null parameter values.
@override @JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
_$DepositCopyWith<_Deposit> get copyWith => __$DepositCopyWithImpl<_Deposit>(this, _$identity);

@override
Map<String, dynamic> toJson() {
  return _$DepositToJson(this, );
}

@override
bool operator ==(Object other) {
  return identical(this, other) || (other.runtimeType == runtimeType&&other is _Deposit&&(identical(other.id, id) || other.id == id)&&(identical(other.leaseId, leaseId) || other.leaseId == leaseId)&&(identical(other.tenantId, tenantId) || other.tenantId == tenantId)&&(identical(other.status, status) || other.status == status)&&(identical(other.requiredAmount, requiredAmount) || other.requiredAmount == requiredAmount)&&(identical(other.collectedAmount, collectedAmount) || other.collectedAmount == collectedAmount)&&(identical(other.deductedAmount, deductedAmount) || other.deductedAmount == deductedAmount)&&(identical(other.refundedAmount, refundedAmount) || other.refundedAmount == refundedAmount)&&(identical(other.heldAmount, heldAmount) || other.heldAmount == heldAmount)&&(identical(other.currency, currency) || other.currency == currency)&&(identical(other.monthsEquivalent, monthsEquivalent) || other.monthsEquivalent == monthsEquivalent)&&(identical(other.dueDate, dueDate) || other.dueDate == dueDate)&&(identical(other.refundDueDate, refundDueDate) || other.refundDueDate == refundDueDate)&&(identical(other.refundedAt, refundedAt) || other.refundedAt == refundedAt));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode => Object.hash(runtimeType,id,leaseId,tenantId,status,requiredAmount,collectedAmount,deductedAmount,refundedAmount,heldAmount,currency,monthsEquivalent,dueDate,refundDueDate,refundedAt);

@override
String toString() {
  return 'Deposit(id: $id, leaseId: $leaseId, tenantId: $tenantId, status: $status, requiredAmount: $requiredAmount, collectedAmount: $collectedAmount, deductedAmount: $deductedAmount, refundedAmount: $refundedAmount, heldAmount: $heldAmount, currency: $currency, monthsEquivalent: $monthsEquivalent, dueDate: $dueDate, refundDueDate: $refundDueDate, refundedAt: $refundedAt)';
}


}

/// @nodoc
abstract mixin class _$DepositCopyWith<$Res> implements $DepositCopyWith<$Res> {
  factory _$DepositCopyWith(_Deposit value, $Res Function(_Deposit) _then) = __$DepositCopyWithImpl;
@override @useResult
$Res call({
 String id, String leaseId, String tenantId, DepositStatus status, int requiredAmount, int collectedAmount, int deductedAmount, int refundedAmount, int heldAmount, String currency, int? monthsEquivalent, String? dueDate, String? refundDueDate, String? refundedAt
});




}
/// @nodoc
class __$DepositCopyWithImpl<$Res>
    implements _$DepositCopyWith<$Res> {
  __$DepositCopyWithImpl(this._self, this._then);

  final _Deposit _self;
  final $Res Function(_Deposit) _then;

/// Create a copy of Deposit
/// with the given fields replaced by the non-null parameter values.
@override @pragma('vm:prefer-inline') $Res call({Object? id = null,Object? leaseId = null,Object? tenantId = null,Object? status = null,Object? requiredAmount = null,Object? collectedAmount = null,Object? deductedAmount = null,Object? refundedAmount = null,Object? heldAmount = null,Object? currency = null,Object? monthsEquivalent = freezed,Object? dueDate = freezed,Object? refundDueDate = freezed,Object? refundedAt = freezed,}) {
  return _then(_Deposit(
id: null == id ? _self.id : id // ignore: cast_nullable_to_non_nullable
as String,leaseId: null == leaseId ? _self.leaseId : leaseId // ignore: cast_nullable_to_non_nullable
as String,tenantId: null == tenantId ? _self.tenantId : tenantId // ignore: cast_nullable_to_non_nullable
as String,status: null == status ? _self.status : status // ignore: cast_nullable_to_non_nullable
as DepositStatus,requiredAmount: null == requiredAmount ? _self.requiredAmount : requiredAmount // ignore: cast_nullable_to_non_nullable
as int,collectedAmount: null == collectedAmount ? _self.collectedAmount : collectedAmount // ignore: cast_nullable_to_non_nullable
as int,deductedAmount: null == deductedAmount ? _self.deductedAmount : deductedAmount // ignore: cast_nullable_to_non_nullable
as int,refundedAmount: null == refundedAmount ? _self.refundedAmount : refundedAmount // ignore: cast_nullable_to_non_nullable
as int,heldAmount: null == heldAmount ? _self.heldAmount : heldAmount // ignore: cast_nullable_to_non_nullable
as int,currency: null == currency ? _self.currency : currency // ignore: cast_nullable_to_non_nullable
as String,monthsEquivalent: freezed == monthsEquivalent ? _self.monthsEquivalent : monthsEquivalent // ignore: cast_nullable_to_non_nullable
as int?,dueDate: freezed == dueDate ? _self.dueDate : dueDate // ignore: cast_nullable_to_non_nullable
as String?,refundDueDate: freezed == refundDueDate ? _self.refundDueDate : refundDueDate // ignore: cast_nullable_to_non_nullable
as String?,refundedAt: freezed == refundedAt ? _self.refundedAt : refundedAt // ignore: cast_nullable_to_non_nullable
as String?,
  ));
}


}

// dart format on
