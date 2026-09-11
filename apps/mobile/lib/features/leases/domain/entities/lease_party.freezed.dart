// GENERATED CODE - DO NOT MODIFY BY HAND
// coverage:ignore-file
// ignore_for_file: type=lint
// ignore_for_file: unused_element, deprecated_member_use, deprecated_member_use_from_same_package, use_function_type_syntax_for_parameters, unnecessary_const, avoid_init_to_null, invalid_override_different_default_values_named, prefer_expression_function_bodies, annotate_overrides, invalid_annotation_target, unnecessary_question_mark

part of 'lease_party.dart';

// **************************************************************************
// FreezedGenerator
// **************************************************************************

// dart format off
T _$identity<T>(T value) => value;

/// @nodoc
mixin _$LeaseParty {

 String get id; String get leaseId; LeasePartyRole get role; String get displayName; String? get tenantId; String? get guarantorId; int get shareBps; bool get isSolidary; String? get signedAt;
/// Create a copy of LeaseParty
/// with the given fields replaced by the non-null parameter values.
@JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
$LeasePartyCopyWith<LeaseParty> get copyWith => _$LeasePartyCopyWithImpl<LeaseParty>(this as LeaseParty, _$identity);

  /// Serializes this LeaseParty to a JSON map.
  Map<String, dynamic> toJson();


@override
bool operator ==(Object other) {
  return identical(this, other) || (other.runtimeType == runtimeType&&other is LeaseParty&&(identical(other.id, id) || other.id == id)&&(identical(other.leaseId, leaseId) || other.leaseId == leaseId)&&(identical(other.role, role) || other.role == role)&&(identical(other.displayName, displayName) || other.displayName == displayName)&&(identical(other.tenantId, tenantId) || other.tenantId == tenantId)&&(identical(other.guarantorId, guarantorId) || other.guarantorId == guarantorId)&&(identical(other.shareBps, shareBps) || other.shareBps == shareBps)&&(identical(other.isSolidary, isSolidary) || other.isSolidary == isSolidary)&&(identical(other.signedAt, signedAt) || other.signedAt == signedAt));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode => Object.hash(runtimeType,id,leaseId,role,displayName,tenantId,guarantorId,shareBps,isSolidary,signedAt);

@override
String toString() {
  return 'LeaseParty(id: $id, leaseId: $leaseId, role: $role, displayName: $displayName, tenantId: $tenantId, guarantorId: $guarantorId, shareBps: $shareBps, isSolidary: $isSolidary, signedAt: $signedAt)';
}


}

/// @nodoc
abstract mixin class $LeasePartyCopyWith<$Res>  {
  factory $LeasePartyCopyWith(LeaseParty value, $Res Function(LeaseParty) _then) = _$LeasePartyCopyWithImpl;
@useResult
$Res call({
 String id, String leaseId, LeasePartyRole role, String displayName, String? tenantId, String? guarantorId, int shareBps, bool isSolidary, String? signedAt
});




}
/// @nodoc
class _$LeasePartyCopyWithImpl<$Res>
    implements $LeasePartyCopyWith<$Res> {
  _$LeasePartyCopyWithImpl(this._self, this._then);

  final LeaseParty _self;
  final $Res Function(LeaseParty) _then;

/// Create a copy of LeaseParty
/// with the given fields replaced by the non-null parameter values.
@pragma('vm:prefer-inline') @override $Res call({Object? id = null,Object? leaseId = null,Object? role = null,Object? displayName = null,Object? tenantId = freezed,Object? guarantorId = freezed,Object? shareBps = null,Object? isSolidary = null,Object? signedAt = freezed,}) {
  return _then(_self.copyWith(
id: null == id ? _self.id : id // ignore: cast_nullable_to_non_nullable
as String,leaseId: null == leaseId ? _self.leaseId : leaseId // ignore: cast_nullable_to_non_nullable
as String,role: null == role ? _self.role : role // ignore: cast_nullable_to_non_nullable
as LeasePartyRole,displayName: null == displayName ? _self.displayName : displayName // ignore: cast_nullable_to_non_nullable
as String,tenantId: freezed == tenantId ? _self.tenantId : tenantId // ignore: cast_nullable_to_non_nullable
as String?,guarantorId: freezed == guarantorId ? _self.guarantorId : guarantorId // ignore: cast_nullable_to_non_nullable
as String?,shareBps: null == shareBps ? _self.shareBps : shareBps // ignore: cast_nullable_to_non_nullable
as int,isSolidary: null == isSolidary ? _self.isSolidary : isSolidary // ignore: cast_nullable_to_non_nullable
as bool,signedAt: freezed == signedAt ? _self.signedAt : signedAt // ignore: cast_nullable_to_non_nullable
as String?,
  ));
}

}


/// Adds pattern-matching-related methods to [LeaseParty].
extension LeasePartyPatterns on LeaseParty {
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

@optionalTypeArgs TResult maybeMap<TResult extends Object?>(TResult Function( _LeaseParty value)?  $default,{required TResult orElse(),}){
final _that = this;
switch (_that) {
case _LeaseParty() when $default != null:
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

@optionalTypeArgs TResult map<TResult extends Object?>(TResult Function( _LeaseParty value)  $default,){
final _that = this;
switch (_that) {
case _LeaseParty():
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

@optionalTypeArgs TResult? mapOrNull<TResult extends Object?>(TResult? Function( _LeaseParty value)?  $default,){
final _that = this;
switch (_that) {
case _LeaseParty() when $default != null:
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

@optionalTypeArgs TResult maybeWhen<TResult extends Object?>(TResult Function( String id,  String leaseId,  LeasePartyRole role,  String displayName,  String? tenantId,  String? guarantorId,  int shareBps,  bool isSolidary,  String? signedAt)?  $default,{required TResult orElse(),}) {final _that = this;
switch (_that) {
case _LeaseParty() when $default != null:
return $default(_that.id,_that.leaseId,_that.role,_that.displayName,_that.tenantId,_that.guarantorId,_that.shareBps,_that.isSolidary,_that.signedAt);case _:
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

@optionalTypeArgs TResult when<TResult extends Object?>(TResult Function( String id,  String leaseId,  LeasePartyRole role,  String displayName,  String? tenantId,  String? guarantorId,  int shareBps,  bool isSolidary,  String? signedAt)  $default,) {final _that = this;
switch (_that) {
case _LeaseParty():
return $default(_that.id,_that.leaseId,_that.role,_that.displayName,_that.tenantId,_that.guarantorId,_that.shareBps,_that.isSolidary,_that.signedAt);case _:
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

@optionalTypeArgs TResult? whenOrNull<TResult extends Object?>(TResult? Function( String id,  String leaseId,  LeasePartyRole role,  String displayName,  String? tenantId,  String? guarantorId,  int shareBps,  bool isSolidary,  String? signedAt)?  $default,) {final _that = this;
switch (_that) {
case _LeaseParty() when $default != null:
return $default(_that.id,_that.leaseId,_that.role,_that.displayName,_that.tenantId,_that.guarantorId,_that.shareBps,_that.isSolidary,_that.signedAt);case _:
  return null;

}
}

}

/// @nodoc
@JsonSerializable()

class _LeaseParty implements LeaseParty {
  const _LeaseParty({required this.id, required this.leaseId, required this.role, required this.displayName, this.tenantId, this.guarantorId, this.shareBps = 10000, this.isSolidary = true, this.signedAt});
  factory _LeaseParty.fromJson(Map<String, dynamic> json) => _$LeasePartyFromJson(json);

@override final  String id;
@override final  String leaseId;
@override final  LeasePartyRole role;
@override final  String displayName;
@override final  String? tenantId;
@override final  String? guarantorId;
@override@JsonKey() final  int shareBps;
@override@JsonKey() final  bool isSolidary;
@override final  String? signedAt;

/// Create a copy of LeaseParty
/// with the given fields replaced by the non-null parameter values.
@override @JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
_$LeasePartyCopyWith<_LeaseParty> get copyWith => __$LeasePartyCopyWithImpl<_LeaseParty>(this, _$identity);

@override
Map<String, dynamic> toJson() {
  return _$LeasePartyToJson(this, );
}

@override
bool operator ==(Object other) {
  return identical(this, other) || (other.runtimeType == runtimeType&&other is _LeaseParty&&(identical(other.id, id) || other.id == id)&&(identical(other.leaseId, leaseId) || other.leaseId == leaseId)&&(identical(other.role, role) || other.role == role)&&(identical(other.displayName, displayName) || other.displayName == displayName)&&(identical(other.tenantId, tenantId) || other.tenantId == tenantId)&&(identical(other.guarantorId, guarantorId) || other.guarantorId == guarantorId)&&(identical(other.shareBps, shareBps) || other.shareBps == shareBps)&&(identical(other.isSolidary, isSolidary) || other.isSolidary == isSolidary)&&(identical(other.signedAt, signedAt) || other.signedAt == signedAt));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode => Object.hash(runtimeType,id,leaseId,role,displayName,tenantId,guarantorId,shareBps,isSolidary,signedAt);

@override
String toString() {
  return 'LeaseParty(id: $id, leaseId: $leaseId, role: $role, displayName: $displayName, tenantId: $tenantId, guarantorId: $guarantorId, shareBps: $shareBps, isSolidary: $isSolidary, signedAt: $signedAt)';
}


}

/// @nodoc
abstract mixin class _$LeasePartyCopyWith<$Res> implements $LeasePartyCopyWith<$Res> {
  factory _$LeasePartyCopyWith(_LeaseParty value, $Res Function(_LeaseParty) _then) = __$LeasePartyCopyWithImpl;
@override @useResult
$Res call({
 String id, String leaseId, LeasePartyRole role, String displayName, String? tenantId, String? guarantorId, int shareBps, bool isSolidary, String? signedAt
});




}
/// @nodoc
class __$LeasePartyCopyWithImpl<$Res>
    implements _$LeasePartyCopyWith<$Res> {
  __$LeasePartyCopyWithImpl(this._self, this._then);

  final _LeaseParty _self;
  final $Res Function(_LeaseParty) _then;

/// Create a copy of LeaseParty
/// with the given fields replaced by the non-null parameter values.
@override @pragma('vm:prefer-inline') $Res call({Object? id = null,Object? leaseId = null,Object? role = null,Object? displayName = null,Object? tenantId = freezed,Object? guarantorId = freezed,Object? shareBps = null,Object? isSolidary = null,Object? signedAt = freezed,}) {
  return _then(_LeaseParty(
id: null == id ? _self.id : id // ignore: cast_nullable_to_non_nullable
as String,leaseId: null == leaseId ? _self.leaseId : leaseId // ignore: cast_nullable_to_non_nullable
as String,role: null == role ? _self.role : role // ignore: cast_nullable_to_non_nullable
as LeasePartyRole,displayName: null == displayName ? _self.displayName : displayName // ignore: cast_nullable_to_non_nullable
as String,tenantId: freezed == tenantId ? _self.tenantId : tenantId // ignore: cast_nullable_to_non_nullable
as String?,guarantorId: freezed == guarantorId ? _self.guarantorId : guarantorId // ignore: cast_nullable_to_non_nullable
as String?,shareBps: null == shareBps ? _self.shareBps : shareBps // ignore: cast_nullable_to_non_nullable
as int,isSolidary: null == isSolidary ? _self.isSolidary : isSolidary // ignore: cast_nullable_to_non_nullable
as bool,signedAt: freezed == signedAt ? _self.signedAt : signedAt // ignore: cast_nullable_to_non_nullable
as String?,
  ));
}


}

// dart format on
