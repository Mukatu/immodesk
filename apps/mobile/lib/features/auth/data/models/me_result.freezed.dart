// GENERATED CODE - DO NOT MODIFY BY HAND
// coverage:ignore-file
// ignore_for_file: type=lint
// ignore_for_file: unused_element, deprecated_member_use, deprecated_member_use_from_same_package, use_function_type_syntax_for_parameters, unnecessary_const, avoid_init_to_null, invalid_override_different_default_values_named, prefer_expression_function_bodies, annotate_overrides, invalid_annotation_target, unnecessary_question_mark

part of 'me_result.dart';

// **************************************************************************
// FreezedGenerator
// **************************************************************************

// dart format off
T _$identity<T>(T value) => value;

/// @nodoc
mixin _$MeResult {

 AppUser get user; List<OrganizationMembership> get organizations;
/// Create a copy of MeResult
/// with the given fields replaced by the non-null parameter values.
@JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
$MeResultCopyWith<MeResult> get copyWith => _$MeResultCopyWithImpl<MeResult>(this as MeResult, _$identity);

  /// Serializes this MeResult to a JSON map.
  Map<String, dynamic> toJson();


@override
bool operator ==(Object other) {
  return identical(this, other) || (other.runtimeType == runtimeType&&other is MeResult&&(identical(other.user, user) || other.user == user)&&const DeepCollectionEquality().equals(other.organizations, organizations));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode => Object.hash(runtimeType,user,const DeepCollectionEquality().hash(organizations));

@override
String toString() {
  return 'MeResult(user: $user, organizations: $organizations)';
}


}

/// @nodoc
abstract mixin class $MeResultCopyWith<$Res>  {
  factory $MeResultCopyWith(MeResult value, $Res Function(MeResult) _then) = _$MeResultCopyWithImpl;
@useResult
$Res call({
 AppUser user, List<OrganizationMembership> organizations
});


$AppUserCopyWith<$Res> get user;

}
/// @nodoc
class _$MeResultCopyWithImpl<$Res>
    implements $MeResultCopyWith<$Res> {
  _$MeResultCopyWithImpl(this._self, this._then);

  final MeResult _self;
  final $Res Function(MeResult) _then;

/// Create a copy of MeResult
/// with the given fields replaced by the non-null parameter values.
@pragma('vm:prefer-inline') @override $Res call({Object? user = null,Object? organizations = null,}) {
  return _then(_self.copyWith(
user: null == user ? _self.user : user // ignore: cast_nullable_to_non_nullable
as AppUser,organizations: null == organizations ? _self.organizations : organizations // ignore: cast_nullable_to_non_nullable
as List<OrganizationMembership>,
  ));
}
/// Create a copy of MeResult
/// with the given fields replaced by the non-null parameter values.
@override
@pragma('vm:prefer-inline')
$AppUserCopyWith<$Res> get user {
  
  return $AppUserCopyWith<$Res>(_self.user, (value) {
    return _then(_self.copyWith(user: value));
  });
}
}


/// Adds pattern-matching-related methods to [MeResult].
extension MeResultPatterns on MeResult {
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

@optionalTypeArgs TResult maybeMap<TResult extends Object?>(TResult Function( _MeResult value)?  $default,{required TResult orElse(),}){
final _that = this;
switch (_that) {
case _MeResult() when $default != null:
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

@optionalTypeArgs TResult map<TResult extends Object?>(TResult Function( _MeResult value)  $default,){
final _that = this;
switch (_that) {
case _MeResult():
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

@optionalTypeArgs TResult? mapOrNull<TResult extends Object?>(TResult? Function( _MeResult value)?  $default,){
final _that = this;
switch (_that) {
case _MeResult() when $default != null:
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

@optionalTypeArgs TResult maybeWhen<TResult extends Object?>(TResult Function( AppUser user,  List<OrganizationMembership> organizations)?  $default,{required TResult orElse(),}) {final _that = this;
switch (_that) {
case _MeResult() when $default != null:
return $default(_that.user,_that.organizations);case _:
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

@optionalTypeArgs TResult when<TResult extends Object?>(TResult Function( AppUser user,  List<OrganizationMembership> organizations)  $default,) {final _that = this;
switch (_that) {
case _MeResult():
return $default(_that.user,_that.organizations);case _:
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

@optionalTypeArgs TResult? whenOrNull<TResult extends Object?>(TResult? Function( AppUser user,  List<OrganizationMembership> organizations)?  $default,) {final _that = this;
switch (_that) {
case _MeResult() when $default != null:
return $default(_that.user,_that.organizations);case _:
  return null;

}
}

}

/// @nodoc
@JsonSerializable()

class _MeResult implements MeResult {
  const _MeResult({required this.user, required final  List<OrganizationMembership> organizations}): _organizations = organizations;
  factory _MeResult.fromJson(Map<String, dynamic> json) => _$MeResultFromJson(json);

@override final  AppUser user;
 final  List<OrganizationMembership> _organizations;
@override List<OrganizationMembership> get organizations {
  if (_organizations is EqualUnmodifiableListView) return _organizations;
  // ignore: implicit_dynamic_type
  return EqualUnmodifiableListView(_organizations);
}


/// Create a copy of MeResult
/// with the given fields replaced by the non-null parameter values.
@override @JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
_$MeResultCopyWith<_MeResult> get copyWith => __$MeResultCopyWithImpl<_MeResult>(this, _$identity);

@override
Map<String, dynamic> toJson() {
  return _$MeResultToJson(this, );
}

@override
bool operator ==(Object other) {
  return identical(this, other) || (other.runtimeType == runtimeType&&other is _MeResult&&(identical(other.user, user) || other.user == user)&&const DeepCollectionEquality().equals(other._organizations, _organizations));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode => Object.hash(runtimeType,user,const DeepCollectionEquality().hash(_organizations));

@override
String toString() {
  return 'MeResult(user: $user, organizations: $organizations)';
}


}

/// @nodoc
abstract mixin class _$MeResultCopyWith<$Res> implements $MeResultCopyWith<$Res> {
  factory _$MeResultCopyWith(_MeResult value, $Res Function(_MeResult) _then) = __$MeResultCopyWithImpl;
@override @useResult
$Res call({
 AppUser user, List<OrganizationMembership> organizations
});


@override $AppUserCopyWith<$Res> get user;

}
/// @nodoc
class __$MeResultCopyWithImpl<$Res>
    implements _$MeResultCopyWith<$Res> {
  __$MeResultCopyWithImpl(this._self, this._then);

  final _MeResult _self;
  final $Res Function(_MeResult) _then;

/// Create a copy of MeResult
/// with the given fields replaced by the non-null parameter values.
@override @pragma('vm:prefer-inline') $Res call({Object? user = null,Object? organizations = null,}) {
  return _then(_MeResult(
user: null == user ? _self.user : user // ignore: cast_nullable_to_non_nullable
as AppUser,organizations: null == organizations ? _self._organizations : organizations // ignore: cast_nullable_to_non_nullable
as List<OrganizationMembership>,
  ));
}

/// Create a copy of MeResult
/// with the given fields replaced by the non-null parameter values.
@override
@pragma('vm:prefer-inline')
$AppUserCopyWith<$Res> get user {
  
  return $AppUserCopyWith<$Res>(_self.user, (value) {
    return _then(_self.copyWith(user: value));
  });
}
}

// dart format on
