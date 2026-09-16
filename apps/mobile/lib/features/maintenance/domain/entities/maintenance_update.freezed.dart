// GENERATED CODE - DO NOT MODIFY BY HAND
// coverage:ignore-file
// ignore_for_file: type=lint
// ignore_for_file: unused_element, deprecated_member_use, deprecated_member_use_from_same_package, use_function_type_syntax_for_parameters, unnecessary_const, avoid_init_to_null, invalid_override_different_default_values_named, prefer_expression_function_bodies, annotate_overrides, invalid_annotation_target, unnecessary_question_mark

part of 'maintenance_update.dart';

// **************************************************************************
// FreezedGenerator
// **************************************************************************

// dart format off
T _$identity<T>(T value) => value;

/// @nodoc
mixin _$MaintenanceUpdate {

 String get id; String get requestId; String? get authorUserId; String? get authorLabel; MaintenanceStatus? get previousStatus; MaintenanceStatus? get newStatus; String? get message; String? get photoDocumentId; int? get amountDelta; bool get isVisibleToTenant; String get occurredAt;
/// Create a copy of MaintenanceUpdate
/// with the given fields replaced by the non-null parameter values.
@JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
$MaintenanceUpdateCopyWith<MaintenanceUpdate> get copyWith => _$MaintenanceUpdateCopyWithImpl<MaintenanceUpdate>(this as MaintenanceUpdate, _$identity);

  /// Serializes this MaintenanceUpdate to a JSON map.
  Map<String, dynamic> toJson();


@override
bool operator ==(Object other) {
  return identical(this, other) || (other.runtimeType == runtimeType&&other is MaintenanceUpdate&&(identical(other.id, id) || other.id == id)&&(identical(other.requestId, requestId) || other.requestId == requestId)&&(identical(other.authorUserId, authorUserId) || other.authorUserId == authorUserId)&&(identical(other.authorLabel, authorLabel) || other.authorLabel == authorLabel)&&(identical(other.previousStatus, previousStatus) || other.previousStatus == previousStatus)&&(identical(other.newStatus, newStatus) || other.newStatus == newStatus)&&(identical(other.message, message) || other.message == message)&&(identical(other.photoDocumentId, photoDocumentId) || other.photoDocumentId == photoDocumentId)&&(identical(other.amountDelta, amountDelta) || other.amountDelta == amountDelta)&&(identical(other.isVisibleToTenant, isVisibleToTenant) || other.isVisibleToTenant == isVisibleToTenant)&&(identical(other.occurredAt, occurredAt) || other.occurredAt == occurredAt));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode => Object.hash(runtimeType,id,requestId,authorUserId,authorLabel,previousStatus,newStatus,message,photoDocumentId,amountDelta,isVisibleToTenant,occurredAt);

@override
String toString() {
  return 'MaintenanceUpdate(id: $id, requestId: $requestId, authorUserId: $authorUserId, authorLabel: $authorLabel, previousStatus: $previousStatus, newStatus: $newStatus, message: $message, photoDocumentId: $photoDocumentId, amountDelta: $amountDelta, isVisibleToTenant: $isVisibleToTenant, occurredAt: $occurredAt)';
}


}

/// @nodoc
abstract mixin class $MaintenanceUpdateCopyWith<$Res>  {
  factory $MaintenanceUpdateCopyWith(MaintenanceUpdate value, $Res Function(MaintenanceUpdate) _then) = _$MaintenanceUpdateCopyWithImpl;
@useResult
$Res call({
 String id, String requestId, String? authorUserId, String? authorLabel, MaintenanceStatus? previousStatus, MaintenanceStatus? newStatus, String? message, String? photoDocumentId, int? amountDelta, bool isVisibleToTenant, String occurredAt
});




}
/// @nodoc
class _$MaintenanceUpdateCopyWithImpl<$Res>
    implements $MaintenanceUpdateCopyWith<$Res> {
  _$MaintenanceUpdateCopyWithImpl(this._self, this._then);

  final MaintenanceUpdate _self;
  final $Res Function(MaintenanceUpdate) _then;

/// Create a copy of MaintenanceUpdate
/// with the given fields replaced by the non-null parameter values.
@pragma('vm:prefer-inline') @override $Res call({Object? id = null,Object? requestId = null,Object? authorUserId = freezed,Object? authorLabel = freezed,Object? previousStatus = freezed,Object? newStatus = freezed,Object? message = freezed,Object? photoDocumentId = freezed,Object? amountDelta = freezed,Object? isVisibleToTenant = null,Object? occurredAt = null,}) {
  return _then(_self.copyWith(
id: null == id ? _self.id : id // ignore: cast_nullable_to_non_nullable
as String,requestId: null == requestId ? _self.requestId : requestId // ignore: cast_nullable_to_non_nullable
as String,authorUserId: freezed == authorUserId ? _self.authorUserId : authorUserId // ignore: cast_nullable_to_non_nullable
as String?,authorLabel: freezed == authorLabel ? _self.authorLabel : authorLabel // ignore: cast_nullable_to_non_nullable
as String?,previousStatus: freezed == previousStatus ? _self.previousStatus : previousStatus // ignore: cast_nullable_to_non_nullable
as MaintenanceStatus?,newStatus: freezed == newStatus ? _self.newStatus : newStatus // ignore: cast_nullable_to_non_nullable
as MaintenanceStatus?,message: freezed == message ? _self.message : message // ignore: cast_nullable_to_non_nullable
as String?,photoDocumentId: freezed == photoDocumentId ? _self.photoDocumentId : photoDocumentId // ignore: cast_nullable_to_non_nullable
as String?,amountDelta: freezed == amountDelta ? _self.amountDelta : amountDelta // ignore: cast_nullable_to_non_nullable
as int?,isVisibleToTenant: null == isVisibleToTenant ? _self.isVisibleToTenant : isVisibleToTenant // ignore: cast_nullable_to_non_nullable
as bool,occurredAt: null == occurredAt ? _self.occurredAt : occurredAt // ignore: cast_nullable_to_non_nullable
as String,
  ));
}

}


/// Adds pattern-matching-related methods to [MaintenanceUpdate].
extension MaintenanceUpdatePatterns on MaintenanceUpdate {
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

@optionalTypeArgs TResult maybeMap<TResult extends Object?>(TResult Function( _MaintenanceUpdate value)?  $default,{required TResult orElse(),}){
final _that = this;
switch (_that) {
case _MaintenanceUpdate() when $default != null:
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

@optionalTypeArgs TResult map<TResult extends Object?>(TResult Function( _MaintenanceUpdate value)  $default,){
final _that = this;
switch (_that) {
case _MaintenanceUpdate():
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

@optionalTypeArgs TResult? mapOrNull<TResult extends Object?>(TResult? Function( _MaintenanceUpdate value)?  $default,){
final _that = this;
switch (_that) {
case _MaintenanceUpdate() when $default != null:
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

@optionalTypeArgs TResult maybeWhen<TResult extends Object?>(TResult Function( String id,  String requestId,  String? authorUserId,  String? authorLabel,  MaintenanceStatus? previousStatus,  MaintenanceStatus? newStatus,  String? message,  String? photoDocumentId,  int? amountDelta,  bool isVisibleToTenant,  String occurredAt)?  $default,{required TResult orElse(),}) {final _that = this;
switch (_that) {
case _MaintenanceUpdate() when $default != null:
return $default(_that.id,_that.requestId,_that.authorUserId,_that.authorLabel,_that.previousStatus,_that.newStatus,_that.message,_that.photoDocumentId,_that.amountDelta,_that.isVisibleToTenant,_that.occurredAt);case _:
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

@optionalTypeArgs TResult when<TResult extends Object?>(TResult Function( String id,  String requestId,  String? authorUserId,  String? authorLabel,  MaintenanceStatus? previousStatus,  MaintenanceStatus? newStatus,  String? message,  String? photoDocumentId,  int? amountDelta,  bool isVisibleToTenant,  String occurredAt)  $default,) {final _that = this;
switch (_that) {
case _MaintenanceUpdate():
return $default(_that.id,_that.requestId,_that.authorUserId,_that.authorLabel,_that.previousStatus,_that.newStatus,_that.message,_that.photoDocumentId,_that.amountDelta,_that.isVisibleToTenant,_that.occurredAt);case _:
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

@optionalTypeArgs TResult? whenOrNull<TResult extends Object?>(TResult? Function( String id,  String requestId,  String? authorUserId,  String? authorLabel,  MaintenanceStatus? previousStatus,  MaintenanceStatus? newStatus,  String? message,  String? photoDocumentId,  int? amountDelta,  bool isVisibleToTenant,  String occurredAt)?  $default,) {final _that = this;
switch (_that) {
case _MaintenanceUpdate() when $default != null:
return $default(_that.id,_that.requestId,_that.authorUserId,_that.authorLabel,_that.previousStatus,_that.newStatus,_that.message,_that.photoDocumentId,_that.amountDelta,_that.isVisibleToTenant,_that.occurredAt);case _:
  return null;

}
}

}

/// @nodoc
@JsonSerializable()

class _MaintenanceUpdate implements MaintenanceUpdate {
  const _MaintenanceUpdate({required this.id, required this.requestId, this.authorUserId, this.authorLabel, this.previousStatus, this.newStatus, this.message, this.photoDocumentId, this.amountDelta, this.isVisibleToTenant = true, required this.occurredAt});
  factory _MaintenanceUpdate.fromJson(Map<String, dynamic> json) => _$MaintenanceUpdateFromJson(json);

@override final  String id;
@override final  String requestId;
@override final  String? authorUserId;
@override final  String? authorLabel;
@override final  MaintenanceStatus? previousStatus;
@override final  MaintenanceStatus? newStatus;
@override final  String? message;
@override final  String? photoDocumentId;
@override final  int? amountDelta;
@override@JsonKey() final  bool isVisibleToTenant;
@override final  String occurredAt;

/// Create a copy of MaintenanceUpdate
/// with the given fields replaced by the non-null parameter values.
@override @JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
_$MaintenanceUpdateCopyWith<_MaintenanceUpdate> get copyWith => __$MaintenanceUpdateCopyWithImpl<_MaintenanceUpdate>(this, _$identity);

@override
Map<String, dynamic> toJson() {
  return _$MaintenanceUpdateToJson(this, );
}

@override
bool operator ==(Object other) {
  return identical(this, other) || (other.runtimeType == runtimeType&&other is _MaintenanceUpdate&&(identical(other.id, id) || other.id == id)&&(identical(other.requestId, requestId) || other.requestId == requestId)&&(identical(other.authorUserId, authorUserId) || other.authorUserId == authorUserId)&&(identical(other.authorLabel, authorLabel) || other.authorLabel == authorLabel)&&(identical(other.previousStatus, previousStatus) || other.previousStatus == previousStatus)&&(identical(other.newStatus, newStatus) || other.newStatus == newStatus)&&(identical(other.message, message) || other.message == message)&&(identical(other.photoDocumentId, photoDocumentId) || other.photoDocumentId == photoDocumentId)&&(identical(other.amountDelta, amountDelta) || other.amountDelta == amountDelta)&&(identical(other.isVisibleToTenant, isVisibleToTenant) || other.isVisibleToTenant == isVisibleToTenant)&&(identical(other.occurredAt, occurredAt) || other.occurredAt == occurredAt));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode => Object.hash(runtimeType,id,requestId,authorUserId,authorLabel,previousStatus,newStatus,message,photoDocumentId,amountDelta,isVisibleToTenant,occurredAt);

@override
String toString() {
  return 'MaintenanceUpdate(id: $id, requestId: $requestId, authorUserId: $authorUserId, authorLabel: $authorLabel, previousStatus: $previousStatus, newStatus: $newStatus, message: $message, photoDocumentId: $photoDocumentId, amountDelta: $amountDelta, isVisibleToTenant: $isVisibleToTenant, occurredAt: $occurredAt)';
}


}

/// @nodoc
abstract mixin class _$MaintenanceUpdateCopyWith<$Res> implements $MaintenanceUpdateCopyWith<$Res> {
  factory _$MaintenanceUpdateCopyWith(_MaintenanceUpdate value, $Res Function(_MaintenanceUpdate) _then) = __$MaintenanceUpdateCopyWithImpl;
@override @useResult
$Res call({
 String id, String requestId, String? authorUserId, String? authorLabel, MaintenanceStatus? previousStatus, MaintenanceStatus? newStatus, String? message, String? photoDocumentId, int? amountDelta, bool isVisibleToTenant, String occurredAt
});




}
/// @nodoc
class __$MaintenanceUpdateCopyWithImpl<$Res>
    implements _$MaintenanceUpdateCopyWith<$Res> {
  __$MaintenanceUpdateCopyWithImpl(this._self, this._then);

  final _MaintenanceUpdate _self;
  final $Res Function(_MaintenanceUpdate) _then;

/// Create a copy of MaintenanceUpdate
/// with the given fields replaced by the non-null parameter values.
@override @pragma('vm:prefer-inline') $Res call({Object? id = null,Object? requestId = null,Object? authorUserId = freezed,Object? authorLabel = freezed,Object? previousStatus = freezed,Object? newStatus = freezed,Object? message = freezed,Object? photoDocumentId = freezed,Object? amountDelta = freezed,Object? isVisibleToTenant = null,Object? occurredAt = null,}) {
  return _then(_MaintenanceUpdate(
id: null == id ? _self.id : id // ignore: cast_nullable_to_non_nullable
as String,requestId: null == requestId ? _self.requestId : requestId // ignore: cast_nullable_to_non_nullable
as String,authorUserId: freezed == authorUserId ? _self.authorUserId : authorUserId // ignore: cast_nullable_to_non_nullable
as String?,authorLabel: freezed == authorLabel ? _self.authorLabel : authorLabel // ignore: cast_nullable_to_non_nullable
as String?,previousStatus: freezed == previousStatus ? _self.previousStatus : previousStatus // ignore: cast_nullable_to_non_nullable
as MaintenanceStatus?,newStatus: freezed == newStatus ? _self.newStatus : newStatus // ignore: cast_nullable_to_non_nullable
as MaintenanceStatus?,message: freezed == message ? _self.message : message // ignore: cast_nullable_to_non_nullable
as String?,photoDocumentId: freezed == photoDocumentId ? _self.photoDocumentId : photoDocumentId // ignore: cast_nullable_to_non_nullable
as String?,amountDelta: freezed == amountDelta ? _self.amountDelta : amountDelta // ignore: cast_nullable_to_non_nullable
as int?,isVisibleToTenant: null == isVisibleToTenant ? _self.isVisibleToTenant : isVisibleToTenant // ignore: cast_nullable_to_non_nullable
as bool,occurredAt: null == occurredAt ? _self.occurredAt : occurredAt // ignore: cast_nullable_to_non_nullable
as String,
  ));
}


}

// dart format on
