// GENERATED CODE - DO NOT MODIFY BY HAND
// coverage:ignore-file
// ignore_for_file: type=lint
// ignore_for_file: unused_element, deprecated_member_use, deprecated_member_use_from_same_package, use_function_type_syntax_for_parameters, unnecessary_const, avoid_init_to_null, invalid_override_different_default_values_named, prefer_expression_function_bodies, annotate_overrides, invalid_annotation_target, unnecessary_question_mark

part of 'organization_membership.dart';

// **************************************************************************
// FreezedGenerator
// **************************************************************************

// dart format off
T _$identity<T>(T value) => value;

/// @nodoc
mixin _$OrganizationMembership {

 Organization get organization; Role get role; DateTime get joinedAt;
/// Create a copy of OrganizationMembership
/// with the given fields replaced by the non-null parameter values.
@JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
$OrganizationMembershipCopyWith<OrganizationMembership> get copyWith => _$OrganizationMembershipCopyWithImpl<OrganizationMembership>(this as OrganizationMembership, _$identity);

  /// Serializes this OrganizationMembership to a JSON map.
  Map<String, dynamic> toJson();


@override
bool operator ==(Object other) {
  return identical(this, other) || (other.runtimeType == runtimeType&&other is OrganizationMembership&&(identical(other.organization, organization) || other.organization == organization)&&(identical(other.role, role) || other.role == role)&&(identical(other.joinedAt, joinedAt) || other.joinedAt == joinedAt));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode => Object.hash(runtimeType,organization,role,joinedAt);

@override
String toString() {
  return 'OrganizationMembership(organization: $organization, role: $role, joinedAt: $joinedAt)';
}


}

/// @nodoc
abstract mixin class $OrganizationMembershipCopyWith<$Res>  {
  factory $OrganizationMembershipCopyWith(OrganizationMembership value, $Res Function(OrganizationMembership) _then) = _$OrganizationMembershipCopyWithImpl;
@useResult
$Res call({
 Organization organization, Role role, DateTime joinedAt
});


$OrganizationCopyWith<$Res> get organization;

}
/// @nodoc
class _$OrganizationMembershipCopyWithImpl<$Res>
    implements $OrganizationMembershipCopyWith<$Res> {
  _$OrganizationMembershipCopyWithImpl(this._self, this._then);

  final OrganizationMembership _self;
  final $Res Function(OrganizationMembership) _then;

/// Create a copy of OrganizationMembership
/// with the given fields replaced by the non-null parameter values.
@pragma('vm:prefer-inline') @override $Res call({Object? organization = null,Object? role = null,Object? joinedAt = null,}) {
  return _then(_self.copyWith(
organization: null == organization ? _self.organization : organization // ignore: cast_nullable_to_non_nullable
as Organization,role: null == role ? _self.role : role // ignore: cast_nullable_to_non_nullable
as Role,joinedAt: null == joinedAt ? _self.joinedAt : joinedAt // ignore: cast_nullable_to_non_nullable
as DateTime,
  ));
}
/// Create a copy of OrganizationMembership
/// with the given fields replaced by the non-null parameter values.
@override
@pragma('vm:prefer-inline')
$OrganizationCopyWith<$Res> get organization {
  
  return $OrganizationCopyWith<$Res>(_self.organization, (value) {
    return _then(_self.copyWith(organization: value));
  });
}
}


/// Adds pattern-matching-related methods to [OrganizationMembership].
extension OrganizationMembershipPatterns on OrganizationMembership {
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

@optionalTypeArgs TResult maybeMap<TResult extends Object?>(TResult Function( _OrganizationMembership value)?  $default,{required TResult orElse(),}){
final _that = this;
switch (_that) {
case _OrganizationMembership() when $default != null:
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

@optionalTypeArgs TResult map<TResult extends Object?>(TResult Function( _OrganizationMembership value)  $default,){
final _that = this;
switch (_that) {
case _OrganizationMembership():
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

@optionalTypeArgs TResult? mapOrNull<TResult extends Object?>(TResult? Function( _OrganizationMembership value)?  $default,){
final _that = this;
switch (_that) {
case _OrganizationMembership() when $default != null:
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

@optionalTypeArgs TResult maybeWhen<TResult extends Object?>(TResult Function( Organization organization,  Role role,  DateTime joinedAt)?  $default,{required TResult orElse(),}) {final _that = this;
switch (_that) {
case _OrganizationMembership() when $default != null:
return $default(_that.organization,_that.role,_that.joinedAt);case _:
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

@optionalTypeArgs TResult when<TResult extends Object?>(TResult Function( Organization organization,  Role role,  DateTime joinedAt)  $default,) {final _that = this;
switch (_that) {
case _OrganizationMembership():
return $default(_that.organization,_that.role,_that.joinedAt);case _:
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

@optionalTypeArgs TResult? whenOrNull<TResult extends Object?>(TResult? Function( Organization organization,  Role role,  DateTime joinedAt)?  $default,) {final _that = this;
switch (_that) {
case _OrganizationMembership() when $default != null:
return $default(_that.organization,_that.role,_that.joinedAt);case _:
  return null;

}
}

}

/// @nodoc
@JsonSerializable()

class _OrganizationMembership implements OrganizationMembership {
  const _OrganizationMembership({required this.organization, required this.role, required this.joinedAt});
  factory _OrganizationMembership.fromJson(Map<String, dynamic> json) => _$OrganizationMembershipFromJson(json);

@override final  Organization organization;
@override final  Role role;
@override final  DateTime joinedAt;

/// Create a copy of OrganizationMembership
/// with the given fields replaced by the non-null parameter values.
@override @JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
_$OrganizationMembershipCopyWith<_OrganizationMembership> get copyWith => __$OrganizationMembershipCopyWithImpl<_OrganizationMembership>(this, _$identity);

@override
Map<String, dynamic> toJson() {
  return _$OrganizationMembershipToJson(this, );
}

@override
bool operator ==(Object other) {
  return identical(this, other) || (other.runtimeType == runtimeType&&other is _OrganizationMembership&&(identical(other.organization, organization) || other.organization == organization)&&(identical(other.role, role) || other.role == role)&&(identical(other.joinedAt, joinedAt) || other.joinedAt == joinedAt));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode => Object.hash(runtimeType,organization,role,joinedAt);

@override
String toString() {
  return 'OrganizationMembership(organization: $organization, role: $role, joinedAt: $joinedAt)';
}


}

/// @nodoc
abstract mixin class _$OrganizationMembershipCopyWith<$Res> implements $OrganizationMembershipCopyWith<$Res> {
  factory _$OrganizationMembershipCopyWith(_OrganizationMembership value, $Res Function(_OrganizationMembership) _then) = __$OrganizationMembershipCopyWithImpl;
@override @useResult
$Res call({
 Organization organization, Role role, DateTime joinedAt
});


@override $OrganizationCopyWith<$Res> get organization;

}
/// @nodoc
class __$OrganizationMembershipCopyWithImpl<$Res>
    implements _$OrganizationMembershipCopyWith<$Res> {
  __$OrganizationMembershipCopyWithImpl(this._self, this._then);

  final _OrganizationMembership _self;
  final $Res Function(_OrganizationMembership) _then;

/// Create a copy of OrganizationMembership
/// with the given fields replaced by the non-null parameter values.
@override @pragma('vm:prefer-inline') $Res call({Object? organization = null,Object? role = null,Object? joinedAt = null,}) {
  return _then(_OrganizationMembership(
organization: null == organization ? _self.organization : organization // ignore: cast_nullable_to_non_nullable
as Organization,role: null == role ? _self.role : role // ignore: cast_nullable_to_non_nullable
as Role,joinedAt: null == joinedAt ? _self.joinedAt : joinedAt // ignore: cast_nullable_to_non_nullable
as DateTime,
  ));
}

/// Create a copy of OrganizationMembership
/// with the given fields replaced by the non-null parameter values.
@override
@pragma('vm:prefer-inline')
$OrganizationCopyWith<$Res> get organization {
  
  return $OrganizationCopyWith<$Res>(_self.organization, (value) {
    return _then(_self.copyWith(organization: value));
  });
}
}

// dart format on
