// GENERATED CODE - DO NOT MODIFY BY HAND
// coverage:ignore-file
// ignore_for_file: type=lint
// ignore_for_file: unused_element, deprecated_member_use, deprecated_member_use_from_same_package, use_function_type_syntax_for_parameters, unnecessary_const, avoid_init_to_null, invalid_override_different_default_values_named, prefer_expression_function_bodies, annotate_overrides, invalid_annotation_target, unnecessary_question_mark

part of 'transfer_declaration_result.dart';

// **************************************************************************
// FreezedGenerator
// **************************************************************************

// dart format off
T _$identity<T>(T value) => value;

/// @nodoc
mixin _$TransferDeclarationResult {

 String get id; DeclarationStatus get status; String? get paymentId; String? get rejectionReason; String? get clientRef;
/// Create a copy of TransferDeclarationResult
/// with the given fields replaced by the non-null parameter values.
@JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
$TransferDeclarationResultCopyWith<TransferDeclarationResult> get copyWith => _$TransferDeclarationResultCopyWithImpl<TransferDeclarationResult>(this as TransferDeclarationResult, _$identity);

  /// Serializes this TransferDeclarationResult to a JSON map.
  Map<String, dynamic> toJson();


@override
bool operator ==(Object other) {
  return identical(this, other) || (other.runtimeType == runtimeType&&other is TransferDeclarationResult&&(identical(other.id, id) || other.id == id)&&(identical(other.status, status) || other.status == status)&&(identical(other.paymentId, paymentId) || other.paymentId == paymentId)&&(identical(other.rejectionReason, rejectionReason) || other.rejectionReason == rejectionReason)&&(identical(other.clientRef, clientRef) || other.clientRef == clientRef));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode => Object.hash(runtimeType,id,status,paymentId,rejectionReason,clientRef);

@override
String toString() {
  return 'TransferDeclarationResult(id: $id, status: $status, paymentId: $paymentId, rejectionReason: $rejectionReason, clientRef: $clientRef)';
}


}

/// @nodoc
abstract mixin class $TransferDeclarationResultCopyWith<$Res>  {
  factory $TransferDeclarationResultCopyWith(TransferDeclarationResult value, $Res Function(TransferDeclarationResult) _then) = _$TransferDeclarationResultCopyWithImpl;
@useResult
$Res call({
 String id, DeclarationStatus status, String? paymentId, String? rejectionReason, String? clientRef
});




}
/// @nodoc
class _$TransferDeclarationResultCopyWithImpl<$Res>
    implements $TransferDeclarationResultCopyWith<$Res> {
  _$TransferDeclarationResultCopyWithImpl(this._self, this._then);

  final TransferDeclarationResult _self;
  final $Res Function(TransferDeclarationResult) _then;

/// Create a copy of TransferDeclarationResult
/// with the given fields replaced by the non-null parameter values.
@pragma('vm:prefer-inline') @override $Res call({Object? id = null,Object? status = null,Object? paymentId = freezed,Object? rejectionReason = freezed,Object? clientRef = freezed,}) {
  return _then(_self.copyWith(
id: null == id ? _self.id : id // ignore: cast_nullable_to_non_nullable
as String,status: null == status ? _self.status : status // ignore: cast_nullable_to_non_nullable
as DeclarationStatus,paymentId: freezed == paymentId ? _self.paymentId : paymentId // ignore: cast_nullable_to_non_nullable
as String?,rejectionReason: freezed == rejectionReason ? _self.rejectionReason : rejectionReason // ignore: cast_nullable_to_non_nullable
as String?,clientRef: freezed == clientRef ? _self.clientRef : clientRef // ignore: cast_nullable_to_non_nullable
as String?,
  ));
}

}


/// Adds pattern-matching-related methods to [TransferDeclarationResult].
extension TransferDeclarationResultPatterns on TransferDeclarationResult {
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

@optionalTypeArgs TResult maybeMap<TResult extends Object?>(TResult Function( _TransferDeclarationResult value)?  $default,{required TResult orElse(),}){
final _that = this;
switch (_that) {
case _TransferDeclarationResult() when $default != null:
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

@optionalTypeArgs TResult map<TResult extends Object?>(TResult Function( _TransferDeclarationResult value)  $default,){
final _that = this;
switch (_that) {
case _TransferDeclarationResult():
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

@optionalTypeArgs TResult? mapOrNull<TResult extends Object?>(TResult? Function( _TransferDeclarationResult value)?  $default,){
final _that = this;
switch (_that) {
case _TransferDeclarationResult() when $default != null:
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

@optionalTypeArgs TResult maybeWhen<TResult extends Object?>(TResult Function( String id,  DeclarationStatus status,  String? paymentId,  String? rejectionReason,  String? clientRef)?  $default,{required TResult orElse(),}) {final _that = this;
switch (_that) {
case _TransferDeclarationResult() when $default != null:
return $default(_that.id,_that.status,_that.paymentId,_that.rejectionReason,_that.clientRef);case _:
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

@optionalTypeArgs TResult when<TResult extends Object?>(TResult Function( String id,  DeclarationStatus status,  String? paymentId,  String? rejectionReason,  String? clientRef)  $default,) {final _that = this;
switch (_that) {
case _TransferDeclarationResult():
return $default(_that.id,_that.status,_that.paymentId,_that.rejectionReason,_that.clientRef);case _:
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

@optionalTypeArgs TResult? whenOrNull<TResult extends Object?>(TResult? Function( String id,  DeclarationStatus status,  String? paymentId,  String? rejectionReason,  String? clientRef)?  $default,) {final _that = this;
switch (_that) {
case _TransferDeclarationResult() when $default != null:
return $default(_that.id,_that.status,_that.paymentId,_that.rejectionReason,_that.clientRef);case _:
  return null;

}
}

}

/// @nodoc
@JsonSerializable()

class _TransferDeclarationResult implements TransferDeclarationResult {
  const _TransferDeclarationResult({required this.id, required this.status, this.paymentId, this.rejectionReason, this.clientRef});
  factory _TransferDeclarationResult.fromJson(Map<String, dynamic> json) => _$TransferDeclarationResultFromJson(json);

@override final  String id;
@override final  DeclarationStatus status;
@override final  String? paymentId;
@override final  String? rejectionReason;
@override final  String? clientRef;

/// Create a copy of TransferDeclarationResult
/// with the given fields replaced by the non-null parameter values.
@override @JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
_$TransferDeclarationResultCopyWith<_TransferDeclarationResult> get copyWith => __$TransferDeclarationResultCopyWithImpl<_TransferDeclarationResult>(this, _$identity);

@override
Map<String, dynamic> toJson() {
  return _$TransferDeclarationResultToJson(this, );
}

@override
bool operator ==(Object other) {
  return identical(this, other) || (other.runtimeType == runtimeType&&other is _TransferDeclarationResult&&(identical(other.id, id) || other.id == id)&&(identical(other.status, status) || other.status == status)&&(identical(other.paymentId, paymentId) || other.paymentId == paymentId)&&(identical(other.rejectionReason, rejectionReason) || other.rejectionReason == rejectionReason)&&(identical(other.clientRef, clientRef) || other.clientRef == clientRef));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode => Object.hash(runtimeType,id,status,paymentId,rejectionReason,clientRef);

@override
String toString() {
  return 'TransferDeclarationResult(id: $id, status: $status, paymentId: $paymentId, rejectionReason: $rejectionReason, clientRef: $clientRef)';
}


}

/// @nodoc
abstract mixin class _$TransferDeclarationResultCopyWith<$Res> implements $TransferDeclarationResultCopyWith<$Res> {
  factory _$TransferDeclarationResultCopyWith(_TransferDeclarationResult value, $Res Function(_TransferDeclarationResult) _then) = __$TransferDeclarationResultCopyWithImpl;
@override @useResult
$Res call({
 String id, DeclarationStatus status, String? paymentId, String? rejectionReason, String? clientRef
});




}
/// @nodoc
class __$TransferDeclarationResultCopyWithImpl<$Res>
    implements _$TransferDeclarationResultCopyWith<$Res> {
  __$TransferDeclarationResultCopyWithImpl(this._self, this._then);

  final _TransferDeclarationResult _self;
  final $Res Function(_TransferDeclarationResult) _then;

/// Create a copy of TransferDeclarationResult
/// with the given fields replaced by the non-null parameter values.
@override @pragma('vm:prefer-inline') $Res call({Object? id = null,Object? status = null,Object? paymentId = freezed,Object? rejectionReason = freezed,Object? clientRef = freezed,}) {
  return _then(_TransferDeclarationResult(
id: null == id ? _self.id : id // ignore: cast_nullable_to_non_nullable
as String,status: null == status ? _self.status : status // ignore: cast_nullable_to_non_nullable
as DeclarationStatus,paymentId: freezed == paymentId ? _self.paymentId : paymentId // ignore: cast_nullable_to_non_nullable
as String?,rejectionReason: freezed == rejectionReason ? _self.rejectionReason : rejectionReason // ignore: cast_nullable_to_non_nullable
as String?,clientRef: freezed == clientRef ? _self.clientRef : clientRef // ignore: cast_nullable_to_non_nullable
as String?,
  ));
}


}

// dart format on
