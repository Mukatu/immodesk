// GENERATED CODE - DO NOT MODIFY BY HAND
// coverage:ignore-file
// ignore_for_file: type=lint
// ignore_for_file: unused_element, deprecated_member_use, deprecated_member_use_from_same_package, use_function_type_syntax_for_parameters, unnecessary_const, avoid_init_to_null, invalid_override_different_default_values_named, prefer_expression_function_bodies, annotate_overrides, invalid_annotation_target, unnecessary_question_mark

part of 'momo_quote.dart';

// **************************************************************************
// FreezedGenerator
// **************************************************************************

// dart format off
T _$identity<T>(T value) => value;

/// @nodoc
mixin _$MomoQuote {

 int get amount; int get feeAmount; int get totalDebited; int get netReceived; MomoFeeBearer get feeBearer;
/// Create a copy of MomoQuote
/// with the given fields replaced by the non-null parameter values.
@JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
$MomoQuoteCopyWith<MomoQuote> get copyWith => _$MomoQuoteCopyWithImpl<MomoQuote>(this as MomoQuote, _$identity);

  /// Serializes this MomoQuote to a JSON map.
  Map<String, dynamic> toJson();


@override
bool operator ==(Object other) {
  return identical(this, other) || (other.runtimeType == runtimeType&&other is MomoQuote&&(identical(other.amount, amount) || other.amount == amount)&&(identical(other.feeAmount, feeAmount) || other.feeAmount == feeAmount)&&(identical(other.totalDebited, totalDebited) || other.totalDebited == totalDebited)&&(identical(other.netReceived, netReceived) || other.netReceived == netReceived)&&(identical(other.feeBearer, feeBearer) || other.feeBearer == feeBearer));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode => Object.hash(runtimeType,amount,feeAmount,totalDebited,netReceived,feeBearer);

@override
String toString() {
  return 'MomoQuote(amount: $amount, feeAmount: $feeAmount, totalDebited: $totalDebited, netReceived: $netReceived, feeBearer: $feeBearer)';
}


}

/// @nodoc
abstract mixin class $MomoQuoteCopyWith<$Res>  {
  factory $MomoQuoteCopyWith(MomoQuote value, $Res Function(MomoQuote) _then) = _$MomoQuoteCopyWithImpl;
@useResult
$Res call({
 int amount, int feeAmount, int totalDebited, int netReceived, MomoFeeBearer feeBearer
});




}
/// @nodoc
class _$MomoQuoteCopyWithImpl<$Res>
    implements $MomoQuoteCopyWith<$Res> {
  _$MomoQuoteCopyWithImpl(this._self, this._then);

  final MomoQuote _self;
  final $Res Function(MomoQuote) _then;

/// Create a copy of MomoQuote
/// with the given fields replaced by the non-null parameter values.
@pragma('vm:prefer-inline') @override $Res call({Object? amount = null,Object? feeAmount = null,Object? totalDebited = null,Object? netReceived = null,Object? feeBearer = null,}) {
  return _then(_self.copyWith(
amount: null == amount ? _self.amount : amount // ignore: cast_nullable_to_non_nullable
as int,feeAmount: null == feeAmount ? _self.feeAmount : feeAmount // ignore: cast_nullable_to_non_nullable
as int,totalDebited: null == totalDebited ? _self.totalDebited : totalDebited // ignore: cast_nullable_to_non_nullable
as int,netReceived: null == netReceived ? _self.netReceived : netReceived // ignore: cast_nullable_to_non_nullable
as int,feeBearer: null == feeBearer ? _self.feeBearer : feeBearer // ignore: cast_nullable_to_non_nullable
as MomoFeeBearer,
  ));
}

}


/// Adds pattern-matching-related methods to [MomoQuote].
extension MomoQuotePatterns on MomoQuote {
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

@optionalTypeArgs TResult maybeMap<TResult extends Object?>(TResult Function( _MomoQuote value)?  $default,{required TResult orElse(),}){
final _that = this;
switch (_that) {
case _MomoQuote() when $default != null:
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

@optionalTypeArgs TResult map<TResult extends Object?>(TResult Function( _MomoQuote value)  $default,){
final _that = this;
switch (_that) {
case _MomoQuote():
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

@optionalTypeArgs TResult? mapOrNull<TResult extends Object?>(TResult? Function( _MomoQuote value)?  $default,){
final _that = this;
switch (_that) {
case _MomoQuote() when $default != null:
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

@optionalTypeArgs TResult maybeWhen<TResult extends Object?>(TResult Function( int amount,  int feeAmount,  int totalDebited,  int netReceived,  MomoFeeBearer feeBearer)?  $default,{required TResult orElse(),}) {final _that = this;
switch (_that) {
case _MomoQuote() when $default != null:
return $default(_that.amount,_that.feeAmount,_that.totalDebited,_that.netReceived,_that.feeBearer);case _:
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

@optionalTypeArgs TResult when<TResult extends Object?>(TResult Function( int amount,  int feeAmount,  int totalDebited,  int netReceived,  MomoFeeBearer feeBearer)  $default,) {final _that = this;
switch (_that) {
case _MomoQuote():
return $default(_that.amount,_that.feeAmount,_that.totalDebited,_that.netReceived,_that.feeBearer);case _:
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

@optionalTypeArgs TResult? whenOrNull<TResult extends Object?>(TResult? Function( int amount,  int feeAmount,  int totalDebited,  int netReceived,  MomoFeeBearer feeBearer)?  $default,) {final _that = this;
switch (_that) {
case _MomoQuote() when $default != null:
return $default(_that.amount,_that.feeAmount,_that.totalDebited,_that.netReceived,_that.feeBearer);case _:
  return null;

}
}

}

/// @nodoc
@JsonSerializable()

class _MomoQuote implements MomoQuote {
  const _MomoQuote({required this.amount, required this.feeAmount, required this.totalDebited, required this.netReceived, required this.feeBearer});
  factory _MomoQuote.fromJson(Map<String, dynamic> json) => _$MomoQuoteFromJson(json);

@override final  int amount;
@override final  int feeAmount;
@override final  int totalDebited;
@override final  int netReceived;
@override final  MomoFeeBearer feeBearer;

/// Create a copy of MomoQuote
/// with the given fields replaced by the non-null parameter values.
@override @JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
_$MomoQuoteCopyWith<_MomoQuote> get copyWith => __$MomoQuoteCopyWithImpl<_MomoQuote>(this, _$identity);

@override
Map<String, dynamic> toJson() {
  return _$MomoQuoteToJson(this, );
}

@override
bool operator ==(Object other) {
  return identical(this, other) || (other.runtimeType == runtimeType&&other is _MomoQuote&&(identical(other.amount, amount) || other.amount == amount)&&(identical(other.feeAmount, feeAmount) || other.feeAmount == feeAmount)&&(identical(other.totalDebited, totalDebited) || other.totalDebited == totalDebited)&&(identical(other.netReceived, netReceived) || other.netReceived == netReceived)&&(identical(other.feeBearer, feeBearer) || other.feeBearer == feeBearer));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode => Object.hash(runtimeType,amount,feeAmount,totalDebited,netReceived,feeBearer);

@override
String toString() {
  return 'MomoQuote(amount: $amount, feeAmount: $feeAmount, totalDebited: $totalDebited, netReceived: $netReceived, feeBearer: $feeBearer)';
}


}

/// @nodoc
abstract mixin class _$MomoQuoteCopyWith<$Res> implements $MomoQuoteCopyWith<$Res> {
  factory _$MomoQuoteCopyWith(_MomoQuote value, $Res Function(_MomoQuote) _then) = __$MomoQuoteCopyWithImpl;
@override @useResult
$Res call({
 int amount, int feeAmount, int totalDebited, int netReceived, MomoFeeBearer feeBearer
});




}
/// @nodoc
class __$MomoQuoteCopyWithImpl<$Res>
    implements _$MomoQuoteCopyWith<$Res> {
  __$MomoQuoteCopyWithImpl(this._self, this._then);

  final _MomoQuote _self;
  final $Res Function(_MomoQuote) _then;

/// Create a copy of MomoQuote
/// with the given fields replaced by the non-null parameter values.
@override @pragma('vm:prefer-inline') $Res call({Object? amount = null,Object? feeAmount = null,Object? totalDebited = null,Object? netReceived = null,Object? feeBearer = null,}) {
  return _then(_MomoQuote(
amount: null == amount ? _self.amount : amount // ignore: cast_nullable_to_non_nullable
as int,feeAmount: null == feeAmount ? _self.feeAmount : feeAmount // ignore: cast_nullable_to_non_nullable
as int,totalDebited: null == totalDebited ? _self.totalDebited : totalDebited // ignore: cast_nullable_to_non_nullable
as int,netReceived: null == netReceived ? _self.netReceived : netReceived // ignore: cast_nullable_to_non_nullable
as int,feeBearer: null == feeBearer ? _self.feeBearer : feeBearer // ignore: cast_nullable_to_non_nullable
as MomoFeeBearer,
  ));
}


}

// dart format on
