// GENERATED CODE - DO NOT MODIFY BY HAND
// coverage:ignore-file
// ignore_for_file: type=lint
// ignore_for_file: unused_element, deprecated_member_use, deprecated_member_use_from_same_package, use_function_type_syntax_for_parameters, unnecessary_const, avoid_init_to_null, invalid_override_different_default_values_named, prefer_expression_function_bodies, annotate_overrides, invalid_annotation_target, unnecessary_question_mark

part of 'owner_statement_summary.dart';

// **************************************************************************
// FreezedGenerator
// **************************************************************************

// dart format off
T _$identity<T>(T value) => value;

/// @nodoc
mixin _$StatementPropertyRef {

 String get id; String get name;
/// Create a copy of StatementPropertyRef
/// with the given fields replaced by the non-null parameter values.
@JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
$StatementPropertyRefCopyWith<StatementPropertyRef> get copyWith => _$StatementPropertyRefCopyWithImpl<StatementPropertyRef>(this as StatementPropertyRef, _$identity);

  /// Serializes this StatementPropertyRef to a JSON map.
  Map<String, dynamic> toJson();


@override
bool operator ==(Object other) {
  return identical(this, other) || (other.runtimeType == runtimeType&&other is StatementPropertyRef&&(identical(other.id, id) || other.id == id)&&(identical(other.name, name) || other.name == name));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode => Object.hash(runtimeType,id,name);

@override
String toString() {
  return 'StatementPropertyRef(id: $id, name: $name)';
}


}

/// @nodoc
abstract mixin class $StatementPropertyRefCopyWith<$Res>  {
  factory $StatementPropertyRefCopyWith(StatementPropertyRef value, $Res Function(StatementPropertyRef) _then) = _$StatementPropertyRefCopyWithImpl;
@useResult
$Res call({
 String id, String name
});




}
/// @nodoc
class _$StatementPropertyRefCopyWithImpl<$Res>
    implements $StatementPropertyRefCopyWith<$Res> {
  _$StatementPropertyRefCopyWithImpl(this._self, this._then);

  final StatementPropertyRef _self;
  final $Res Function(StatementPropertyRef) _then;

/// Create a copy of StatementPropertyRef
/// with the given fields replaced by the non-null parameter values.
@pragma('vm:prefer-inline') @override $Res call({Object? id = null,Object? name = null,}) {
  return _then(_self.copyWith(
id: null == id ? _self.id : id // ignore: cast_nullable_to_non_nullable
as String,name: null == name ? _self.name : name // ignore: cast_nullable_to_non_nullable
as String,
  ));
}

}


/// Adds pattern-matching-related methods to [StatementPropertyRef].
extension StatementPropertyRefPatterns on StatementPropertyRef {
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

@optionalTypeArgs TResult maybeMap<TResult extends Object?>(TResult Function( _StatementPropertyRef value)?  $default,{required TResult orElse(),}){
final _that = this;
switch (_that) {
case _StatementPropertyRef() when $default != null:
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

@optionalTypeArgs TResult map<TResult extends Object?>(TResult Function( _StatementPropertyRef value)  $default,){
final _that = this;
switch (_that) {
case _StatementPropertyRef():
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

@optionalTypeArgs TResult? mapOrNull<TResult extends Object?>(TResult? Function( _StatementPropertyRef value)?  $default,){
final _that = this;
switch (_that) {
case _StatementPropertyRef() when $default != null:
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
case _StatementPropertyRef() when $default != null:
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
case _StatementPropertyRef():
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
case _StatementPropertyRef() when $default != null:
return $default(_that.id,_that.name);case _:
  return null;

}
}

}

/// @nodoc
@JsonSerializable()

class _StatementPropertyRef implements StatementPropertyRef {
  const _StatementPropertyRef({required this.id, required this.name});
  factory _StatementPropertyRef.fromJson(Map<String, dynamic> json) => _$StatementPropertyRefFromJson(json);

@override final  String id;
@override final  String name;

/// Create a copy of StatementPropertyRef
/// with the given fields replaced by the non-null parameter values.
@override @JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
_$StatementPropertyRefCopyWith<_StatementPropertyRef> get copyWith => __$StatementPropertyRefCopyWithImpl<_StatementPropertyRef>(this, _$identity);

@override
Map<String, dynamic> toJson() {
  return _$StatementPropertyRefToJson(this, );
}

@override
bool operator ==(Object other) {
  return identical(this, other) || (other.runtimeType == runtimeType&&other is _StatementPropertyRef&&(identical(other.id, id) || other.id == id)&&(identical(other.name, name) || other.name == name));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode => Object.hash(runtimeType,id,name);

@override
String toString() {
  return 'StatementPropertyRef(id: $id, name: $name)';
}


}

/// @nodoc
abstract mixin class _$StatementPropertyRefCopyWith<$Res> implements $StatementPropertyRefCopyWith<$Res> {
  factory _$StatementPropertyRefCopyWith(_StatementPropertyRef value, $Res Function(_StatementPropertyRef) _then) = __$StatementPropertyRefCopyWithImpl;
@override @useResult
$Res call({
 String id, String name
});




}
/// @nodoc
class __$StatementPropertyRefCopyWithImpl<$Res>
    implements _$StatementPropertyRefCopyWith<$Res> {
  __$StatementPropertyRefCopyWithImpl(this._self, this._then);

  final _StatementPropertyRef _self;
  final $Res Function(_StatementPropertyRef) _then;

/// Create a copy of StatementPropertyRef
/// with the given fields replaced by the non-null parameter values.
@override @pragma('vm:prefer-inline') $Res call({Object? id = null,Object? name = null,}) {
  return _then(_StatementPropertyRef(
id: null == id ? _self.id : id // ignore: cast_nullable_to_non_nullable
as String,name: null == name ? _self.name : name // ignore: cast_nullable_to_non_nullable
as String,
  ));
}


}


/// @nodoc
mixin _$OwnerStatementSummary {

 String get id; String get statementNumber; StatementStatus get status; StatementPropertyRef? get property; String get periodStart; String get periodEnd; int get rentCollectedAmount; int get commissionAmount; int get expensesAmount; int get carryForwardAmount; int get netPayableAmount; String? get issuedAt; String? get sentAt; String? get settledAt;
/// Create a copy of OwnerStatementSummary
/// with the given fields replaced by the non-null parameter values.
@JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
$OwnerStatementSummaryCopyWith<OwnerStatementSummary> get copyWith => _$OwnerStatementSummaryCopyWithImpl<OwnerStatementSummary>(this as OwnerStatementSummary, _$identity);

  /// Serializes this OwnerStatementSummary to a JSON map.
  Map<String, dynamic> toJson();


@override
bool operator ==(Object other) {
  return identical(this, other) || (other.runtimeType == runtimeType&&other is OwnerStatementSummary&&(identical(other.id, id) || other.id == id)&&(identical(other.statementNumber, statementNumber) || other.statementNumber == statementNumber)&&(identical(other.status, status) || other.status == status)&&(identical(other.property, property) || other.property == property)&&(identical(other.periodStart, periodStart) || other.periodStart == periodStart)&&(identical(other.periodEnd, periodEnd) || other.periodEnd == periodEnd)&&(identical(other.rentCollectedAmount, rentCollectedAmount) || other.rentCollectedAmount == rentCollectedAmount)&&(identical(other.commissionAmount, commissionAmount) || other.commissionAmount == commissionAmount)&&(identical(other.expensesAmount, expensesAmount) || other.expensesAmount == expensesAmount)&&(identical(other.carryForwardAmount, carryForwardAmount) || other.carryForwardAmount == carryForwardAmount)&&(identical(other.netPayableAmount, netPayableAmount) || other.netPayableAmount == netPayableAmount)&&(identical(other.issuedAt, issuedAt) || other.issuedAt == issuedAt)&&(identical(other.sentAt, sentAt) || other.sentAt == sentAt)&&(identical(other.settledAt, settledAt) || other.settledAt == settledAt));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode => Object.hash(runtimeType,id,statementNumber,status,property,periodStart,periodEnd,rentCollectedAmount,commissionAmount,expensesAmount,carryForwardAmount,netPayableAmount,issuedAt,sentAt,settledAt);

@override
String toString() {
  return 'OwnerStatementSummary(id: $id, statementNumber: $statementNumber, status: $status, property: $property, periodStart: $periodStart, periodEnd: $periodEnd, rentCollectedAmount: $rentCollectedAmount, commissionAmount: $commissionAmount, expensesAmount: $expensesAmount, carryForwardAmount: $carryForwardAmount, netPayableAmount: $netPayableAmount, issuedAt: $issuedAt, sentAt: $sentAt, settledAt: $settledAt)';
}


}

/// @nodoc
abstract mixin class $OwnerStatementSummaryCopyWith<$Res>  {
  factory $OwnerStatementSummaryCopyWith(OwnerStatementSummary value, $Res Function(OwnerStatementSummary) _then) = _$OwnerStatementSummaryCopyWithImpl;
@useResult
$Res call({
 String id, String statementNumber, StatementStatus status, StatementPropertyRef? property, String periodStart, String periodEnd, int rentCollectedAmount, int commissionAmount, int expensesAmount, int carryForwardAmount, int netPayableAmount, String? issuedAt, String? sentAt, String? settledAt
});


$StatementPropertyRefCopyWith<$Res>? get property;

}
/// @nodoc
class _$OwnerStatementSummaryCopyWithImpl<$Res>
    implements $OwnerStatementSummaryCopyWith<$Res> {
  _$OwnerStatementSummaryCopyWithImpl(this._self, this._then);

  final OwnerStatementSummary _self;
  final $Res Function(OwnerStatementSummary) _then;

/// Create a copy of OwnerStatementSummary
/// with the given fields replaced by the non-null parameter values.
@pragma('vm:prefer-inline') @override $Res call({Object? id = null,Object? statementNumber = null,Object? status = null,Object? property = freezed,Object? periodStart = null,Object? periodEnd = null,Object? rentCollectedAmount = null,Object? commissionAmount = null,Object? expensesAmount = null,Object? carryForwardAmount = null,Object? netPayableAmount = null,Object? issuedAt = freezed,Object? sentAt = freezed,Object? settledAt = freezed,}) {
  return _then(_self.copyWith(
id: null == id ? _self.id : id // ignore: cast_nullable_to_non_nullable
as String,statementNumber: null == statementNumber ? _self.statementNumber : statementNumber // ignore: cast_nullable_to_non_nullable
as String,status: null == status ? _self.status : status // ignore: cast_nullable_to_non_nullable
as StatementStatus,property: freezed == property ? _self.property : property // ignore: cast_nullable_to_non_nullable
as StatementPropertyRef?,periodStart: null == periodStart ? _self.periodStart : periodStart // ignore: cast_nullable_to_non_nullable
as String,periodEnd: null == periodEnd ? _self.periodEnd : periodEnd // ignore: cast_nullable_to_non_nullable
as String,rentCollectedAmount: null == rentCollectedAmount ? _self.rentCollectedAmount : rentCollectedAmount // ignore: cast_nullable_to_non_nullable
as int,commissionAmount: null == commissionAmount ? _self.commissionAmount : commissionAmount // ignore: cast_nullable_to_non_nullable
as int,expensesAmount: null == expensesAmount ? _self.expensesAmount : expensesAmount // ignore: cast_nullable_to_non_nullable
as int,carryForwardAmount: null == carryForwardAmount ? _self.carryForwardAmount : carryForwardAmount // ignore: cast_nullable_to_non_nullable
as int,netPayableAmount: null == netPayableAmount ? _self.netPayableAmount : netPayableAmount // ignore: cast_nullable_to_non_nullable
as int,issuedAt: freezed == issuedAt ? _self.issuedAt : issuedAt // ignore: cast_nullable_to_non_nullable
as String?,sentAt: freezed == sentAt ? _self.sentAt : sentAt // ignore: cast_nullable_to_non_nullable
as String?,settledAt: freezed == settledAt ? _self.settledAt : settledAt // ignore: cast_nullable_to_non_nullable
as String?,
  ));
}
/// Create a copy of OwnerStatementSummary
/// with the given fields replaced by the non-null parameter values.
@override
@pragma('vm:prefer-inline')
$StatementPropertyRefCopyWith<$Res>? get property {
    if (_self.property == null) {
    return null;
  }

  return $StatementPropertyRefCopyWith<$Res>(_self.property!, (value) {
    return _then(_self.copyWith(property: value));
  });
}
}


/// Adds pattern-matching-related methods to [OwnerStatementSummary].
extension OwnerStatementSummaryPatterns on OwnerStatementSummary {
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

@optionalTypeArgs TResult maybeMap<TResult extends Object?>(TResult Function( _OwnerStatementSummary value)?  $default,{required TResult orElse(),}){
final _that = this;
switch (_that) {
case _OwnerStatementSummary() when $default != null:
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

@optionalTypeArgs TResult map<TResult extends Object?>(TResult Function( _OwnerStatementSummary value)  $default,){
final _that = this;
switch (_that) {
case _OwnerStatementSummary():
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

@optionalTypeArgs TResult? mapOrNull<TResult extends Object?>(TResult? Function( _OwnerStatementSummary value)?  $default,){
final _that = this;
switch (_that) {
case _OwnerStatementSummary() when $default != null:
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

@optionalTypeArgs TResult maybeWhen<TResult extends Object?>(TResult Function( String id,  String statementNumber,  StatementStatus status,  StatementPropertyRef? property,  String periodStart,  String periodEnd,  int rentCollectedAmount,  int commissionAmount,  int expensesAmount,  int carryForwardAmount,  int netPayableAmount,  String? issuedAt,  String? sentAt,  String? settledAt)?  $default,{required TResult orElse(),}) {final _that = this;
switch (_that) {
case _OwnerStatementSummary() when $default != null:
return $default(_that.id,_that.statementNumber,_that.status,_that.property,_that.periodStart,_that.periodEnd,_that.rentCollectedAmount,_that.commissionAmount,_that.expensesAmount,_that.carryForwardAmount,_that.netPayableAmount,_that.issuedAt,_that.sentAt,_that.settledAt);case _:
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

@optionalTypeArgs TResult when<TResult extends Object?>(TResult Function( String id,  String statementNumber,  StatementStatus status,  StatementPropertyRef? property,  String periodStart,  String periodEnd,  int rentCollectedAmount,  int commissionAmount,  int expensesAmount,  int carryForwardAmount,  int netPayableAmount,  String? issuedAt,  String? sentAt,  String? settledAt)  $default,) {final _that = this;
switch (_that) {
case _OwnerStatementSummary():
return $default(_that.id,_that.statementNumber,_that.status,_that.property,_that.periodStart,_that.periodEnd,_that.rentCollectedAmount,_that.commissionAmount,_that.expensesAmount,_that.carryForwardAmount,_that.netPayableAmount,_that.issuedAt,_that.sentAt,_that.settledAt);case _:
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

@optionalTypeArgs TResult? whenOrNull<TResult extends Object?>(TResult? Function( String id,  String statementNumber,  StatementStatus status,  StatementPropertyRef? property,  String periodStart,  String periodEnd,  int rentCollectedAmount,  int commissionAmount,  int expensesAmount,  int carryForwardAmount,  int netPayableAmount,  String? issuedAt,  String? sentAt,  String? settledAt)?  $default,) {final _that = this;
switch (_that) {
case _OwnerStatementSummary() when $default != null:
return $default(_that.id,_that.statementNumber,_that.status,_that.property,_that.periodStart,_that.periodEnd,_that.rentCollectedAmount,_that.commissionAmount,_that.expensesAmount,_that.carryForwardAmount,_that.netPayableAmount,_that.issuedAt,_that.sentAt,_that.settledAt);case _:
  return null;

}
}

}

/// @nodoc
@JsonSerializable()

class _OwnerStatementSummary implements OwnerStatementSummary {
  const _OwnerStatementSummary({required this.id, required this.statementNumber, required this.status, this.property, required this.periodStart, required this.periodEnd, this.rentCollectedAmount = 0, this.commissionAmount = 0, this.expensesAmount = 0, this.carryForwardAmount = 0, required this.netPayableAmount, this.issuedAt, this.sentAt, this.settledAt});
  factory _OwnerStatementSummary.fromJson(Map<String, dynamic> json) => _$OwnerStatementSummaryFromJson(json);

@override final  String id;
@override final  String statementNumber;
@override final  StatementStatus status;
@override final  StatementPropertyRef? property;
@override final  String periodStart;
@override final  String periodEnd;
@override@JsonKey() final  int rentCollectedAmount;
@override@JsonKey() final  int commissionAmount;
@override@JsonKey() final  int expensesAmount;
@override@JsonKey() final  int carryForwardAmount;
@override final  int netPayableAmount;
@override final  String? issuedAt;
@override final  String? sentAt;
@override final  String? settledAt;

/// Create a copy of OwnerStatementSummary
/// with the given fields replaced by the non-null parameter values.
@override @JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
_$OwnerStatementSummaryCopyWith<_OwnerStatementSummary> get copyWith => __$OwnerStatementSummaryCopyWithImpl<_OwnerStatementSummary>(this, _$identity);

@override
Map<String, dynamic> toJson() {
  return _$OwnerStatementSummaryToJson(this, );
}

@override
bool operator ==(Object other) {
  return identical(this, other) || (other.runtimeType == runtimeType&&other is _OwnerStatementSummary&&(identical(other.id, id) || other.id == id)&&(identical(other.statementNumber, statementNumber) || other.statementNumber == statementNumber)&&(identical(other.status, status) || other.status == status)&&(identical(other.property, property) || other.property == property)&&(identical(other.periodStart, periodStart) || other.periodStart == periodStart)&&(identical(other.periodEnd, periodEnd) || other.periodEnd == periodEnd)&&(identical(other.rentCollectedAmount, rentCollectedAmount) || other.rentCollectedAmount == rentCollectedAmount)&&(identical(other.commissionAmount, commissionAmount) || other.commissionAmount == commissionAmount)&&(identical(other.expensesAmount, expensesAmount) || other.expensesAmount == expensesAmount)&&(identical(other.carryForwardAmount, carryForwardAmount) || other.carryForwardAmount == carryForwardAmount)&&(identical(other.netPayableAmount, netPayableAmount) || other.netPayableAmount == netPayableAmount)&&(identical(other.issuedAt, issuedAt) || other.issuedAt == issuedAt)&&(identical(other.sentAt, sentAt) || other.sentAt == sentAt)&&(identical(other.settledAt, settledAt) || other.settledAt == settledAt));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode => Object.hash(runtimeType,id,statementNumber,status,property,periodStart,periodEnd,rentCollectedAmount,commissionAmount,expensesAmount,carryForwardAmount,netPayableAmount,issuedAt,sentAt,settledAt);

@override
String toString() {
  return 'OwnerStatementSummary(id: $id, statementNumber: $statementNumber, status: $status, property: $property, periodStart: $periodStart, periodEnd: $periodEnd, rentCollectedAmount: $rentCollectedAmount, commissionAmount: $commissionAmount, expensesAmount: $expensesAmount, carryForwardAmount: $carryForwardAmount, netPayableAmount: $netPayableAmount, issuedAt: $issuedAt, sentAt: $sentAt, settledAt: $settledAt)';
}


}

/// @nodoc
abstract mixin class _$OwnerStatementSummaryCopyWith<$Res> implements $OwnerStatementSummaryCopyWith<$Res> {
  factory _$OwnerStatementSummaryCopyWith(_OwnerStatementSummary value, $Res Function(_OwnerStatementSummary) _then) = __$OwnerStatementSummaryCopyWithImpl;
@override @useResult
$Res call({
 String id, String statementNumber, StatementStatus status, StatementPropertyRef? property, String periodStart, String periodEnd, int rentCollectedAmount, int commissionAmount, int expensesAmount, int carryForwardAmount, int netPayableAmount, String? issuedAt, String? sentAt, String? settledAt
});


@override $StatementPropertyRefCopyWith<$Res>? get property;

}
/// @nodoc
class __$OwnerStatementSummaryCopyWithImpl<$Res>
    implements _$OwnerStatementSummaryCopyWith<$Res> {
  __$OwnerStatementSummaryCopyWithImpl(this._self, this._then);

  final _OwnerStatementSummary _self;
  final $Res Function(_OwnerStatementSummary) _then;

/// Create a copy of OwnerStatementSummary
/// with the given fields replaced by the non-null parameter values.
@override @pragma('vm:prefer-inline') $Res call({Object? id = null,Object? statementNumber = null,Object? status = null,Object? property = freezed,Object? periodStart = null,Object? periodEnd = null,Object? rentCollectedAmount = null,Object? commissionAmount = null,Object? expensesAmount = null,Object? carryForwardAmount = null,Object? netPayableAmount = null,Object? issuedAt = freezed,Object? sentAt = freezed,Object? settledAt = freezed,}) {
  return _then(_OwnerStatementSummary(
id: null == id ? _self.id : id // ignore: cast_nullable_to_non_nullable
as String,statementNumber: null == statementNumber ? _self.statementNumber : statementNumber // ignore: cast_nullable_to_non_nullable
as String,status: null == status ? _self.status : status // ignore: cast_nullable_to_non_nullable
as StatementStatus,property: freezed == property ? _self.property : property // ignore: cast_nullable_to_non_nullable
as StatementPropertyRef?,periodStart: null == periodStart ? _self.periodStart : periodStart // ignore: cast_nullable_to_non_nullable
as String,periodEnd: null == periodEnd ? _self.periodEnd : periodEnd // ignore: cast_nullable_to_non_nullable
as String,rentCollectedAmount: null == rentCollectedAmount ? _self.rentCollectedAmount : rentCollectedAmount // ignore: cast_nullable_to_non_nullable
as int,commissionAmount: null == commissionAmount ? _self.commissionAmount : commissionAmount // ignore: cast_nullable_to_non_nullable
as int,expensesAmount: null == expensesAmount ? _self.expensesAmount : expensesAmount // ignore: cast_nullable_to_non_nullable
as int,carryForwardAmount: null == carryForwardAmount ? _self.carryForwardAmount : carryForwardAmount // ignore: cast_nullable_to_non_nullable
as int,netPayableAmount: null == netPayableAmount ? _self.netPayableAmount : netPayableAmount // ignore: cast_nullable_to_non_nullable
as int,issuedAt: freezed == issuedAt ? _self.issuedAt : issuedAt // ignore: cast_nullable_to_non_nullable
as String?,sentAt: freezed == sentAt ? _self.sentAt : sentAt // ignore: cast_nullable_to_non_nullable
as String?,settledAt: freezed == settledAt ? _self.settledAt : settledAt // ignore: cast_nullable_to_non_nullable
as String?,
  ));
}

/// Create a copy of OwnerStatementSummary
/// with the given fields replaced by the non-null parameter values.
@override
@pragma('vm:prefer-inline')
$StatementPropertyRefCopyWith<$Res>? get property {
    if (_self.property == null) {
    return null;
  }

  return $StatementPropertyRefCopyWith<$Res>(_self.property!, (value) {
    return _then(_self.copyWith(property: value));
  });
}
}

// dart format on
