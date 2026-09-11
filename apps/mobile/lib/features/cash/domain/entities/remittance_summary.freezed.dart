// GENERATED CODE - DO NOT MODIFY BY HAND
// coverage:ignore-file
// ignore_for_file: type=lint
// ignore_for_file: unused_element, deprecated_member_use, deprecated_member_use_from_same_package, use_function_type_syntax_for_parameters, unnecessary_const, avoid_init_to_null, invalid_override_different_default_values_named, prefer_expression_function_bodies, annotate_overrides, invalid_annotation_target, unnecessary_question_mark

part of 'remittance_summary.dart';

// **************************************************************************
// FreezedGenerator
// **************************************************************************

// dart format off
T _$identity<T>(T value) => value;

/// @nodoc
mixin _$RemittanceSummary {

 String get id; String get reference; RemittanceStatus get status; String get collectorUserId; String get collectorName; int get declaredAmount; int get expectedAmount; int get countedAmount; int get varianceAmount; int get receiptsCount; String get openedAt; String? get submittedAt; String? get verifiedAt;
/// Create a copy of RemittanceSummary
/// with the given fields replaced by the non-null parameter values.
@JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
$RemittanceSummaryCopyWith<RemittanceSummary> get copyWith => _$RemittanceSummaryCopyWithImpl<RemittanceSummary>(this as RemittanceSummary, _$identity);

  /// Serializes this RemittanceSummary to a JSON map.
  Map<String, dynamic> toJson();


@override
bool operator ==(Object other) {
  return identical(this, other) || (other.runtimeType == runtimeType&&other is RemittanceSummary&&(identical(other.id, id) || other.id == id)&&(identical(other.reference, reference) || other.reference == reference)&&(identical(other.status, status) || other.status == status)&&(identical(other.collectorUserId, collectorUserId) || other.collectorUserId == collectorUserId)&&(identical(other.collectorName, collectorName) || other.collectorName == collectorName)&&(identical(other.declaredAmount, declaredAmount) || other.declaredAmount == declaredAmount)&&(identical(other.expectedAmount, expectedAmount) || other.expectedAmount == expectedAmount)&&(identical(other.countedAmount, countedAmount) || other.countedAmount == countedAmount)&&(identical(other.varianceAmount, varianceAmount) || other.varianceAmount == varianceAmount)&&(identical(other.receiptsCount, receiptsCount) || other.receiptsCount == receiptsCount)&&(identical(other.openedAt, openedAt) || other.openedAt == openedAt)&&(identical(other.submittedAt, submittedAt) || other.submittedAt == submittedAt)&&(identical(other.verifiedAt, verifiedAt) || other.verifiedAt == verifiedAt));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode => Object.hash(runtimeType,id,reference,status,collectorUserId,collectorName,declaredAmount,expectedAmount,countedAmount,varianceAmount,receiptsCount,openedAt,submittedAt,verifiedAt);

@override
String toString() {
  return 'RemittanceSummary(id: $id, reference: $reference, status: $status, collectorUserId: $collectorUserId, collectorName: $collectorName, declaredAmount: $declaredAmount, expectedAmount: $expectedAmount, countedAmount: $countedAmount, varianceAmount: $varianceAmount, receiptsCount: $receiptsCount, openedAt: $openedAt, submittedAt: $submittedAt, verifiedAt: $verifiedAt)';
}


}

/// @nodoc
abstract mixin class $RemittanceSummaryCopyWith<$Res>  {
  factory $RemittanceSummaryCopyWith(RemittanceSummary value, $Res Function(RemittanceSummary) _then) = _$RemittanceSummaryCopyWithImpl;
@useResult
$Res call({
 String id, String reference, RemittanceStatus status, String collectorUserId, String collectorName, int declaredAmount, int expectedAmount, int countedAmount, int varianceAmount, int receiptsCount, String openedAt, String? submittedAt, String? verifiedAt
});




}
/// @nodoc
class _$RemittanceSummaryCopyWithImpl<$Res>
    implements $RemittanceSummaryCopyWith<$Res> {
  _$RemittanceSummaryCopyWithImpl(this._self, this._then);

  final RemittanceSummary _self;
  final $Res Function(RemittanceSummary) _then;

/// Create a copy of RemittanceSummary
/// with the given fields replaced by the non-null parameter values.
@pragma('vm:prefer-inline') @override $Res call({Object? id = null,Object? reference = null,Object? status = null,Object? collectorUserId = null,Object? collectorName = null,Object? declaredAmount = null,Object? expectedAmount = null,Object? countedAmount = null,Object? varianceAmount = null,Object? receiptsCount = null,Object? openedAt = null,Object? submittedAt = freezed,Object? verifiedAt = freezed,}) {
  return _then(_self.copyWith(
id: null == id ? _self.id : id // ignore: cast_nullable_to_non_nullable
as String,reference: null == reference ? _self.reference : reference // ignore: cast_nullable_to_non_nullable
as String,status: null == status ? _self.status : status // ignore: cast_nullable_to_non_nullable
as RemittanceStatus,collectorUserId: null == collectorUserId ? _self.collectorUserId : collectorUserId // ignore: cast_nullable_to_non_nullable
as String,collectorName: null == collectorName ? _self.collectorName : collectorName // ignore: cast_nullable_to_non_nullable
as String,declaredAmount: null == declaredAmount ? _self.declaredAmount : declaredAmount // ignore: cast_nullable_to_non_nullable
as int,expectedAmount: null == expectedAmount ? _self.expectedAmount : expectedAmount // ignore: cast_nullable_to_non_nullable
as int,countedAmount: null == countedAmount ? _self.countedAmount : countedAmount // ignore: cast_nullable_to_non_nullable
as int,varianceAmount: null == varianceAmount ? _self.varianceAmount : varianceAmount // ignore: cast_nullable_to_non_nullable
as int,receiptsCount: null == receiptsCount ? _self.receiptsCount : receiptsCount // ignore: cast_nullable_to_non_nullable
as int,openedAt: null == openedAt ? _self.openedAt : openedAt // ignore: cast_nullable_to_non_nullable
as String,submittedAt: freezed == submittedAt ? _self.submittedAt : submittedAt // ignore: cast_nullable_to_non_nullable
as String?,verifiedAt: freezed == verifiedAt ? _self.verifiedAt : verifiedAt // ignore: cast_nullable_to_non_nullable
as String?,
  ));
}

}


/// Adds pattern-matching-related methods to [RemittanceSummary].
extension RemittanceSummaryPatterns on RemittanceSummary {
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

@optionalTypeArgs TResult maybeMap<TResult extends Object?>(TResult Function( _RemittanceSummary value)?  $default,{required TResult orElse(),}){
final _that = this;
switch (_that) {
case _RemittanceSummary() when $default != null:
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

@optionalTypeArgs TResult map<TResult extends Object?>(TResult Function( _RemittanceSummary value)  $default,){
final _that = this;
switch (_that) {
case _RemittanceSummary():
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

@optionalTypeArgs TResult? mapOrNull<TResult extends Object?>(TResult? Function( _RemittanceSummary value)?  $default,){
final _that = this;
switch (_that) {
case _RemittanceSummary() when $default != null:
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

@optionalTypeArgs TResult maybeWhen<TResult extends Object?>(TResult Function( String id,  String reference,  RemittanceStatus status,  String collectorUserId,  String collectorName,  int declaredAmount,  int expectedAmount,  int countedAmount,  int varianceAmount,  int receiptsCount,  String openedAt,  String? submittedAt,  String? verifiedAt)?  $default,{required TResult orElse(),}) {final _that = this;
switch (_that) {
case _RemittanceSummary() when $default != null:
return $default(_that.id,_that.reference,_that.status,_that.collectorUserId,_that.collectorName,_that.declaredAmount,_that.expectedAmount,_that.countedAmount,_that.varianceAmount,_that.receiptsCount,_that.openedAt,_that.submittedAt,_that.verifiedAt);case _:
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

@optionalTypeArgs TResult when<TResult extends Object?>(TResult Function( String id,  String reference,  RemittanceStatus status,  String collectorUserId,  String collectorName,  int declaredAmount,  int expectedAmount,  int countedAmount,  int varianceAmount,  int receiptsCount,  String openedAt,  String? submittedAt,  String? verifiedAt)  $default,) {final _that = this;
switch (_that) {
case _RemittanceSummary():
return $default(_that.id,_that.reference,_that.status,_that.collectorUserId,_that.collectorName,_that.declaredAmount,_that.expectedAmount,_that.countedAmount,_that.varianceAmount,_that.receiptsCount,_that.openedAt,_that.submittedAt,_that.verifiedAt);case _:
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

@optionalTypeArgs TResult? whenOrNull<TResult extends Object?>(TResult? Function( String id,  String reference,  RemittanceStatus status,  String collectorUserId,  String collectorName,  int declaredAmount,  int expectedAmount,  int countedAmount,  int varianceAmount,  int receiptsCount,  String openedAt,  String? submittedAt,  String? verifiedAt)?  $default,) {final _that = this;
switch (_that) {
case _RemittanceSummary() when $default != null:
return $default(_that.id,_that.reference,_that.status,_that.collectorUserId,_that.collectorName,_that.declaredAmount,_that.expectedAmount,_that.countedAmount,_that.varianceAmount,_that.receiptsCount,_that.openedAt,_that.submittedAt,_that.verifiedAt);case _:
  return null;

}
}

}

/// @nodoc
@JsonSerializable()

class _RemittanceSummary implements RemittanceSummary {
  const _RemittanceSummary({required this.id, required this.reference, required this.status, required this.collectorUserId, required this.collectorName, required this.declaredAmount, required this.expectedAmount, required this.countedAmount, required this.varianceAmount, required this.receiptsCount, required this.openedAt, this.submittedAt, this.verifiedAt});
  factory _RemittanceSummary.fromJson(Map<String, dynamic> json) => _$RemittanceSummaryFromJson(json);

@override final  String id;
@override final  String reference;
@override final  RemittanceStatus status;
@override final  String collectorUserId;
@override final  String collectorName;
@override final  int declaredAmount;
@override final  int expectedAmount;
@override final  int countedAmount;
@override final  int varianceAmount;
@override final  int receiptsCount;
@override final  String openedAt;
@override final  String? submittedAt;
@override final  String? verifiedAt;

/// Create a copy of RemittanceSummary
/// with the given fields replaced by the non-null parameter values.
@override @JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
_$RemittanceSummaryCopyWith<_RemittanceSummary> get copyWith => __$RemittanceSummaryCopyWithImpl<_RemittanceSummary>(this, _$identity);

@override
Map<String, dynamic> toJson() {
  return _$RemittanceSummaryToJson(this, );
}

@override
bool operator ==(Object other) {
  return identical(this, other) || (other.runtimeType == runtimeType&&other is _RemittanceSummary&&(identical(other.id, id) || other.id == id)&&(identical(other.reference, reference) || other.reference == reference)&&(identical(other.status, status) || other.status == status)&&(identical(other.collectorUserId, collectorUserId) || other.collectorUserId == collectorUserId)&&(identical(other.collectorName, collectorName) || other.collectorName == collectorName)&&(identical(other.declaredAmount, declaredAmount) || other.declaredAmount == declaredAmount)&&(identical(other.expectedAmount, expectedAmount) || other.expectedAmount == expectedAmount)&&(identical(other.countedAmount, countedAmount) || other.countedAmount == countedAmount)&&(identical(other.varianceAmount, varianceAmount) || other.varianceAmount == varianceAmount)&&(identical(other.receiptsCount, receiptsCount) || other.receiptsCount == receiptsCount)&&(identical(other.openedAt, openedAt) || other.openedAt == openedAt)&&(identical(other.submittedAt, submittedAt) || other.submittedAt == submittedAt)&&(identical(other.verifiedAt, verifiedAt) || other.verifiedAt == verifiedAt));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode => Object.hash(runtimeType,id,reference,status,collectorUserId,collectorName,declaredAmount,expectedAmount,countedAmount,varianceAmount,receiptsCount,openedAt,submittedAt,verifiedAt);

@override
String toString() {
  return 'RemittanceSummary(id: $id, reference: $reference, status: $status, collectorUserId: $collectorUserId, collectorName: $collectorName, declaredAmount: $declaredAmount, expectedAmount: $expectedAmount, countedAmount: $countedAmount, varianceAmount: $varianceAmount, receiptsCount: $receiptsCount, openedAt: $openedAt, submittedAt: $submittedAt, verifiedAt: $verifiedAt)';
}


}

/// @nodoc
abstract mixin class _$RemittanceSummaryCopyWith<$Res> implements $RemittanceSummaryCopyWith<$Res> {
  factory _$RemittanceSummaryCopyWith(_RemittanceSummary value, $Res Function(_RemittanceSummary) _then) = __$RemittanceSummaryCopyWithImpl;
@override @useResult
$Res call({
 String id, String reference, RemittanceStatus status, String collectorUserId, String collectorName, int declaredAmount, int expectedAmount, int countedAmount, int varianceAmount, int receiptsCount, String openedAt, String? submittedAt, String? verifiedAt
});




}
/// @nodoc
class __$RemittanceSummaryCopyWithImpl<$Res>
    implements _$RemittanceSummaryCopyWith<$Res> {
  __$RemittanceSummaryCopyWithImpl(this._self, this._then);

  final _RemittanceSummary _self;
  final $Res Function(_RemittanceSummary) _then;

/// Create a copy of RemittanceSummary
/// with the given fields replaced by the non-null parameter values.
@override @pragma('vm:prefer-inline') $Res call({Object? id = null,Object? reference = null,Object? status = null,Object? collectorUserId = null,Object? collectorName = null,Object? declaredAmount = null,Object? expectedAmount = null,Object? countedAmount = null,Object? varianceAmount = null,Object? receiptsCount = null,Object? openedAt = null,Object? submittedAt = freezed,Object? verifiedAt = freezed,}) {
  return _then(_RemittanceSummary(
id: null == id ? _self.id : id // ignore: cast_nullable_to_non_nullable
as String,reference: null == reference ? _self.reference : reference // ignore: cast_nullable_to_non_nullable
as String,status: null == status ? _self.status : status // ignore: cast_nullable_to_non_nullable
as RemittanceStatus,collectorUserId: null == collectorUserId ? _self.collectorUserId : collectorUserId // ignore: cast_nullable_to_non_nullable
as String,collectorName: null == collectorName ? _self.collectorName : collectorName // ignore: cast_nullable_to_non_nullable
as String,declaredAmount: null == declaredAmount ? _self.declaredAmount : declaredAmount // ignore: cast_nullable_to_non_nullable
as int,expectedAmount: null == expectedAmount ? _self.expectedAmount : expectedAmount // ignore: cast_nullable_to_non_nullable
as int,countedAmount: null == countedAmount ? _self.countedAmount : countedAmount // ignore: cast_nullable_to_non_nullable
as int,varianceAmount: null == varianceAmount ? _self.varianceAmount : varianceAmount // ignore: cast_nullable_to_non_nullable
as int,receiptsCount: null == receiptsCount ? _self.receiptsCount : receiptsCount // ignore: cast_nullable_to_non_nullable
as int,openedAt: null == openedAt ? _self.openedAt : openedAt // ignore: cast_nullable_to_non_nullable
as String,submittedAt: freezed == submittedAt ? _self.submittedAt : submittedAt // ignore: cast_nullable_to_non_nullable
as String?,verifiedAt: freezed == verifiedAt ? _self.verifiedAt : verifiedAt // ignore: cast_nullable_to_non_nullable
as String?,
  ));
}


}

// dart format on
