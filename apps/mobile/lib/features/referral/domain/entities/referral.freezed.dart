// GENERATED CODE - DO NOT MODIFY BY HAND
// coverage:ignore-file
// ignore_for_file: type=lint
// ignore_for_file: unused_element, deprecated_member_use, deprecated_member_use_from_same_package, use_function_type_syntax_for_parameters, unnecessary_const, avoid_init_to_null, invalid_override_different_default_values_named, prefer_expression_function_bodies, annotate_overrides, invalid_annotation_target, unnecessary_question_mark

part of 'referral.dart';

// **************************************************************************
// FreezedGenerator
// **************************************************************************

// dart format off
T _$identity<T>(T value) => value;

/// @nodoc
mixin _$Referral {

 String get id; String get partnerId; String get referredOrganizationId; String? get referredPropertyId; ReferralSource get source; ReferralStatus get status; String? get qualifiedAt; String? get activatedAt; String? get expiresAt; String get createdAt;
/// Create a copy of Referral
/// with the given fields replaced by the non-null parameter values.
@JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
$ReferralCopyWith<Referral> get copyWith => _$ReferralCopyWithImpl<Referral>(this as Referral, _$identity);

  /// Serializes this Referral to a JSON map.
  Map<String, dynamic> toJson();


@override
bool operator ==(Object other) {
  return identical(this, other) || (other.runtimeType == runtimeType&&other is Referral&&(identical(other.id, id) || other.id == id)&&(identical(other.partnerId, partnerId) || other.partnerId == partnerId)&&(identical(other.referredOrganizationId, referredOrganizationId) || other.referredOrganizationId == referredOrganizationId)&&(identical(other.referredPropertyId, referredPropertyId) || other.referredPropertyId == referredPropertyId)&&(identical(other.source, source) || other.source == source)&&(identical(other.status, status) || other.status == status)&&(identical(other.qualifiedAt, qualifiedAt) || other.qualifiedAt == qualifiedAt)&&(identical(other.activatedAt, activatedAt) || other.activatedAt == activatedAt)&&(identical(other.expiresAt, expiresAt) || other.expiresAt == expiresAt)&&(identical(other.createdAt, createdAt) || other.createdAt == createdAt));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode => Object.hash(runtimeType,id,partnerId,referredOrganizationId,referredPropertyId,source,status,qualifiedAt,activatedAt,expiresAt,createdAt);

@override
String toString() {
  return 'Referral(id: $id, partnerId: $partnerId, referredOrganizationId: $referredOrganizationId, referredPropertyId: $referredPropertyId, source: $source, status: $status, qualifiedAt: $qualifiedAt, activatedAt: $activatedAt, expiresAt: $expiresAt, createdAt: $createdAt)';
}


}

/// @nodoc
abstract mixin class $ReferralCopyWith<$Res>  {
  factory $ReferralCopyWith(Referral value, $Res Function(Referral) _then) = _$ReferralCopyWithImpl;
@useResult
$Res call({
 String id, String partnerId, String referredOrganizationId, String? referredPropertyId, ReferralSource source, ReferralStatus status, String? qualifiedAt, String? activatedAt, String? expiresAt, String createdAt
});




}
/// @nodoc
class _$ReferralCopyWithImpl<$Res>
    implements $ReferralCopyWith<$Res> {
  _$ReferralCopyWithImpl(this._self, this._then);

  final Referral _self;
  final $Res Function(Referral) _then;

/// Create a copy of Referral
/// with the given fields replaced by the non-null parameter values.
@pragma('vm:prefer-inline') @override $Res call({Object? id = null,Object? partnerId = null,Object? referredOrganizationId = null,Object? referredPropertyId = freezed,Object? source = null,Object? status = null,Object? qualifiedAt = freezed,Object? activatedAt = freezed,Object? expiresAt = freezed,Object? createdAt = null,}) {
  return _then(_self.copyWith(
id: null == id ? _self.id : id // ignore: cast_nullable_to_non_nullable
as String,partnerId: null == partnerId ? _self.partnerId : partnerId // ignore: cast_nullable_to_non_nullable
as String,referredOrganizationId: null == referredOrganizationId ? _self.referredOrganizationId : referredOrganizationId // ignore: cast_nullable_to_non_nullable
as String,referredPropertyId: freezed == referredPropertyId ? _self.referredPropertyId : referredPropertyId // ignore: cast_nullable_to_non_nullable
as String?,source: null == source ? _self.source : source // ignore: cast_nullable_to_non_nullable
as ReferralSource,status: null == status ? _self.status : status // ignore: cast_nullable_to_non_nullable
as ReferralStatus,qualifiedAt: freezed == qualifiedAt ? _self.qualifiedAt : qualifiedAt // ignore: cast_nullable_to_non_nullable
as String?,activatedAt: freezed == activatedAt ? _self.activatedAt : activatedAt // ignore: cast_nullable_to_non_nullable
as String?,expiresAt: freezed == expiresAt ? _self.expiresAt : expiresAt // ignore: cast_nullable_to_non_nullable
as String?,createdAt: null == createdAt ? _self.createdAt : createdAt // ignore: cast_nullable_to_non_nullable
as String,
  ));
}

}


/// Adds pattern-matching-related methods to [Referral].
extension ReferralPatterns on Referral {
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

@optionalTypeArgs TResult maybeMap<TResult extends Object?>(TResult Function( _Referral value)?  $default,{required TResult orElse(),}){
final _that = this;
switch (_that) {
case _Referral() when $default != null:
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

@optionalTypeArgs TResult map<TResult extends Object?>(TResult Function( _Referral value)  $default,){
final _that = this;
switch (_that) {
case _Referral():
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

@optionalTypeArgs TResult? mapOrNull<TResult extends Object?>(TResult? Function( _Referral value)?  $default,){
final _that = this;
switch (_that) {
case _Referral() when $default != null:
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

@optionalTypeArgs TResult maybeWhen<TResult extends Object?>(TResult Function( String id,  String partnerId,  String referredOrganizationId,  String? referredPropertyId,  ReferralSource source,  ReferralStatus status,  String? qualifiedAt,  String? activatedAt,  String? expiresAt,  String createdAt)?  $default,{required TResult orElse(),}) {final _that = this;
switch (_that) {
case _Referral() when $default != null:
return $default(_that.id,_that.partnerId,_that.referredOrganizationId,_that.referredPropertyId,_that.source,_that.status,_that.qualifiedAt,_that.activatedAt,_that.expiresAt,_that.createdAt);case _:
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

@optionalTypeArgs TResult when<TResult extends Object?>(TResult Function( String id,  String partnerId,  String referredOrganizationId,  String? referredPropertyId,  ReferralSource source,  ReferralStatus status,  String? qualifiedAt,  String? activatedAt,  String? expiresAt,  String createdAt)  $default,) {final _that = this;
switch (_that) {
case _Referral():
return $default(_that.id,_that.partnerId,_that.referredOrganizationId,_that.referredPropertyId,_that.source,_that.status,_that.qualifiedAt,_that.activatedAt,_that.expiresAt,_that.createdAt);case _:
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

@optionalTypeArgs TResult? whenOrNull<TResult extends Object?>(TResult? Function( String id,  String partnerId,  String referredOrganizationId,  String? referredPropertyId,  ReferralSource source,  ReferralStatus status,  String? qualifiedAt,  String? activatedAt,  String? expiresAt,  String createdAt)?  $default,) {final _that = this;
switch (_that) {
case _Referral() when $default != null:
return $default(_that.id,_that.partnerId,_that.referredOrganizationId,_that.referredPropertyId,_that.source,_that.status,_that.qualifiedAt,_that.activatedAt,_that.expiresAt,_that.createdAt);case _:
  return null;

}
}

}

/// @nodoc
@JsonSerializable()

class _Referral implements Referral {
  const _Referral({required this.id, required this.partnerId, required this.referredOrganizationId, this.referredPropertyId, required this.source, required this.status, this.qualifiedAt, this.activatedAt, this.expiresAt, required this.createdAt});
  factory _Referral.fromJson(Map<String, dynamic> json) => _$ReferralFromJson(json);

@override final  String id;
@override final  String partnerId;
@override final  String referredOrganizationId;
@override final  String? referredPropertyId;
@override final  ReferralSource source;
@override final  ReferralStatus status;
@override final  String? qualifiedAt;
@override final  String? activatedAt;
@override final  String? expiresAt;
@override final  String createdAt;

/// Create a copy of Referral
/// with the given fields replaced by the non-null parameter values.
@override @JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
_$ReferralCopyWith<_Referral> get copyWith => __$ReferralCopyWithImpl<_Referral>(this, _$identity);

@override
Map<String, dynamic> toJson() {
  return _$ReferralToJson(this, );
}

@override
bool operator ==(Object other) {
  return identical(this, other) || (other.runtimeType == runtimeType&&other is _Referral&&(identical(other.id, id) || other.id == id)&&(identical(other.partnerId, partnerId) || other.partnerId == partnerId)&&(identical(other.referredOrganizationId, referredOrganizationId) || other.referredOrganizationId == referredOrganizationId)&&(identical(other.referredPropertyId, referredPropertyId) || other.referredPropertyId == referredPropertyId)&&(identical(other.source, source) || other.source == source)&&(identical(other.status, status) || other.status == status)&&(identical(other.qualifiedAt, qualifiedAt) || other.qualifiedAt == qualifiedAt)&&(identical(other.activatedAt, activatedAt) || other.activatedAt == activatedAt)&&(identical(other.expiresAt, expiresAt) || other.expiresAt == expiresAt)&&(identical(other.createdAt, createdAt) || other.createdAt == createdAt));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode => Object.hash(runtimeType,id,partnerId,referredOrganizationId,referredPropertyId,source,status,qualifiedAt,activatedAt,expiresAt,createdAt);

@override
String toString() {
  return 'Referral(id: $id, partnerId: $partnerId, referredOrganizationId: $referredOrganizationId, referredPropertyId: $referredPropertyId, source: $source, status: $status, qualifiedAt: $qualifiedAt, activatedAt: $activatedAt, expiresAt: $expiresAt, createdAt: $createdAt)';
}


}

/// @nodoc
abstract mixin class _$ReferralCopyWith<$Res> implements $ReferralCopyWith<$Res> {
  factory _$ReferralCopyWith(_Referral value, $Res Function(_Referral) _then) = __$ReferralCopyWithImpl;
@override @useResult
$Res call({
 String id, String partnerId, String referredOrganizationId, String? referredPropertyId, ReferralSource source, ReferralStatus status, String? qualifiedAt, String? activatedAt, String? expiresAt, String createdAt
});




}
/// @nodoc
class __$ReferralCopyWithImpl<$Res>
    implements _$ReferralCopyWith<$Res> {
  __$ReferralCopyWithImpl(this._self, this._then);

  final _Referral _self;
  final $Res Function(_Referral) _then;

/// Create a copy of Referral
/// with the given fields replaced by the non-null parameter values.
@override @pragma('vm:prefer-inline') $Res call({Object? id = null,Object? partnerId = null,Object? referredOrganizationId = null,Object? referredPropertyId = freezed,Object? source = null,Object? status = null,Object? qualifiedAt = freezed,Object? activatedAt = freezed,Object? expiresAt = freezed,Object? createdAt = null,}) {
  return _then(_Referral(
id: null == id ? _self.id : id // ignore: cast_nullable_to_non_nullable
as String,partnerId: null == partnerId ? _self.partnerId : partnerId // ignore: cast_nullable_to_non_nullable
as String,referredOrganizationId: null == referredOrganizationId ? _self.referredOrganizationId : referredOrganizationId // ignore: cast_nullable_to_non_nullable
as String,referredPropertyId: freezed == referredPropertyId ? _self.referredPropertyId : referredPropertyId // ignore: cast_nullable_to_non_nullable
as String?,source: null == source ? _self.source : source // ignore: cast_nullable_to_non_nullable
as ReferralSource,status: null == status ? _self.status : status // ignore: cast_nullable_to_non_nullable
as ReferralStatus,qualifiedAt: freezed == qualifiedAt ? _self.qualifiedAt : qualifiedAt // ignore: cast_nullable_to_non_nullable
as String?,activatedAt: freezed == activatedAt ? _self.activatedAt : activatedAt // ignore: cast_nullable_to_non_nullable
as String?,expiresAt: freezed == expiresAt ? _self.expiresAt : expiresAt // ignore: cast_nullable_to_non_nullable
as String?,createdAt: null == createdAt ? _self.createdAt : createdAt // ignore: cast_nullable_to_non_nullable
as String,
  ));
}


}

// dart format on
