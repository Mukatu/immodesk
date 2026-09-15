// GENERATED CODE - DO NOT MODIFY BY HAND
// coverage:ignore-file
// ignore_for_file: type=lint
// ignore_for_file: unused_element, deprecated_member_use, deprecated_member_use_from_same_package, use_function_type_syntax_for_parameters, unnecessary_const, avoid_init_to_null, invalid_override_different_default_values_named, prefer_expression_function_bodies, annotate_overrides, invalid_annotation_target, unnecessary_question_mark

part of 'mandate_detail.dart';

// **************************************************************************
// FreezedGenerator
// **************************************************************************

// dart format off
T _$identity<T>(T value) => value;

/// @nodoc
mixin _$MandateLandlordRef {

 String get id; String get displayName; bool get isDiaspora;
/// Create a copy of MandateLandlordRef
/// with the given fields replaced by the non-null parameter values.
@JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
$MandateLandlordRefCopyWith<MandateLandlordRef> get copyWith => _$MandateLandlordRefCopyWithImpl<MandateLandlordRef>(this as MandateLandlordRef, _$identity);

  /// Serializes this MandateLandlordRef to a JSON map.
  Map<String, dynamic> toJson();


@override
bool operator ==(Object other) {
  return identical(this, other) || (other.runtimeType == runtimeType&&other is MandateLandlordRef&&(identical(other.id, id) || other.id == id)&&(identical(other.displayName, displayName) || other.displayName == displayName)&&(identical(other.isDiaspora, isDiaspora) || other.isDiaspora == isDiaspora));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode => Object.hash(runtimeType,id,displayName,isDiaspora);

@override
String toString() {
  return 'MandateLandlordRef(id: $id, displayName: $displayName, isDiaspora: $isDiaspora)';
}


}

/// @nodoc
abstract mixin class $MandateLandlordRefCopyWith<$Res>  {
  factory $MandateLandlordRefCopyWith(MandateLandlordRef value, $Res Function(MandateLandlordRef) _then) = _$MandateLandlordRefCopyWithImpl;
@useResult
$Res call({
 String id, String displayName, bool isDiaspora
});




}
/// @nodoc
class _$MandateLandlordRefCopyWithImpl<$Res>
    implements $MandateLandlordRefCopyWith<$Res> {
  _$MandateLandlordRefCopyWithImpl(this._self, this._then);

  final MandateLandlordRef _self;
  final $Res Function(MandateLandlordRef) _then;

/// Create a copy of MandateLandlordRef
/// with the given fields replaced by the non-null parameter values.
@pragma('vm:prefer-inline') @override $Res call({Object? id = null,Object? displayName = null,Object? isDiaspora = null,}) {
  return _then(_self.copyWith(
id: null == id ? _self.id : id // ignore: cast_nullable_to_non_nullable
as String,displayName: null == displayName ? _self.displayName : displayName // ignore: cast_nullable_to_non_nullable
as String,isDiaspora: null == isDiaspora ? _self.isDiaspora : isDiaspora // ignore: cast_nullable_to_non_nullable
as bool,
  ));
}

}


/// Adds pattern-matching-related methods to [MandateLandlordRef].
extension MandateLandlordRefPatterns on MandateLandlordRef {
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

@optionalTypeArgs TResult maybeMap<TResult extends Object?>(TResult Function( _MandateLandlordRef value)?  $default,{required TResult orElse(),}){
final _that = this;
switch (_that) {
case _MandateLandlordRef() when $default != null:
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

@optionalTypeArgs TResult map<TResult extends Object?>(TResult Function( _MandateLandlordRef value)  $default,){
final _that = this;
switch (_that) {
case _MandateLandlordRef():
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

@optionalTypeArgs TResult? mapOrNull<TResult extends Object?>(TResult? Function( _MandateLandlordRef value)?  $default,){
final _that = this;
switch (_that) {
case _MandateLandlordRef() when $default != null:
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

@optionalTypeArgs TResult maybeWhen<TResult extends Object?>(TResult Function( String id,  String displayName,  bool isDiaspora)?  $default,{required TResult orElse(),}) {final _that = this;
switch (_that) {
case _MandateLandlordRef() when $default != null:
return $default(_that.id,_that.displayName,_that.isDiaspora);case _:
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

@optionalTypeArgs TResult when<TResult extends Object?>(TResult Function( String id,  String displayName,  bool isDiaspora)  $default,) {final _that = this;
switch (_that) {
case _MandateLandlordRef():
return $default(_that.id,_that.displayName,_that.isDiaspora);case _:
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

@optionalTypeArgs TResult? whenOrNull<TResult extends Object?>(TResult? Function( String id,  String displayName,  bool isDiaspora)?  $default,) {final _that = this;
switch (_that) {
case _MandateLandlordRef() when $default != null:
return $default(_that.id,_that.displayName,_that.isDiaspora);case _:
  return null;

}
}

}

/// @nodoc
@JsonSerializable()

class _MandateLandlordRef implements MandateLandlordRef {
  const _MandateLandlordRef({required this.id, required this.displayName, this.isDiaspora = false});
  factory _MandateLandlordRef.fromJson(Map<String, dynamic> json) => _$MandateLandlordRefFromJson(json);

@override final  String id;
@override final  String displayName;
@override@JsonKey() final  bool isDiaspora;

/// Create a copy of MandateLandlordRef
/// with the given fields replaced by the non-null parameter values.
@override @JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
_$MandateLandlordRefCopyWith<_MandateLandlordRef> get copyWith => __$MandateLandlordRefCopyWithImpl<_MandateLandlordRef>(this, _$identity);

@override
Map<String, dynamic> toJson() {
  return _$MandateLandlordRefToJson(this, );
}

@override
bool operator ==(Object other) {
  return identical(this, other) || (other.runtimeType == runtimeType&&other is _MandateLandlordRef&&(identical(other.id, id) || other.id == id)&&(identical(other.displayName, displayName) || other.displayName == displayName)&&(identical(other.isDiaspora, isDiaspora) || other.isDiaspora == isDiaspora));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode => Object.hash(runtimeType,id,displayName,isDiaspora);

@override
String toString() {
  return 'MandateLandlordRef(id: $id, displayName: $displayName, isDiaspora: $isDiaspora)';
}


}

/// @nodoc
abstract mixin class _$MandateLandlordRefCopyWith<$Res> implements $MandateLandlordRefCopyWith<$Res> {
  factory _$MandateLandlordRefCopyWith(_MandateLandlordRef value, $Res Function(_MandateLandlordRef) _then) = __$MandateLandlordRefCopyWithImpl;
@override @useResult
$Res call({
 String id, String displayName, bool isDiaspora
});




}
/// @nodoc
class __$MandateLandlordRefCopyWithImpl<$Res>
    implements _$MandateLandlordRefCopyWith<$Res> {
  __$MandateLandlordRefCopyWithImpl(this._self, this._then);

  final _MandateLandlordRef _self;
  final $Res Function(_MandateLandlordRef) _then;

/// Create a copy of MandateLandlordRef
/// with the given fields replaced by the non-null parameter values.
@override @pragma('vm:prefer-inline') $Res call({Object? id = null,Object? displayName = null,Object? isDiaspora = null,}) {
  return _then(_MandateLandlordRef(
id: null == id ? _self.id : id // ignore: cast_nullable_to_non_nullable
as String,displayName: null == displayName ? _self.displayName : displayName // ignore: cast_nullable_to_non_nullable
as String,isDiaspora: null == isDiaspora ? _self.isDiaspora : isDiaspora // ignore: cast_nullable_to_non_nullable
as bool,
  ));
}


}


/// @nodoc
mixin _$LandlordPortalInvitationStatus {

 bool get invited; String? get invitedAt; bool get activated; String? get userId;
/// Create a copy of LandlordPortalInvitationStatus
/// with the given fields replaced by the non-null parameter values.
@JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
$LandlordPortalInvitationStatusCopyWith<LandlordPortalInvitationStatus> get copyWith => _$LandlordPortalInvitationStatusCopyWithImpl<LandlordPortalInvitationStatus>(this as LandlordPortalInvitationStatus, _$identity);

  /// Serializes this LandlordPortalInvitationStatus to a JSON map.
  Map<String, dynamic> toJson();


@override
bool operator ==(Object other) {
  return identical(this, other) || (other.runtimeType == runtimeType&&other is LandlordPortalInvitationStatus&&(identical(other.invited, invited) || other.invited == invited)&&(identical(other.invitedAt, invitedAt) || other.invitedAt == invitedAt)&&(identical(other.activated, activated) || other.activated == activated)&&(identical(other.userId, userId) || other.userId == userId));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode => Object.hash(runtimeType,invited,invitedAt,activated,userId);

@override
String toString() {
  return 'LandlordPortalInvitationStatus(invited: $invited, invitedAt: $invitedAt, activated: $activated, userId: $userId)';
}


}

/// @nodoc
abstract mixin class $LandlordPortalInvitationStatusCopyWith<$Res>  {
  factory $LandlordPortalInvitationStatusCopyWith(LandlordPortalInvitationStatus value, $Res Function(LandlordPortalInvitationStatus) _then) = _$LandlordPortalInvitationStatusCopyWithImpl;
@useResult
$Res call({
 bool invited, String? invitedAt, bool activated, String? userId
});




}
/// @nodoc
class _$LandlordPortalInvitationStatusCopyWithImpl<$Res>
    implements $LandlordPortalInvitationStatusCopyWith<$Res> {
  _$LandlordPortalInvitationStatusCopyWithImpl(this._self, this._then);

  final LandlordPortalInvitationStatus _self;
  final $Res Function(LandlordPortalInvitationStatus) _then;

/// Create a copy of LandlordPortalInvitationStatus
/// with the given fields replaced by the non-null parameter values.
@pragma('vm:prefer-inline') @override $Res call({Object? invited = null,Object? invitedAt = freezed,Object? activated = null,Object? userId = freezed,}) {
  return _then(_self.copyWith(
invited: null == invited ? _self.invited : invited // ignore: cast_nullable_to_non_nullable
as bool,invitedAt: freezed == invitedAt ? _self.invitedAt : invitedAt // ignore: cast_nullable_to_non_nullable
as String?,activated: null == activated ? _self.activated : activated // ignore: cast_nullable_to_non_nullable
as bool,userId: freezed == userId ? _self.userId : userId // ignore: cast_nullable_to_non_nullable
as String?,
  ));
}

}


/// Adds pattern-matching-related methods to [LandlordPortalInvitationStatus].
extension LandlordPortalInvitationStatusPatterns on LandlordPortalInvitationStatus {
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

@optionalTypeArgs TResult maybeMap<TResult extends Object?>(TResult Function( _LandlordPortalInvitationStatus value)?  $default,{required TResult orElse(),}){
final _that = this;
switch (_that) {
case _LandlordPortalInvitationStatus() when $default != null:
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

@optionalTypeArgs TResult map<TResult extends Object?>(TResult Function( _LandlordPortalInvitationStatus value)  $default,){
final _that = this;
switch (_that) {
case _LandlordPortalInvitationStatus():
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

@optionalTypeArgs TResult? mapOrNull<TResult extends Object?>(TResult? Function( _LandlordPortalInvitationStatus value)?  $default,){
final _that = this;
switch (_that) {
case _LandlordPortalInvitationStatus() when $default != null:
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

@optionalTypeArgs TResult maybeWhen<TResult extends Object?>(TResult Function( bool invited,  String? invitedAt,  bool activated,  String? userId)?  $default,{required TResult orElse(),}) {final _that = this;
switch (_that) {
case _LandlordPortalInvitationStatus() when $default != null:
return $default(_that.invited,_that.invitedAt,_that.activated,_that.userId);case _:
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

@optionalTypeArgs TResult when<TResult extends Object?>(TResult Function( bool invited,  String? invitedAt,  bool activated,  String? userId)  $default,) {final _that = this;
switch (_that) {
case _LandlordPortalInvitationStatus():
return $default(_that.invited,_that.invitedAt,_that.activated,_that.userId);case _:
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

@optionalTypeArgs TResult? whenOrNull<TResult extends Object?>(TResult? Function( bool invited,  String? invitedAt,  bool activated,  String? userId)?  $default,) {final _that = this;
switch (_that) {
case _LandlordPortalInvitationStatus() when $default != null:
return $default(_that.invited,_that.invitedAt,_that.activated,_that.userId);case _:
  return null;

}
}

}

/// @nodoc
@JsonSerializable()

class _LandlordPortalInvitationStatus implements LandlordPortalInvitationStatus {
  const _LandlordPortalInvitationStatus({this.invited = false, this.invitedAt, this.activated = false, this.userId});
  factory _LandlordPortalInvitationStatus.fromJson(Map<String, dynamic> json) => _$LandlordPortalInvitationStatusFromJson(json);

@override@JsonKey() final  bool invited;
@override final  String? invitedAt;
@override@JsonKey() final  bool activated;
@override final  String? userId;

/// Create a copy of LandlordPortalInvitationStatus
/// with the given fields replaced by the non-null parameter values.
@override @JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
_$LandlordPortalInvitationStatusCopyWith<_LandlordPortalInvitationStatus> get copyWith => __$LandlordPortalInvitationStatusCopyWithImpl<_LandlordPortalInvitationStatus>(this, _$identity);

@override
Map<String, dynamic> toJson() {
  return _$LandlordPortalInvitationStatusToJson(this, );
}

@override
bool operator ==(Object other) {
  return identical(this, other) || (other.runtimeType == runtimeType&&other is _LandlordPortalInvitationStatus&&(identical(other.invited, invited) || other.invited == invited)&&(identical(other.invitedAt, invitedAt) || other.invitedAt == invitedAt)&&(identical(other.activated, activated) || other.activated == activated)&&(identical(other.userId, userId) || other.userId == userId));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode => Object.hash(runtimeType,invited,invitedAt,activated,userId);

@override
String toString() {
  return 'LandlordPortalInvitationStatus(invited: $invited, invitedAt: $invitedAt, activated: $activated, userId: $userId)';
}


}

/// @nodoc
abstract mixin class _$LandlordPortalInvitationStatusCopyWith<$Res> implements $LandlordPortalInvitationStatusCopyWith<$Res> {
  factory _$LandlordPortalInvitationStatusCopyWith(_LandlordPortalInvitationStatus value, $Res Function(_LandlordPortalInvitationStatus) _then) = __$LandlordPortalInvitationStatusCopyWithImpl;
@override @useResult
$Res call({
 bool invited, String? invitedAt, bool activated, String? userId
});




}
/// @nodoc
class __$LandlordPortalInvitationStatusCopyWithImpl<$Res>
    implements _$LandlordPortalInvitationStatusCopyWith<$Res> {
  __$LandlordPortalInvitationStatusCopyWithImpl(this._self, this._then);

  final _LandlordPortalInvitationStatus _self;
  final $Res Function(_LandlordPortalInvitationStatus) _then;

/// Create a copy of LandlordPortalInvitationStatus
/// with the given fields replaced by the non-null parameter values.
@override @pragma('vm:prefer-inline') $Res call({Object? invited = null,Object? invitedAt = freezed,Object? activated = null,Object? userId = freezed,}) {
  return _then(_LandlordPortalInvitationStatus(
invited: null == invited ? _self.invited : invited // ignore: cast_nullable_to_non_nullable
as bool,invitedAt: freezed == invitedAt ? _self.invitedAt : invitedAt // ignore: cast_nullable_to_non_nullable
as String?,activated: null == activated ? _self.activated : activated // ignore: cast_nullable_to_non_nullable
as bool,userId: freezed == userId ? _self.userId : userId // ignore: cast_nullable_to_non_nullable
as String?,
  ));
}


}


/// @nodoc
mixin _$MandateDetail {

 String get id; String get reference; MandateStatus get status; MandateLandlordRef get landlord; CommissionBasis get commissionBasis; int? get commissionRateBps; int? get commissionFlatAmount; int get vatRateBps; String get startDate; String? get endDate; int get payoutDay; String get currency; LandlordPortalInvitationStatus get landlordPortal;
/// Create a copy of MandateDetail
/// with the given fields replaced by the non-null parameter values.
@JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
$MandateDetailCopyWith<MandateDetail> get copyWith => _$MandateDetailCopyWithImpl<MandateDetail>(this as MandateDetail, _$identity);

  /// Serializes this MandateDetail to a JSON map.
  Map<String, dynamic> toJson();


@override
bool operator ==(Object other) {
  return identical(this, other) || (other.runtimeType == runtimeType&&other is MandateDetail&&(identical(other.id, id) || other.id == id)&&(identical(other.reference, reference) || other.reference == reference)&&(identical(other.status, status) || other.status == status)&&(identical(other.landlord, landlord) || other.landlord == landlord)&&(identical(other.commissionBasis, commissionBasis) || other.commissionBasis == commissionBasis)&&(identical(other.commissionRateBps, commissionRateBps) || other.commissionRateBps == commissionRateBps)&&(identical(other.commissionFlatAmount, commissionFlatAmount) || other.commissionFlatAmount == commissionFlatAmount)&&(identical(other.vatRateBps, vatRateBps) || other.vatRateBps == vatRateBps)&&(identical(other.startDate, startDate) || other.startDate == startDate)&&(identical(other.endDate, endDate) || other.endDate == endDate)&&(identical(other.payoutDay, payoutDay) || other.payoutDay == payoutDay)&&(identical(other.currency, currency) || other.currency == currency)&&(identical(other.landlordPortal, landlordPortal) || other.landlordPortal == landlordPortal));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode => Object.hash(runtimeType,id,reference,status,landlord,commissionBasis,commissionRateBps,commissionFlatAmount,vatRateBps,startDate,endDate,payoutDay,currency,landlordPortal);

@override
String toString() {
  return 'MandateDetail(id: $id, reference: $reference, status: $status, landlord: $landlord, commissionBasis: $commissionBasis, commissionRateBps: $commissionRateBps, commissionFlatAmount: $commissionFlatAmount, vatRateBps: $vatRateBps, startDate: $startDate, endDate: $endDate, payoutDay: $payoutDay, currency: $currency, landlordPortal: $landlordPortal)';
}


}

/// @nodoc
abstract mixin class $MandateDetailCopyWith<$Res>  {
  factory $MandateDetailCopyWith(MandateDetail value, $Res Function(MandateDetail) _then) = _$MandateDetailCopyWithImpl;
@useResult
$Res call({
 String id, String reference, MandateStatus status, MandateLandlordRef landlord, CommissionBasis commissionBasis, int? commissionRateBps, int? commissionFlatAmount, int vatRateBps, String startDate, String? endDate, int payoutDay, String currency, LandlordPortalInvitationStatus landlordPortal
});


$MandateLandlordRefCopyWith<$Res> get landlord;$LandlordPortalInvitationStatusCopyWith<$Res> get landlordPortal;

}
/// @nodoc
class _$MandateDetailCopyWithImpl<$Res>
    implements $MandateDetailCopyWith<$Res> {
  _$MandateDetailCopyWithImpl(this._self, this._then);

  final MandateDetail _self;
  final $Res Function(MandateDetail) _then;

/// Create a copy of MandateDetail
/// with the given fields replaced by the non-null parameter values.
@pragma('vm:prefer-inline') @override $Res call({Object? id = null,Object? reference = null,Object? status = null,Object? landlord = null,Object? commissionBasis = null,Object? commissionRateBps = freezed,Object? commissionFlatAmount = freezed,Object? vatRateBps = null,Object? startDate = null,Object? endDate = freezed,Object? payoutDay = null,Object? currency = null,Object? landlordPortal = null,}) {
  return _then(_self.copyWith(
id: null == id ? _self.id : id // ignore: cast_nullable_to_non_nullable
as String,reference: null == reference ? _self.reference : reference // ignore: cast_nullable_to_non_nullable
as String,status: null == status ? _self.status : status // ignore: cast_nullable_to_non_nullable
as MandateStatus,landlord: null == landlord ? _self.landlord : landlord // ignore: cast_nullable_to_non_nullable
as MandateLandlordRef,commissionBasis: null == commissionBasis ? _self.commissionBasis : commissionBasis // ignore: cast_nullable_to_non_nullable
as CommissionBasis,commissionRateBps: freezed == commissionRateBps ? _self.commissionRateBps : commissionRateBps // ignore: cast_nullable_to_non_nullable
as int?,commissionFlatAmount: freezed == commissionFlatAmount ? _self.commissionFlatAmount : commissionFlatAmount // ignore: cast_nullable_to_non_nullable
as int?,vatRateBps: null == vatRateBps ? _self.vatRateBps : vatRateBps // ignore: cast_nullable_to_non_nullable
as int,startDate: null == startDate ? _self.startDate : startDate // ignore: cast_nullable_to_non_nullable
as String,endDate: freezed == endDate ? _self.endDate : endDate // ignore: cast_nullable_to_non_nullable
as String?,payoutDay: null == payoutDay ? _self.payoutDay : payoutDay // ignore: cast_nullable_to_non_nullable
as int,currency: null == currency ? _self.currency : currency // ignore: cast_nullable_to_non_nullable
as String,landlordPortal: null == landlordPortal ? _self.landlordPortal : landlordPortal // ignore: cast_nullable_to_non_nullable
as LandlordPortalInvitationStatus,
  ));
}
/// Create a copy of MandateDetail
/// with the given fields replaced by the non-null parameter values.
@override
@pragma('vm:prefer-inline')
$MandateLandlordRefCopyWith<$Res> get landlord {
  
  return $MandateLandlordRefCopyWith<$Res>(_self.landlord, (value) {
    return _then(_self.copyWith(landlord: value));
  });
}/// Create a copy of MandateDetail
/// with the given fields replaced by the non-null parameter values.
@override
@pragma('vm:prefer-inline')
$LandlordPortalInvitationStatusCopyWith<$Res> get landlordPortal {
  
  return $LandlordPortalInvitationStatusCopyWith<$Res>(_self.landlordPortal, (value) {
    return _then(_self.copyWith(landlordPortal: value));
  });
}
}


/// Adds pattern-matching-related methods to [MandateDetail].
extension MandateDetailPatterns on MandateDetail {
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

@optionalTypeArgs TResult maybeMap<TResult extends Object?>(TResult Function( _MandateDetail value)?  $default,{required TResult orElse(),}){
final _that = this;
switch (_that) {
case _MandateDetail() when $default != null:
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

@optionalTypeArgs TResult map<TResult extends Object?>(TResult Function( _MandateDetail value)  $default,){
final _that = this;
switch (_that) {
case _MandateDetail():
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

@optionalTypeArgs TResult? mapOrNull<TResult extends Object?>(TResult? Function( _MandateDetail value)?  $default,){
final _that = this;
switch (_that) {
case _MandateDetail() when $default != null:
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

@optionalTypeArgs TResult maybeWhen<TResult extends Object?>(TResult Function( String id,  String reference,  MandateStatus status,  MandateLandlordRef landlord,  CommissionBasis commissionBasis,  int? commissionRateBps,  int? commissionFlatAmount,  int vatRateBps,  String startDate,  String? endDate,  int payoutDay,  String currency,  LandlordPortalInvitationStatus landlordPortal)?  $default,{required TResult orElse(),}) {final _that = this;
switch (_that) {
case _MandateDetail() when $default != null:
return $default(_that.id,_that.reference,_that.status,_that.landlord,_that.commissionBasis,_that.commissionRateBps,_that.commissionFlatAmount,_that.vatRateBps,_that.startDate,_that.endDate,_that.payoutDay,_that.currency,_that.landlordPortal);case _:
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

@optionalTypeArgs TResult when<TResult extends Object?>(TResult Function( String id,  String reference,  MandateStatus status,  MandateLandlordRef landlord,  CommissionBasis commissionBasis,  int? commissionRateBps,  int? commissionFlatAmount,  int vatRateBps,  String startDate,  String? endDate,  int payoutDay,  String currency,  LandlordPortalInvitationStatus landlordPortal)  $default,) {final _that = this;
switch (_that) {
case _MandateDetail():
return $default(_that.id,_that.reference,_that.status,_that.landlord,_that.commissionBasis,_that.commissionRateBps,_that.commissionFlatAmount,_that.vatRateBps,_that.startDate,_that.endDate,_that.payoutDay,_that.currency,_that.landlordPortal);case _:
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

@optionalTypeArgs TResult? whenOrNull<TResult extends Object?>(TResult? Function( String id,  String reference,  MandateStatus status,  MandateLandlordRef landlord,  CommissionBasis commissionBasis,  int? commissionRateBps,  int? commissionFlatAmount,  int vatRateBps,  String startDate,  String? endDate,  int payoutDay,  String currency,  LandlordPortalInvitationStatus landlordPortal)?  $default,) {final _that = this;
switch (_that) {
case _MandateDetail() when $default != null:
return $default(_that.id,_that.reference,_that.status,_that.landlord,_that.commissionBasis,_that.commissionRateBps,_that.commissionFlatAmount,_that.vatRateBps,_that.startDate,_that.endDate,_that.payoutDay,_that.currency,_that.landlordPortal);case _:
  return null;

}
}

}

/// @nodoc
@JsonSerializable()

class _MandateDetail implements MandateDetail {
  const _MandateDetail({required this.id, required this.reference, required this.status, required this.landlord, required this.commissionBasis, this.commissionRateBps, this.commissionFlatAmount, this.vatRateBps = defaultCommissionVatRateBps, required this.startDate, this.endDate, this.payoutDay = 10, this.currency = 'XAF', required this.landlordPortal});
  factory _MandateDetail.fromJson(Map<String, dynamic> json) => _$MandateDetailFromJson(json);

@override final  String id;
@override final  String reference;
@override final  MandateStatus status;
@override final  MandateLandlordRef landlord;
@override final  CommissionBasis commissionBasis;
@override final  int? commissionRateBps;
@override final  int? commissionFlatAmount;
@override@JsonKey() final  int vatRateBps;
@override final  String startDate;
@override final  String? endDate;
@override@JsonKey() final  int payoutDay;
@override@JsonKey() final  String currency;
@override final  LandlordPortalInvitationStatus landlordPortal;

/// Create a copy of MandateDetail
/// with the given fields replaced by the non-null parameter values.
@override @JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
_$MandateDetailCopyWith<_MandateDetail> get copyWith => __$MandateDetailCopyWithImpl<_MandateDetail>(this, _$identity);

@override
Map<String, dynamic> toJson() {
  return _$MandateDetailToJson(this, );
}

@override
bool operator ==(Object other) {
  return identical(this, other) || (other.runtimeType == runtimeType&&other is _MandateDetail&&(identical(other.id, id) || other.id == id)&&(identical(other.reference, reference) || other.reference == reference)&&(identical(other.status, status) || other.status == status)&&(identical(other.landlord, landlord) || other.landlord == landlord)&&(identical(other.commissionBasis, commissionBasis) || other.commissionBasis == commissionBasis)&&(identical(other.commissionRateBps, commissionRateBps) || other.commissionRateBps == commissionRateBps)&&(identical(other.commissionFlatAmount, commissionFlatAmount) || other.commissionFlatAmount == commissionFlatAmount)&&(identical(other.vatRateBps, vatRateBps) || other.vatRateBps == vatRateBps)&&(identical(other.startDate, startDate) || other.startDate == startDate)&&(identical(other.endDate, endDate) || other.endDate == endDate)&&(identical(other.payoutDay, payoutDay) || other.payoutDay == payoutDay)&&(identical(other.currency, currency) || other.currency == currency)&&(identical(other.landlordPortal, landlordPortal) || other.landlordPortal == landlordPortal));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode => Object.hash(runtimeType,id,reference,status,landlord,commissionBasis,commissionRateBps,commissionFlatAmount,vatRateBps,startDate,endDate,payoutDay,currency,landlordPortal);

@override
String toString() {
  return 'MandateDetail(id: $id, reference: $reference, status: $status, landlord: $landlord, commissionBasis: $commissionBasis, commissionRateBps: $commissionRateBps, commissionFlatAmount: $commissionFlatAmount, vatRateBps: $vatRateBps, startDate: $startDate, endDate: $endDate, payoutDay: $payoutDay, currency: $currency, landlordPortal: $landlordPortal)';
}


}

/// @nodoc
abstract mixin class _$MandateDetailCopyWith<$Res> implements $MandateDetailCopyWith<$Res> {
  factory _$MandateDetailCopyWith(_MandateDetail value, $Res Function(_MandateDetail) _then) = __$MandateDetailCopyWithImpl;
@override @useResult
$Res call({
 String id, String reference, MandateStatus status, MandateLandlordRef landlord, CommissionBasis commissionBasis, int? commissionRateBps, int? commissionFlatAmount, int vatRateBps, String startDate, String? endDate, int payoutDay, String currency, LandlordPortalInvitationStatus landlordPortal
});


@override $MandateLandlordRefCopyWith<$Res> get landlord;@override $LandlordPortalInvitationStatusCopyWith<$Res> get landlordPortal;

}
/// @nodoc
class __$MandateDetailCopyWithImpl<$Res>
    implements _$MandateDetailCopyWith<$Res> {
  __$MandateDetailCopyWithImpl(this._self, this._then);

  final _MandateDetail _self;
  final $Res Function(_MandateDetail) _then;

/// Create a copy of MandateDetail
/// with the given fields replaced by the non-null parameter values.
@override @pragma('vm:prefer-inline') $Res call({Object? id = null,Object? reference = null,Object? status = null,Object? landlord = null,Object? commissionBasis = null,Object? commissionRateBps = freezed,Object? commissionFlatAmount = freezed,Object? vatRateBps = null,Object? startDate = null,Object? endDate = freezed,Object? payoutDay = null,Object? currency = null,Object? landlordPortal = null,}) {
  return _then(_MandateDetail(
id: null == id ? _self.id : id // ignore: cast_nullable_to_non_nullable
as String,reference: null == reference ? _self.reference : reference // ignore: cast_nullable_to_non_nullable
as String,status: null == status ? _self.status : status // ignore: cast_nullable_to_non_nullable
as MandateStatus,landlord: null == landlord ? _self.landlord : landlord // ignore: cast_nullable_to_non_nullable
as MandateLandlordRef,commissionBasis: null == commissionBasis ? _self.commissionBasis : commissionBasis // ignore: cast_nullable_to_non_nullable
as CommissionBasis,commissionRateBps: freezed == commissionRateBps ? _self.commissionRateBps : commissionRateBps // ignore: cast_nullable_to_non_nullable
as int?,commissionFlatAmount: freezed == commissionFlatAmount ? _self.commissionFlatAmount : commissionFlatAmount // ignore: cast_nullable_to_non_nullable
as int?,vatRateBps: null == vatRateBps ? _self.vatRateBps : vatRateBps // ignore: cast_nullable_to_non_nullable
as int,startDate: null == startDate ? _self.startDate : startDate // ignore: cast_nullable_to_non_nullable
as String,endDate: freezed == endDate ? _self.endDate : endDate // ignore: cast_nullable_to_non_nullable
as String?,payoutDay: null == payoutDay ? _self.payoutDay : payoutDay // ignore: cast_nullable_to_non_nullable
as int,currency: null == currency ? _self.currency : currency // ignore: cast_nullable_to_non_nullable
as String,landlordPortal: null == landlordPortal ? _self.landlordPortal : landlordPortal // ignore: cast_nullable_to_non_nullable
as LandlordPortalInvitationStatus,
  ));
}

/// Create a copy of MandateDetail
/// with the given fields replaced by the non-null parameter values.
@override
@pragma('vm:prefer-inline')
$MandateLandlordRefCopyWith<$Res> get landlord {
  
  return $MandateLandlordRefCopyWith<$Res>(_self.landlord, (value) {
    return _then(_self.copyWith(landlord: value));
  });
}/// Create a copy of MandateDetail
/// with the given fields replaced by the non-null parameter values.
@override
@pragma('vm:prefer-inline')
$LandlordPortalInvitationStatusCopyWith<$Res> get landlordPortal {
  
  return $LandlordPortalInvitationStatusCopyWith<$Res>(_self.landlordPortal, (value) {
    return _then(_self.copyWith(landlordPortal: value));
  });
}
}

// dart format on
