// GENERATED CODE - DO NOT MODIFY BY HAND
// coverage:ignore-file
// ignore_for_file: type=lint
// ignore_for_file: unused_element, deprecated_member_use, deprecated_member_use_from_same_package, use_function_type_syntax_for_parameters, unnecessary_const, avoid_init_to_null, invalid_override_different_default_values_named, prefer_expression_function_bodies, annotate_overrides, invalid_annotation_target, unnecessary_question_mark

part of 'dunning_run.dart';

// **************************************************************************
// FreezedGenerator
// **************************************************************************

// dart format off
T _$identity<T>(T value) => value;

/// @nodoc
mixin _$DunningRunInvoiceRef {

 String get id; String? get invoiceNumber;
/// Create a copy of DunningRunInvoiceRef
/// with the given fields replaced by the non-null parameter values.
@JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
$DunningRunInvoiceRefCopyWith<DunningRunInvoiceRef> get copyWith => _$DunningRunInvoiceRefCopyWithImpl<DunningRunInvoiceRef>(this as DunningRunInvoiceRef, _$identity);

  /// Serializes this DunningRunInvoiceRef to a JSON map.
  Map<String, dynamic> toJson();


@override
bool operator ==(Object other) {
  return identical(this, other) || (other.runtimeType == runtimeType&&other is DunningRunInvoiceRef&&(identical(other.id, id) || other.id == id)&&(identical(other.invoiceNumber, invoiceNumber) || other.invoiceNumber == invoiceNumber));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode => Object.hash(runtimeType,id,invoiceNumber);

@override
String toString() {
  return 'DunningRunInvoiceRef(id: $id, invoiceNumber: $invoiceNumber)';
}


}

/// @nodoc
abstract mixin class $DunningRunInvoiceRefCopyWith<$Res>  {
  factory $DunningRunInvoiceRefCopyWith(DunningRunInvoiceRef value, $Res Function(DunningRunInvoiceRef) _then) = _$DunningRunInvoiceRefCopyWithImpl;
@useResult
$Res call({
 String id, String? invoiceNumber
});




}
/// @nodoc
class _$DunningRunInvoiceRefCopyWithImpl<$Res>
    implements $DunningRunInvoiceRefCopyWith<$Res> {
  _$DunningRunInvoiceRefCopyWithImpl(this._self, this._then);

  final DunningRunInvoiceRef _self;
  final $Res Function(DunningRunInvoiceRef) _then;

/// Create a copy of DunningRunInvoiceRef
/// with the given fields replaced by the non-null parameter values.
@pragma('vm:prefer-inline') @override $Res call({Object? id = null,Object? invoiceNumber = freezed,}) {
  return _then(_self.copyWith(
id: null == id ? _self.id : id // ignore: cast_nullable_to_non_nullable
as String,invoiceNumber: freezed == invoiceNumber ? _self.invoiceNumber : invoiceNumber // ignore: cast_nullable_to_non_nullable
as String?,
  ));
}

}


/// Adds pattern-matching-related methods to [DunningRunInvoiceRef].
extension DunningRunInvoiceRefPatterns on DunningRunInvoiceRef {
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

@optionalTypeArgs TResult maybeMap<TResult extends Object?>(TResult Function( _DunningRunInvoiceRef value)?  $default,{required TResult orElse(),}){
final _that = this;
switch (_that) {
case _DunningRunInvoiceRef() when $default != null:
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

@optionalTypeArgs TResult map<TResult extends Object?>(TResult Function( _DunningRunInvoiceRef value)  $default,){
final _that = this;
switch (_that) {
case _DunningRunInvoiceRef():
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

@optionalTypeArgs TResult? mapOrNull<TResult extends Object?>(TResult? Function( _DunningRunInvoiceRef value)?  $default,){
final _that = this;
switch (_that) {
case _DunningRunInvoiceRef() when $default != null:
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

@optionalTypeArgs TResult maybeWhen<TResult extends Object?>(TResult Function( String id,  String? invoiceNumber)?  $default,{required TResult orElse(),}) {final _that = this;
switch (_that) {
case _DunningRunInvoiceRef() when $default != null:
return $default(_that.id,_that.invoiceNumber);case _:
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

@optionalTypeArgs TResult when<TResult extends Object?>(TResult Function( String id,  String? invoiceNumber)  $default,) {final _that = this;
switch (_that) {
case _DunningRunInvoiceRef():
return $default(_that.id,_that.invoiceNumber);case _:
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

@optionalTypeArgs TResult? whenOrNull<TResult extends Object?>(TResult? Function( String id,  String? invoiceNumber)?  $default,) {final _that = this;
switch (_that) {
case _DunningRunInvoiceRef() when $default != null:
return $default(_that.id,_that.invoiceNumber);case _:
  return null;

}
}

}

/// @nodoc
@JsonSerializable()

class _DunningRunInvoiceRef implements DunningRunInvoiceRef {
  const _DunningRunInvoiceRef({required this.id, this.invoiceNumber});
  factory _DunningRunInvoiceRef.fromJson(Map<String, dynamic> json) => _$DunningRunInvoiceRefFromJson(json);

@override final  String id;
@override final  String? invoiceNumber;

/// Create a copy of DunningRunInvoiceRef
/// with the given fields replaced by the non-null parameter values.
@override @JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
_$DunningRunInvoiceRefCopyWith<_DunningRunInvoiceRef> get copyWith => __$DunningRunInvoiceRefCopyWithImpl<_DunningRunInvoiceRef>(this, _$identity);

@override
Map<String, dynamic> toJson() {
  return _$DunningRunInvoiceRefToJson(this, );
}

@override
bool operator ==(Object other) {
  return identical(this, other) || (other.runtimeType == runtimeType&&other is _DunningRunInvoiceRef&&(identical(other.id, id) || other.id == id)&&(identical(other.invoiceNumber, invoiceNumber) || other.invoiceNumber == invoiceNumber));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode => Object.hash(runtimeType,id,invoiceNumber);

@override
String toString() {
  return 'DunningRunInvoiceRef(id: $id, invoiceNumber: $invoiceNumber)';
}


}

/// @nodoc
abstract mixin class _$DunningRunInvoiceRefCopyWith<$Res> implements $DunningRunInvoiceRefCopyWith<$Res> {
  factory _$DunningRunInvoiceRefCopyWith(_DunningRunInvoiceRef value, $Res Function(_DunningRunInvoiceRef) _then) = __$DunningRunInvoiceRefCopyWithImpl;
@override @useResult
$Res call({
 String id, String? invoiceNumber
});




}
/// @nodoc
class __$DunningRunInvoiceRefCopyWithImpl<$Res>
    implements _$DunningRunInvoiceRefCopyWith<$Res> {
  __$DunningRunInvoiceRefCopyWithImpl(this._self, this._then);

  final _DunningRunInvoiceRef _self;
  final $Res Function(_DunningRunInvoiceRef) _then;

/// Create a copy of DunningRunInvoiceRef
/// with the given fields replaced by the non-null parameter values.
@override @pragma('vm:prefer-inline') $Res call({Object? id = null,Object? invoiceNumber = freezed,}) {
  return _then(_DunningRunInvoiceRef(
id: null == id ? _self.id : id // ignore: cast_nullable_to_non_nullable
as String,invoiceNumber: freezed == invoiceNumber ? _self.invoiceNumber : invoiceNumber // ignore: cast_nullable_to_non_nullable
as String?,
  ));
}


}


/// @nodoc
mixin _$DunningRunTenantRef {

 String get id; String get displayName;
/// Create a copy of DunningRunTenantRef
/// with the given fields replaced by the non-null parameter values.
@JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
$DunningRunTenantRefCopyWith<DunningRunTenantRef> get copyWith => _$DunningRunTenantRefCopyWithImpl<DunningRunTenantRef>(this as DunningRunTenantRef, _$identity);

  /// Serializes this DunningRunTenantRef to a JSON map.
  Map<String, dynamic> toJson();


@override
bool operator ==(Object other) {
  return identical(this, other) || (other.runtimeType == runtimeType&&other is DunningRunTenantRef&&(identical(other.id, id) || other.id == id)&&(identical(other.displayName, displayName) || other.displayName == displayName));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode => Object.hash(runtimeType,id,displayName);

@override
String toString() {
  return 'DunningRunTenantRef(id: $id, displayName: $displayName)';
}


}

/// @nodoc
abstract mixin class $DunningRunTenantRefCopyWith<$Res>  {
  factory $DunningRunTenantRefCopyWith(DunningRunTenantRef value, $Res Function(DunningRunTenantRef) _then) = _$DunningRunTenantRefCopyWithImpl;
@useResult
$Res call({
 String id, String displayName
});




}
/// @nodoc
class _$DunningRunTenantRefCopyWithImpl<$Res>
    implements $DunningRunTenantRefCopyWith<$Res> {
  _$DunningRunTenantRefCopyWithImpl(this._self, this._then);

  final DunningRunTenantRef _self;
  final $Res Function(DunningRunTenantRef) _then;

/// Create a copy of DunningRunTenantRef
/// with the given fields replaced by the non-null parameter values.
@pragma('vm:prefer-inline') @override $Res call({Object? id = null,Object? displayName = null,}) {
  return _then(_self.copyWith(
id: null == id ? _self.id : id // ignore: cast_nullable_to_non_nullable
as String,displayName: null == displayName ? _self.displayName : displayName // ignore: cast_nullable_to_non_nullable
as String,
  ));
}

}


/// Adds pattern-matching-related methods to [DunningRunTenantRef].
extension DunningRunTenantRefPatterns on DunningRunTenantRef {
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

@optionalTypeArgs TResult maybeMap<TResult extends Object?>(TResult Function( _DunningRunTenantRef value)?  $default,{required TResult orElse(),}){
final _that = this;
switch (_that) {
case _DunningRunTenantRef() when $default != null:
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

@optionalTypeArgs TResult map<TResult extends Object?>(TResult Function( _DunningRunTenantRef value)  $default,){
final _that = this;
switch (_that) {
case _DunningRunTenantRef():
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

@optionalTypeArgs TResult? mapOrNull<TResult extends Object?>(TResult? Function( _DunningRunTenantRef value)?  $default,){
final _that = this;
switch (_that) {
case _DunningRunTenantRef() when $default != null:
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

@optionalTypeArgs TResult maybeWhen<TResult extends Object?>(TResult Function( String id,  String displayName)?  $default,{required TResult orElse(),}) {final _that = this;
switch (_that) {
case _DunningRunTenantRef() when $default != null:
return $default(_that.id,_that.displayName);case _:
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

@optionalTypeArgs TResult when<TResult extends Object?>(TResult Function( String id,  String displayName)  $default,) {final _that = this;
switch (_that) {
case _DunningRunTenantRef():
return $default(_that.id,_that.displayName);case _:
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

@optionalTypeArgs TResult? whenOrNull<TResult extends Object?>(TResult? Function( String id,  String displayName)?  $default,) {final _that = this;
switch (_that) {
case _DunningRunTenantRef() when $default != null:
return $default(_that.id,_that.displayName);case _:
  return null;

}
}

}

/// @nodoc
@JsonSerializable()

class _DunningRunTenantRef implements DunningRunTenantRef {
  const _DunningRunTenantRef({required this.id, required this.displayName});
  factory _DunningRunTenantRef.fromJson(Map<String, dynamic> json) => _$DunningRunTenantRefFromJson(json);

@override final  String id;
@override final  String displayName;

/// Create a copy of DunningRunTenantRef
/// with the given fields replaced by the non-null parameter values.
@override @JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
_$DunningRunTenantRefCopyWith<_DunningRunTenantRef> get copyWith => __$DunningRunTenantRefCopyWithImpl<_DunningRunTenantRef>(this, _$identity);

@override
Map<String, dynamic> toJson() {
  return _$DunningRunTenantRefToJson(this, );
}

@override
bool operator ==(Object other) {
  return identical(this, other) || (other.runtimeType == runtimeType&&other is _DunningRunTenantRef&&(identical(other.id, id) || other.id == id)&&(identical(other.displayName, displayName) || other.displayName == displayName));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode => Object.hash(runtimeType,id,displayName);

@override
String toString() {
  return 'DunningRunTenantRef(id: $id, displayName: $displayName)';
}


}

/// @nodoc
abstract mixin class _$DunningRunTenantRefCopyWith<$Res> implements $DunningRunTenantRefCopyWith<$Res> {
  factory _$DunningRunTenantRefCopyWith(_DunningRunTenantRef value, $Res Function(_DunningRunTenantRef) _then) = __$DunningRunTenantRefCopyWithImpl;
@override @useResult
$Res call({
 String id, String displayName
});




}
/// @nodoc
class __$DunningRunTenantRefCopyWithImpl<$Res>
    implements _$DunningRunTenantRefCopyWith<$Res> {
  __$DunningRunTenantRefCopyWithImpl(this._self, this._then);

  final _DunningRunTenantRef _self;
  final $Res Function(_DunningRunTenantRef) _then;

/// Create a copy of DunningRunTenantRef
/// with the given fields replaced by the non-null parameter values.
@override @pragma('vm:prefer-inline') $Res call({Object? id = null,Object? displayName = null,}) {
  return _then(_DunningRunTenantRef(
id: null == id ? _self.id : id // ignore: cast_nullable_to_non_nullable
as String,displayName: null == displayName ? _self.displayName : displayName // ignore: cast_nullable_to_non_nullable
as String,
  ));
}


}


/// @nodoc
mixin _$DunningRun {

 String get id; String get ruleId; String get ruleName; int get stepOrder; DunningStepStatus get status; String get runDate; String get scheduledAt; String? get executedAt; int get daysOverdue; int get balanceAmount; NotificationChannel get channel; DunningRunInvoiceRef? get invoice; DunningRunTenantRef get tenant; String? get notificationId; String? get messageLogId; MessageStatus? get messageStatus; bool get guarantorNotified; bool get penaltyApplied; int get penaltyAmount; String? get skipReason; String? get errorMessage;
/// Create a copy of DunningRun
/// with the given fields replaced by the non-null parameter values.
@JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
$DunningRunCopyWith<DunningRun> get copyWith => _$DunningRunCopyWithImpl<DunningRun>(this as DunningRun, _$identity);

  /// Serializes this DunningRun to a JSON map.
  Map<String, dynamic> toJson();


@override
bool operator ==(Object other) {
  return identical(this, other) || (other.runtimeType == runtimeType&&other is DunningRun&&(identical(other.id, id) || other.id == id)&&(identical(other.ruleId, ruleId) || other.ruleId == ruleId)&&(identical(other.ruleName, ruleName) || other.ruleName == ruleName)&&(identical(other.stepOrder, stepOrder) || other.stepOrder == stepOrder)&&(identical(other.status, status) || other.status == status)&&(identical(other.runDate, runDate) || other.runDate == runDate)&&(identical(other.scheduledAt, scheduledAt) || other.scheduledAt == scheduledAt)&&(identical(other.executedAt, executedAt) || other.executedAt == executedAt)&&(identical(other.daysOverdue, daysOverdue) || other.daysOverdue == daysOverdue)&&(identical(other.balanceAmount, balanceAmount) || other.balanceAmount == balanceAmount)&&(identical(other.channel, channel) || other.channel == channel)&&(identical(other.invoice, invoice) || other.invoice == invoice)&&(identical(other.tenant, tenant) || other.tenant == tenant)&&(identical(other.notificationId, notificationId) || other.notificationId == notificationId)&&(identical(other.messageLogId, messageLogId) || other.messageLogId == messageLogId)&&(identical(other.messageStatus, messageStatus) || other.messageStatus == messageStatus)&&(identical(other.guarantorNotified, guarantorNotified) || other.guarantorNotified == guarantorNotified)&&(identical(other.penaltyApplied, penaltyApplied) || other.penaltyApplied == penaltyApplied)&&(identical(other.penaltyAmount, penaltyAmount) || other.penaltyAmount == penaltyAmount)&&(identical(other.skipReason, skipReason) || other.skipReason == skipReason)&&(identical(other.errorMessage, errorMessage) || other.errorMessage == errorMessage));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode => Object.hashAll([runtimeType,id,ruleId,ruleName,stepOrder,status,runDate,scheduledAt,executedAt,daysOverdue,balanceAmount,channel,invoice,tenant,notificationId,messageLogId,messageStatus,guarantorNotified,penaltyApplied,penaltyAmount,skipReason,errorMessage]);

@override
String toString() {
  return 'DunningRun(id: $id, ruleId: $ruleId, ruleName: $ruleName, stepOrder: $stepOrder, status: $status, runDate: $runDate, scheduledAt: $scheduledAt, executedAt: $executedAt, daysOverdue: $daysOverdue, balanceAmount: $balanceAmount, channel: $channel, invoice: $invoice, tenant: $tenant, notificationId: $notificationId, messageLogId: $messageLogId, messageStatus: $messageStatus, guarantorNotified: $guarantorNotified, penaltyApplied: $penaltyApplied, penaltyAmount: $penaltyAmount, skipReason: $skipReason, errorMessage: $errorMessage)';
}


}

/// @nodoc
abstract mixin class $DunningRunCopyWith<$Res>  {
  factory $DunningRunCopyWith(DunningRun value, $Res Function(DunningRun) _then) = _$DunningRunCopyWithImpl;
@useResult
$Res call({
 String id, String ruleId, String ruleName, int stepOrder, DunningStepStatus status, String runDate, String scheduledAt, String? executedAt, int daysOverdue, int balanceAmount, NotificationChannel channel, DunningRunInvoiceRef? invoice, DunningRunTenantRef tenant, String? notificationId, String? messageLogId, MessageStatus? messageStatus, bool guarantorNotified, bool penaltyApplied, int penaltyAmount, String? skipReason, String? errorMessage
});


$DunningRunInvoiceRefCopyWith<$Res>? get invoice;$DunningRunTenantRefCopyWith<$Res> get tenant;

}
/// @nodoc
class _$DunningRunCopyWithImpl<$Res>
    implements $DunningRunCopyWith<$Res> {
  _$DunningRunCopyWithImpl(this._self, this._then);

  final DunningRun _self;
  final $Res Function(DunningRun) _then;

/// Create a copy of DunningRun
/// with the given fields replaced by the non-null parameter values.
@pragma('vm:prefer-inline') @override $Res call({Object? id = null,Object? ruleId = null,Object? ruleName = null,Object? stepOrder = null,Object? status = null,Object? runDate = null,Object? scheduledAt = null,Object? executedAt = freezed,Object? daysOverdue = null,Object? balanceAmount = null,Object? channel = null,Object? invoice = freezed,Object? tenant = null,Object? notificationId = freezed,Object? messageLogId = freezed,Object? messageStatus = freezed,Object? guarantorNotified = null,Object? penaltyApplied = null,Object? penaltyAmount = null,Object? skipReason = freezed,Object? errorMessage = freezed,}) {
  return _then(_self.copyWith(
id: null == id ? _self.id : id // ignore: cast_nullable_to_non_nullable
as String,ruleId: null == ruleId ? _self.ruleId : ruleId // ignore: cast_nullable_to_non_nullable
as String,ruleName: null == ruleName ? _self.ruleName : ruleName // ignore: cast_nullable_to_non_nullable
as String,stepOrder: null == stepOrder ? _self.stepOrder : stepOrder // ignore: cast_nullable_to_non_nullable
as int,status: null == status ? _self.status : status // ignore: cast_nullable_to_non_nullable
as DunningStepStatus,runDate: null == runDate ? _self.runDate : runDate // ignore: cast_nullable_to_non_nullable
as String,scheduledAt: null == scheduledAt ? _self.scheduledAt : scheduledAt // ignore: cast_nullable_to_non_nullable
as String,executedAt: freezed == executedAt ? _self.executedAt : executedAt // ignore: cast_nullable_to_non_nullable
as String?,daysOverdue: null == daysOverdue ? _self.daysOverdue : daysOverdue // ignore: cast_nullable_to_non_nullable
as int,balanceAmount: null == balanceAmount ? _self.balanceAmount : balanceAmount // ignore: cast_nullable_to_non_nullable
as int,channel: null == channel ? _self.channel : channel // ignore: cast_nullable_to_non_nullable
as NotificationChannel,invoice: freezed == invoice ? _self.invoice : invoice // ignore: cast_nullable_to_non_nullable
as DunningRunInvoiceRef?,tenant: null == tenant ? _self.tenant : tenant // ignore: cast_nullable_to_non_nullable
as DunningRunTenantRef,notificationId: freezed == notificationId ? _self.notificationId : notificationId // ignore: cast_nullable_to_non_nullable
as String?,messageLogId: freezed == messageLogId ? _self.messageLogId : messageLogId // ignore: cast_nullable_to_non_nullable
as String?,messageStatus: freezed == messageStatus ? _self.messageStatus : messageStatus // ignore: cast_nullable_to_non_nullable
as MessageStatus?,guarantorNotified: null == guarantorNotified ? _self.guarantorNotified : guarantorNotified // ignore: cast_nullable_to_non_nullable
as bool,penaltyApplied: null == penaltyApplied ? _self.penaltyApplied : penaltyApplied // ignore: cast_nullable_to_non_nullable
as bool,penaltyAmount: null == penaltyAmount ? _self.penaltyAmount : penaltyAmount // ignore: cast_nullable_to_non_nullable
as int,skipReason: freezed == skipReason ? _self.skipReason : skipReason // ignore: cast_nullable_to_non_nullable
as String?,errorMessage: freezed == errorMessage ? _self.errorMessage : errorMessage // ignore: cast_nullable_to_non_nullable
as String?,
  ));
}
/// Create a copy of DunningRun
/// with the given fields replaced by the non-null parameter values.
@override
@pragma('vm:prefer-inline')
$DunningRunInvoiceRefCopyWith<$Res>? get invoice {
    if (_self.invoice == null) {
    return null;
  }

  return $DunningRunInvoiceRefCopyWith<$Res>(_self.invoice!, (value) {
    return _then(_self.copyWith(invoice: value));
  });
}/// Create a copy of DunningRun
/// with the given fields replaced by the non-null parameter values.
@override
@pragma('vm:prefer-inline')
$DunningRunTenantRefCopyWith<$Res> get tenant {
  
  return $DunningRunTenantRefCopyWith<$Res>(_self.tenant, (value) {
    return _then(_self.copyWith(tenant: value));
  });
}
}


/// Adds pattern-matching-related methods to [DunningRun].
extension DunningRunPatterns on DunningRun {
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

@optionalTypeArgs TResult maybeMap<TResult extends Object?>(TResult Function( _DunningRun value)?  $default,{required TResult orElse(),}){
final _that = this;
switch (_that) {
case _DunningRun() when $default != null:
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

@optionalTypeArgs TResult map<TResult extends Object?>(TResult Function( _DunningRun value)  $default,){
final _that = this;
switch (_that) {
case _DunningRun():
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

@optionalTypeArgs TResult? mapOrNull<TResult extends Object?>(TResult? Function( _DunningRun value)?  $default,){
final _that = this;
switch (_that) {
case _DunningRun() when $default != null:
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

@optionalTypeArgs TResult maybeWhen<TResult extends Object?>(TResult Function( String id,  String ruleId,  String ruleName,  int stepOrder,  DunningStepStatus status,  String runDate,  String scheduledAt,  String? executedAt,  int daysOverdue,  int balanceAmount,  NotificationChannel channel,  DunningRunInvoiceRef? invoice,  DunningRunTenantRef tenant,  String? notificationId,  String? messageLogId,  MessageStatus? messageStatus,  bool guarantorNotified,  bool penaltyApplied,  int penaltyAmount,  String? skipReason,  String? errorMessage)?  $default,{required TResult orElse(),}) {final _that = this;
switch (_that) {
case _DunningRun() when $default != null:
return $default(_that.id,_that.ruleId,_that.ruleName,_that.stepOrder,_that.status,_that.runDate,_that.scheduledAt,_that.executedAt,_that.daysOverdue,_that.balanceAmount,_that.channel,_that.invoice,_that.tenant,_that.notificationId,_that.messageLogId,_that.messageStatus,_that.guarantorNotified,_that.penaltyApplied,_that.penaltyAmount,_that.skipReason,_that.errorMessage);case _:
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

@optionalTypeArgs TResult when<TResult extends Object?>(TResult Function( String id,  String ruleId,  String ruleName,  int stepOrder,  DunningStepStatus status,  String runDate,  String scheduledAt,  String? executedAt,  int daysOverdue,  int balanceAmount,  NotificationChannel channel,  DunningRunInvoiceRef? invoice,  DunningRunTenantRef tenant,  String? notificationId,  String? messageLogId,  MessageStatus? messageStatus,  bool guarantorNotified,  bool penaltyApplied,  int penaltyAmount,  String? skipReason,  String? errorMessage)  $default,) {final _that = this;
switch (_that) {
case _DunningRun():
return $default(_that.id,_that.ruleId,_that.ruleName,_that.stepOrder,_that.status,_that.runDate,_that.scheduledAt,_that.executedAt,_that.daysOverdue,_that.balanceAmount,_that.channel,_that.invoice,_that.tenant,_that.notificationId,_that.messageLogId,_that.messageStatus,_that.guarantorNotified,_that.penaltyApplied,_that.penaltyAmount,_that.skipReason,_that.errorMessage);case _:
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

@optionalTypeArgs TResult? whenOrNull<TResult extends Object?>(TResult? Function( String id,  String ruleId,  String ruleName,  int stepOrder,  DunningStepStatus status,  String runDate,  String scheduledAt,  String? executedAt,  int daysOverdue,  int balanceAmount,  NotificationChannel channel,  DunningRunInvoiceRef? invoice,  DunningRunTenantRef tenant,  String? notificationId,  String? messageLogId,  MessageStatus? messageStatus,  bool guarantorNotified,  bool penaltyApplied,  int penaltyAmount,  String? skipReason,  String? errorMessage)?  $default,) {final _that = this;
switch (_that) {
case _DunningRun() when $default != null:
return $default(_that.id,_that.ruleId,_that.ruleName,_that.stepOrder,_that.status,_that.runDate,_that.scheduledAt,_that.executedAt,_that.daysOverdue,_that.balanceAmount,_that.channel,_that.invoice,_that.tenant,_that.notificationId,_that.messageLogId,_that.messageStatus,_that.guarantorNotified,_that.penaltyApplied,_that.penaltyAmount,_that.skipReason,_that.errorMessage);case _:
  return null;

}
}

}

/// @nodoc
@JsonSerializable()

class _DunningRun implements DunningRun {
  const _DunningRun({required this.id, required this.ruleId, required this.ruleName, required this.stepOrder, required this.status, required this.runDate, required this.scheduledAt, this.executedAt, this.daysOverdue = 0, this.balanceAmount = 0, required this.channel, this.invoice, required this.tenant, this.notificationId, this.messageLogId, this.messageStatus, this.guarantorNotified = false, this.penaltyApplied = false, this.penaltyAmount = 0, this.skipReason, this.errorMessage});
  factory _DunningRun.fromJson(Map<String, dynamic> json) => _$DunningRunFromJson(json);

@override final  String id;
@override final  String ruleId;
@override final  String ruleName;
@override final  int stepOrder;
@override final  DunningStepStatus status;
@override final  String runDate;
@override final  String scheduledAt;
@override final  String? executedAt;
@override@JsonKey() final  int daysOverdue;
@override@JsonKey() final  int balanceAmount;
@override final  NotificationChannel channel;
@override final  DunningRunInvoiceRef? invoice;
@override final  DunningRunTenantRef tenant;
@override final  String? notificationId;
@override final  String? messageLogId;
@override final  MessageStatus? messageStatus;
@override@JsonKey() final  bool guarantorNotified;
@override@JsonKey() final  bool penaltyApplied;
@override@JsonKey() final  int penaltyAmount;
@override final  String? skipReason;
@override final  String? errorMessage;

/// Create a copy of DunningRun
/// with the given fields replaced by the non-null parameter values.
@override @JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
_$DunningRunCopyWith<_DunningRun> get copyWith => __$DunningRunCopyWithImpl<_DunningRun>(this, _$identity);

@override
Map<String, dynamic> toJson() {
  return _$DunningRunToJson(this, );
}

@override
bool operator ==(Object other) {
  return identical(this, other) || (other.runtimeType == runtimeType&&other is _DunningRun&&(identical(other.id, id) || other.id == id)&&(identical(other.ruleId, ruleId) || other.ruleId == ruleId)&&(identical(other.ruleName, ruleName) || other.ruleName == ruleName)&&(identical(other.stepOrder, stepOrder) || other.stepOrder == stepOrder)&&(identical(other.status, status) || other.status == status)&&(identical(other.runDate, runDate) || other.runDate == runDate)&&(identical(other.scheduledAt, scheduledAt) || other.scheduledAt == scheduledAt)&&(identical(other.executedAt, executedAt) || other.executedAt == executedAt)&&(identical(other.daysOverdue, daysOverdue) || other.daysOverdue == daysOverdue)&&(identical(other.balanceAmount, balanceAmount) || other.balanceAmount == balanceAmount)&&(identical(other.channel, channel) || other.channel == channel)&&(identical(other.invoice, invoice) || other.invoice == invoice)&&(identical(other.tenant, tenant) || other.tenant == tenant)&&(identical(other.notificationId, notificationId) || other.notificationId == notificationId)&&(identical(other.messageLogId, messageLogId) || other.messageLogId == messageLogId)&&(identical(other.messageStatus, messageStatus) || other.messageStatus == messageStatus)&&(identical(other.guarantorNotified, guarantorNotified) || other.guarantorNotified == guarantorNotified)&&(identical(other.penaltyApplied, penaltyApplied) || other.penaltyApplied == penaltyApplied)&&(identical(other.penaltyAmount, penaltyAmount) || other.penaltyAmount == penaltyAmount)&&(identical(other.skipReason, skipReason) || other.skipReason == skipReason)&&(identical(other.errorMessage, errorMessage) || other.errorMessage == errorMessage));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode => Object.hashAll([runtimeType,id,ruleId,ruleName,stepOrder,status,runDate,scheduledAt,executedAt,daysOverdue,balanceAmount,channel,invoice,tenant,notificationId,messageLogId,messageStatus,guarantorNotified,penaltyApplied,penaltyAmount,skipReason,errorMessage]);

@override
String toString() {
  return 'DunningRun(id: $id, ruleId: $ruleId, ruleName: $ruleName, stepOrder: $stepOrder, status: $status, runDate: $runDate, scheduledAt: $scheduledAt, executedAt: $executedAt, daysOverdue: $daysOverdue, balanceAmount: $balanceAmount, channel: $channel, invoice: $invoice, tenant: $tenant, notificationId: $notificationId, messageLogId: $messageLogId, messageStatus: $messageStatus, guarantorNotified: $guarantorNotified, penaltyApplied: $penaltyApplied, penaltyAmount: $penaltyAmount, skipReason: $skipReason, errorMessage: $errorMessage)';
}


}

/// @nodoc
abstract mixin class _$DunningRunCopyWith<$Res> implements $DunningRunCopyWith<$Res> {
  factory _$DunningRunCopyWith(_DunningRun value, $Res Function(_DunningRun) _then) = __$DunningRunCopyWithImpl;
@override @useResult
$Res call({
 String id, String ruleId, String ruleName, int stepOrder, DunningStepStatus status, String runDate, String scheduledAt, String? executedAt, int daysOverdue, int balanceAmount, NotificationChannel channel, DunningRunInvoiceRef? invoice, DunningRunTenantRef tenant, String? notificationId, String? messageLogId, MessageStatus? messageStatus, bool guarantorNotified, bool penaltyApplied, int penaltyAmount, String? skipReason, String? errorMessage
});


@override $DunningRunInvoiceRefCopyWith<$Res>? get invoice;@override $DunningRunTenantRefCopyWith<$Res> get tenant;

}
/// @nodoc
class __$DunningRunCopyWithImpl<$Res>
    implements _$DunningRunCopyWith<$Res> {
  __$DunningRunCopyWithImpl(this._self, this._then);

  final _DunningRun _self;
  final $Res Function(_DunningRun) _then;

/// Create a copy of DunningRun
/// with the given fields replaced by the non-null parameter values.
@override @pragma('vm:prefer-inline') $Res call({Object? id = null,Object? ruleId = null,Object? ruleName = null,Object? stepOrder = null,Object? status = null,Object? runDate = null,Object? scheduledAt = null,Object? executedAt = freezed,Object? daysOverdue = null,Object? balanceAmount = null,Object? channel = null,Object? invoice = freezed,Object? tenant = null,Object? notificationId = freezed,Object? messageLogId = freezed,Object? messageStatus = freezed,Object? guarantorNotified = null,Object? penaltyApplied = null,Object? penaltyAmount = null,Object? skipReason = freezed,Object? errorMessage = freezed,}) {
  return _then(_DunningRun(
id: null == id ? _self.id : id // ignore: cast_nullable_to_non_nullable
as String,ruleId: null == ruleId ? _self.ruleId : ruleId // ignore: cast_nullable_to_non_nullable
as String,ruleName: null == ruleName ? _self.ruleName : ruleName // ignore: cast_nullable_to_non_nullable
as String,stepOrder: null == stepOrder ? _self.stepOrder : stepOrder // ignore: cast_nullable_to_non_nullable
as int,status: null == status ? _self.status : status // ignore: cast_nullable_to_non_nullable
as DunningStepStatus,runDate: null == runDate ? _self.runDate : runDate // ignore: cast_nullable_to_non_nullable
as String,scheduledAt: null == scheduledAt ? _self.scheduledAt : scheduledAt // ignore: cast_nullable_to_non_nullable
as String,executedAt: freezed == executedAt ? _self.executedAt : executedAt // ignore: cast_nullable_to_non_nullable
as String?,daysOverdue: null == daysOverdue ? _self.daysOverdue : daysOverdue // ignore: cast_nullable_to_non_nullable
as int,balanceAmount: null == balanceAmount ? _self.balanceAmount : balanceAmount // ignore: cast_nullable_to_non_nullable
as int,channel: null == channel ? _self.channel : channel // ignore: cast_nullable_to_non_nullable
as NotificationChannel,invoice: freezed == invoice ? _self.invoice : invoice // ignore: cast_nullable_to_non_nullable
as DunningRunInvoiceRef?,tenant: null == tenant ? _self.tenant : tenant // ignore: cast_nullable_to_non_nullable
as DunningRunTenantRef,notificationId: freezed == notificationId ? _self.notificationId : notificationId // ignore: cast_nullable_to_non_nullable
as String?,messageLogId: freezed == messageLogId ? _self.messageLogId : messageLogId // ignore: cast_nullable_to_non_nullable
as String?,messageStatus: freezed == messageStatus ? _self.messageStatus : messageStatus // ignore: cast_nullable_to_non_nullable
as MessageStatus?,guarantorNotified: null == guarantorNotified ? _self.guarantorNotified : guarantorNotified // ignore: cast_nullable_to_non_nullable
as bool,penaltyApplied: null == penaltyApplied ? _self.penaltyApplied : penaltyApplied // ignore: cast_nullable_to_non_nullable
as bool,penaltyAmount: null == penaltyAmount ? _self.penaltyAmount : penaltyAmount // ignore: cast_nullable_to_non_nullable
as int,skipReason: freezed == skipReason ? _self.skipReason : skipReason // ignore: cast_nullable_to_non_nullable
as String?,errorMessage: freezed == errorMessage ? _self.errorMessage : errorMessage // ignore: cast_nullable_to_non_nullable
as String?,
  ));
}

/// Create a copy of DunningRun
/// with the given fields replaced by the non-null parameter values.
@override
@pragma('vm:prefer-inline')
$DunningRunInvoiceRefCopyWith<$Res>? get invoice {
    if (_self.invoice == null) {
    return null;
  }

  return $DunningRunInvoiceRefCopyWith<$Res>(_self.invoice!, (value) {
    return _then(_self.copyWith(invoice: value));
  });
}/// Create a copy of DunningRun
/// with the given fields replaced by the non-null parameter values.
@override
@pragma('vm:prefer-inline')
$DunningRunTenantRefCopyWith<$Res> get tenant {
  
  return $DunningRunTenantRefCopyWith<$Res>(_self.tenant, (value) {
    return _then(_self.copyWith(tenant: value));
  });
}
}

// dart format on
