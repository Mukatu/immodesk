// GENERATED CODE - DO NOT MODIFY BY HAND
// coverage:ignore-file
// ignore_for_file: type=lint
// ignore_for_file: unused_element, deprecated_member_use, deprecated_member_use_from_same_package, use_function_type_syntax_for_parameters, unnecessary_const, avoid_init_to_null, invalid_override_different_default_values_named, prefer_expression_function_bodies, annotate_overrides, invalid_annotation_target, unnecessary_question_mark

part of 'maintenance_detail.dart';

// **************************************************************************
// FreezedGenerator
// **************************************************************************

// dart format off
T _$identity<T>(T value) => value;

/// @nodoc
mixin _$MaintenanceDetail {

 String get id; String get reference; MaintenanceStatus get status; MaintenancePriority get priority; String get title; MaintenancePropertyRef get property; MaintenanceUnitRef? get unit; String get reportedAt; String? get slaDueAt; bool get isOverdue; String? get assignedToUserId; int get ageHours; String get description; String? get locationDetail; String? get category; MaintenanceReporter get reporterType; int get estimatedAmount; int get actualAmount; String? get chargedTo; bool get landlordApproved; String? get inspectionId; String? get rejectionReason; List<MaintenanceUpdate> get updates;
/// Create a copy of MaintenanceDetail
/// with the given fields replaced by the non-null parameter values.
@JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
$MaintenanceDetailCopyWith<MaintenanceDetail> get copyWith => _$MaintenanceDetailCopyWithImpl<MaintenanceDetail>(this as MaintenanceDetail, _$identity);

  /// Serializes this MaintenanceDetail to a JSON map.
  Map<String, dynamic> toJson();


@override
bool operator ==(Object other) {
  return identical(this, other) || (other.runtimeType == runtimeType&&other is MaintenanceDetail&&(identical(other.id, id) || other.id == id)&&(identical(other.reference, reference) || other.reference == reference)&&(identical(other.status, status) || other.status == status)&&(identical(other.priority, priority) || other.priority == priority)&&(identical(other.title, title) || other.title == title)&&(identical(other.property, property) || other.property == property)&&(identical(other.unit, unit) || other.unit == unit)&&(identical(other.reportedAt, reportedAt) || other.reportedAt == reportedAt)&&(identical(other.slaDueAt, slaDueAt) || other.slaDueAt == slaDueAt)&&(identical(other.isOverdue, isOverdue) || other.isOverdue == isOverdue)&&(identical(other.assignedToUserId, assignedToUserId) || other.assignedToUserId == assignedToUserId)&&(identical(other.ageHours, ageHours) || other.ageHours == ageHours)&&(identical(other.description, description) || other.description == description)&&(identical(other.locationDetail, locationDetail) || other.locationDetail == locationDetail)&&(identical(other.category, category) || other.category == category)&&(identical(other.reporterType, reporterType) || other.reporterType == reporterType)&&(identical(other.estimatedAmount, estimatedAmount) || other.estimatedAmount == estimatedAmount)&&(identical(other.actualAmount, actualAmount) || other.actualAmount == actualAmount)&&(identical(other.chargedTo, chargedTo) || other.chargedTo == chargedTo)&&(identical(other.landlordApproved, landlordApproved) || other.landlordApproved == landlordApproved)&&(identical(other.inspectionId, inspectionId) || other.inspectionId == inspectionId)&&(identical(other.rejectionReason, rejectionReason) || other.rejectionReason == rejectionReason)&&const DeepCollectionEquality().equals(other.updates, updates));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode => Object.hashAll([runtimeType,id,reference,status,priority,title,property,unit,reportedAt,slaDueAt,isOverdue,assignedToUserId,ageHours,description,locationDetail,category,reporterType,estimatedAmount,actualAmount,chargedTo,landlordApproved,inspectionId,rejectionReason,const DeepCollectionEquality().hash(updates)]);

@override
String toString() {
  return 'MaintenanceDetail(id: $id, reference: $reference, status: $status, priority: $priority, title: $title, property: $property, unit: $unit, reportedAt: $reportedAt, slaDueAt: $slaDueAt, isOverdue: $isOverdue, assignedToUserId: $assignedToUserId, ageHours: $ageHours, description: $description, locationDetail: $locationDetail, category: $category, reporterType: $reporterType, estimatedAmount: $estimatedAmount, actualAmount: $actualAmount, chargedTo: $chargedTo, landlordApproved: $landlordApproved, inspectionId: $inspectionId, rejectionReason: $rejectionReason, updates: $updates)';
}


}

/// @nodoc
abstract mixin class $MaintenanceDetailCopyWith<$Res>  {
  factory $MaintenanceDetailCopyWith(MaintenanceDetail value, $Res Function(MaintenanceDetail) _then) = _$MaintenanceDetailCopyWithImpl;
@useResult
$Res call({
 String id, String reference, MaintenanceStatus status, MaintenancePriority priority, String title, MaintenancePropertyRef property, MaintenanceUnitRef? unit, String reportedAt, String? slaDueAt, bool isOverdue, String? assignedToUserId, int ageHours, String description, String? locationDetail, String? category, MaintenanceReporter reporterType, int estimatedAmount, int actualAmount, String? chargedTo, bool landlordApproved, String? inspectionId, String? rejectionReason, List<MaintenanceUpdate> updates
});


$MaintenancePropertyRefCopyWith<$Res> get property;$MaintenanceUnitRefCopyWith<$Res>? get unit;

}
/// @nodoc
class _$MaintenanceDetailCopyWithImpl<$Res>
    implements $MaintenanceDetailCopyWith<$Res> {
  _$MaintenanceDetailCopyWithImpl(this._self, this._then);

  final MaintenanceDetail _self;
  final $Res Function(MaintenanceDetail) _then;

/// Create a copy of MaintenanceDetail
/// with the given fields replaced by the non-null parameter values.
@pragma('vm:prefer-inline') @override $Res call({Object? id = null,Object? reference = null,Object? status = null,Object? priority = null,Object? title = null,Object? property = null,Object? unit = freezed,Object? reportedAt = null,Object? slaDueAt = freezed,Object? isOverdue = null,Object? assignedToUserId = freezed,Object? ageHours = null,Object? description = null,Object? locationDetail = freezed,Object? category = freezed,Object? reporterType = null,Object? estimatedAmount = null,Object? actualAmount = null,Object? chargedTo = freezed,Object? landlordApproved = null,Object? inspectionId = freezed,Object? rejectionReason = freezed,Object? updates = null,}) {
  return _then(_self.copyWith(
id: null == id ? _self.id : id // ignore: cast_nullable_to_non_nullable
as String,reference: null == reference ? _self.reference : reference // ignore: cast_nullable_to_non_nullable
as String,status: null == status ? _self.status : status // ignore: cast_nullable_to_non_nullable
as MaintenanceStatus,priority: null == priority ? _self.priority : priority // ignore: cast_nullable_to_non_nullable
as MaintenancePriority,title: null == title ? _self.title : title // ignore: cast_nullable_to_non_nullable
as String,property: null == property ? _self.property : property // ignore: cast_nullable_to_non_nullable
as MaintenancePropertyRef,unit: freezed == unit ? _self.unit : unit // ignore: cast_nullable_to_non_nullable
as MaintenanceUnitRef?,reportedAt: null == reportedAt ? _self.reportedAt : reportedAt // ignore: cast_nullable_to_non_nullable
as String,slaDueAt: freezed == slaDueAt ? _self.slaDueAt : slaDueAt // ignore: cast_nullable_to_non_nullable
as String?,isOverdue: null == isOverdue ? _self.isOverdue : isOverdue // ignore: cast_nullable_to_non_nullable
as bool,assignedToUserId: freezed == assignedToUserId ? _self.assignedToUserId : assignedToUserId // ignore: cast_nullable_to_non_nullable
as String?,ageHours: null == ageHours ? _self.ageHours : ageHours // ignore: cast_nullable_to_non_nullable
as int,description: null == description ? _self.description : description // ignore: cast_nullable_to_non_nullable
as String,locationDetail: freezed == locationDetail ? _self.locationDetail : locationDetail // ignore: cast_nullable_to_non_nullable
as String?,category: freezed == category ? _self.category : category // ignore: cast_nullable_to_non_nullable
as String?,reporterType: null == reporterType ? _self.reporterType : reporterType // ignore: cast_nullable_to_non_nullable
as MaintenanceReporter,estimatedAmount: null == estimatedAmount ? _self.estimatedAmount : estimatedAmount // ignore: cast_nullable_to_non_nullable
as int,actualAmount: null == actualAmount ? _self.actualAmount : actualAmount // ignore: cast_nullable_to_non_nullable
as int,chargedTo: freezed == chargedTo ? _self.chargedTo : chargedTo // ignore: cast_nullable_to_non_nullable
as String?,landlordApproved: null == landlordApproved ? _self.landlordApproved : landlordApproved // ignore: cast_nullable_to_non_nullable
as bool,inspectionId: freezed == inspectionId ? _self.inspectionId : inspectionId // ignore: cast_nullable_to_non_nullable
as String?,rejectionReason: freezed == rejectionReason ? _self.rejectionReason : rejectionReason // ignore: cast_nullable_to_non_nullable
as String?,updates: null == updates ? _self.updates : updates // ignore: cast_nullable_to_non_nullable
as List<MaintenanceUpdate>,
  ));
}
/// Create a copy of MaintenanceDetail
/// with the given fields replaced by the non-null parameter values.
@override
@pragma('vm:prefer-inline')
$MaintenancePropertyRefCopyWith<$Res> get property {
  
  return $MaintenancePropertyRefCopyWith<$Res>(_self.property, (value) {
    return _then(_self.copyWith(property: value));
  });
}/// Create a copy of MaintenanceDetail
/// with the given fields replaced by the non-null parameter values.
@override
@pragma('vm:prefer-inline')
$MaintenanceUnitRefCopyWith<$Res>? get unit {
    if (_self.unit == null) {
    return null;
  }

  return $MaintenanceUnitRefCopyWith<$Res>(_self.unit!, (value) {
    return _then(_self.copyWith(unit: value));
  });
}
}


/// Adds pattern-matching-related methods to [MaintenanceDetail].
extension MaintenanceDetailPatterns on MaintenanceDetail {
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

@optionalTypeArgs TResult maybeMap<TResult extends Object?>(TResult Function( _MaintenanceDetail value)?  $default,{required TResult orElse(),}){
final _that = this;
switch (_that) {
case _MaintenanceDetail() when $default != null:
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

@optionalTypeArgs TResult map<TResult extends Object?>(TResult Function( _MaintenanceDetail value)  $default,){
final _that = this;
switch (_that) {
case _MaintenanceDetail():
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

@optionalTypeArgs TResult? mapOrNull<TResult extends Object?>(TResult? Function( _MaintenanceDetail value)?  $default,){
final _that = this;
switch (_that) {
case _MaintenanceDetail() when $default != null:
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

@optionalTypeArgs TResult maybeWhen<TResult extends Object?>(TResult Function( String id,  String reference,  MaintenanceStatus status,  MaintenancePriority priority,  String title,  MaintenancePropertyRef property,  MaintenanceUnitRef? unit,  String reportedAt,  String? slaDueAt,  bool isOverdue,  String? assignedToUserId,  int ageHours,  String description,  String? locationDetail,  String? category,  MaintenanceReporter reporterType,  int estimatedAmount,  int actualAmount,  String? chargedTo,  bool landlordApproved,  String? inspectionId,  String? rejectionReason,  List<MaintenanceUpdate> updates)?  $default,{required TResult orElse(),}) {final _that = this;
switch (_that) {
case _MaintenanceDetail() when $default != null:
return $default(_that.id,_that.reference,_that.status,_that.priority,_that.title,_that.property,_that.unit,_that.reportedAt,_that.slaDueAt,_that.isOverdue,_that.assignedToUserId,_that.ageHours,_that.description,_that.locationDetail,_that.category,_that.reporterType,_that.estimatedAmount,_that.actualAmount,_that.chargedTo,_that.landlordApproved,_that.inspectionId,_that.rejectionReason,_that.updates);case _:
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

@optionalTypeArgs TResult when<TResult extends Object?>(TResult Function( String id,  String reference,  MaintenanceStatus status,  MaintenancePriority priority,  String title,  MaintenancePropertyRef property,  MaintenanceUnitRef? unit,  String reportedAt,  String? slaDueAt,  bool isOverdue,  String? assignedToUserId,  int ageHours,  String description,  String? locationDetail,  String? category,  MaintenanceReporter reporterType,  int estimatedAmount,  int actualAmount,  String? chargedTo,  bool landlordApproved,  String? inspectionId,  String? rejectionReason,  List<MaintenanceUpdate> updates)  $default,) {final _that = this;
switch (_that) {
case _MaintenanceDetail():
return $default(_that.id,_that.reference,_that.status,_that.priority,_that.title,_that.property,_that.unit,_that.reportedAt,_that.slaDueAt,_that.isOverdue,_that.assignedToUserId,_that.ageHours,_that.description,_that.locationDetail,_that.category,_that.reporterType,_that.estimatedAmount,_that.actualAmount,_that.chargedTo,_that.landlordApproved,_that.inspectionId,_that.rejectionReason,_that.updates);case _:
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

@optionalTypeArgs TResult? whenOrNull<TResult extends Object?>(TResult? Function( String id,  String reference,  MaintenanceStatus status,  MaintenancePriority priority,  String title,  MaintenancePropertyRef property,  MaintenanceUnitRef? unit,  String reportedAt,  String? slaDueAt,  bool isOverdue,  String? assignedToUserId,  int ageHours,  String description,  String? locationDetail,  String? category,  MaintenanceReporter reporterType,  int estimatedAmount,  int actualAmount,  String? chargedTo,  bool landlordApproved,  String? inspectionId,  String? rejectionReason,  List<MaintenanceUpdate> updates)?  $default,) {final _that = this;
switch (_that) {
case _MaintenanceDetail() when $default != null:
return $default(_that.id,_that.reference,_that.status,_that.priority,_that.title,_that.property,_that.unit,_that.reportedAt,_that.slaDueAt,_that.isOverdue,_that.assignedToUserId,_that.ageHours,_that.description,_that.locationDetail,_that.category,_that.reporterType,_that.estimatedAmount,_that.actualAmount,_that.chargedTo,_that.landlordApproved,_that.inspectionId,_that.rejectionReason,_that.updates);case _:
  return null;

}
}

}

/// @nodoc
@JsonSerializable()

class _MaintenanceDetail implements MaintenanceDetail {
  const _MaintenanceDetail({required this.id, required this.reference, required this.status, required this.priority, required this.title, required this.property, this.unit, required this.reportedAt, this.slaDueAt, this.isOverdue = false, this.assignedToUserId, this.ageHours = 0, required this.description, this.locationDetail, this.category, required this.reporterType, this.estimatedAmount = 0, this.actualAmount = 0, this.chargedTo, this.landlordApproved = false, this.inspectionId, this.rejectionReason, final  List<MaintenanceUpdate> updates = const []}): _updates = updates;
  factory _MaintenanceDetail.fromJson(Map<String, dynamic> json) => _$MaintenanceDetailFromJson(json);

@override final  String id;
@override final  String reference;
@override final  MaintenanceStatus status;
@override final  MaintenancePriority priority;
@override final  String title;
@override final  MaintenancePropertyRef property;
@override final  MaintenanceUnitRef? unit;
@override final  String reportedAt;
@override final  String? slaDueAt;
@override@JsonKey() final  bool isOverdue;
@override final  String? assignedToUserId;
@override@JsonKey() final  int ageHours;
@override final  String description;
@override final  String? locationDetail;
@override final  String? category;
@override final  MaintenanceReporter reporterType;
@override@JsonKey() final  int estimatedAmount;
@override@JsonKey() final  int actualAmount;
@override final  String? chargedTo;
@override@JsonKey() final  bool landlordApproved;
@override final  String? inspectionId;
@override final  String? rejectionReason;
 final  List<MaintenanceUpdate> _updates;
@override@JsonKey() List<MaintenanceUpdate> get updates {
  if (_updates is EqualUnmodifiableListView) return _updates;
  // ignore: implicit_dynamic_type
  return EqualUnmodifiableListView(_updates);
}


/// Create a copy of MaintenanceDetail
/// with the given fields replaced by the non-null parameter values.
@override @JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
_$MaintenanceDetailCopyWith<_MaintenanceDetail> get copyWith => __$MaintenanceDetailCopyWithImpl<_MaintenanceDetail>(this, _$identity);

@override
Map<String, dynamic> toJson() {
  return _$MaintenanceDetailToJson(this, );
}

@override
bool operator ==(Object other) {
  return identical(this, other) || (other.runtimeType == runtimeType&&other is _MaintenanceDetail&&(identical(other.id, id) || other.id == id)&&(identical(other.reference, reference) || other.reference == reference)&&(identical(other.status, status) || other.status == status)&&(identical(other.priority, priority) || other.priority == priority)&&(identical(other.title, title) || other.title == title)&&(identical(other.property, property) || other.property == property)&&(identical(other.unit, unit) || other.unit == unit)&&(identical(other.reportedAt, reportedAt) || other.reportedAt == reportedAt)&&(identical(other.slaDueAt, slaDueAt) || other.slaDueAt == slaDueAt)&&(identical(other.isOverdue, isOverdue) || other.isOverdue == isOverdue)&&(identical(other.assignedToUserId, assignedToUserId) || other.assignedToUserId == assignedToUserId)&&(identical(other.ageHours, ageHours) || other.ageHours == ageHours)&&(identical(other.description, description) || other.description == description)&&(identical(other.locationDetail, locationDetail) || other.locationDetail == locationDetail)&&(identical(other.category, category) || other.category == category)&&(identical(other.reporterType, reporterType) || other.reporterType == reporterType)&&(identical(other.estimatedAmount, estimatedAmount) || other.estimatedAmount == estimatedAmount)&&(identical(other.actualAmount, actualAmount) || other.actualAmount == actualAmount)&&(identical(other.chargedTo, chargedTo) || other.chargedTo == chargedTo)&&(identical(other.landlordApproved, landlordApproved) || other.landlordApproved == landlordApproved)&&(identical(other.inspectionId, inspectionId) || other.inspectionId == inspectionId)&&(identical(other.rejectionReason, rejectionReason) || other.rejectionReason == rejectionReason)&&const DeepCollectionEquality().equals(other._updates, _updates));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode => Object.hashAll([runtimeType,id,reference,status,priority,title,property,unit,reportedAt,slaDueAt,isOverdue,assignedToUserId,ageHours,description,locationDetail,category,reporterType,estimatedAmount,actualAmount,chargedTo,landlordApproved,inspectionId,rejectionReason,const DeepCollectionEquality().hash(_updates)]);

@override
String toString() {
  return 'MaintenanceDetail(id: $id, reference: $reference, status: $status, priority: $priority, title: $title, property: $property, unit: $unit, reportedAt: $reportedAt, slaDueAt: $slaDueAt, isOverdue: $isOverdue, assignedToUserId: $assignedToUserId, ageHours: $ageHours, description: $description, locationDetail: $locationDetail, category: $category, reporterType: $reporterType, estimatedAmount: $estimatedAmount, actualAmount: $actualAmount, chargedTo: $chargedTo, landlordApproved: $landlordApproved, inspectionId: $inspectionId, rejectionReason: $rejectionReason, updates: $updates)';
}


}

/// @nodoc
abstract mixin class _$MaintenanceDetailCopyWith<$Res> implements $MaintenanceDetailCopyWith<$Res> {
  factory _$MaintenanceDetailCopyWith(_MaintenanceDetail value, $Res Function(_MaintenanceDetail) _then) = __$MaintenanceDetailCopyWithImpl;
@override @useResult
$Res call({
 String id, String reference, MaintenanceStatus status, MaintenancePriority priority, String title, MaintenancePropertyRef property, MaintenanceUnitRef? unit, String reportedAt, String? slaDueAt, bool isOverdue, String? assignedToUserId, int ageHours, String description, String? locationDetail, String? category, MaintenanceReporter reporterType, int estimatedAmount, int actualAmount, String? chargedTo, bool landlordApproved, String? inspectionId, String? rejectionReason, List<MaintenanceUpdate> updates
});


@override $MaintenancePropertyRefCopyWith<$Res> get property;@override $MaintenanceUnitRefCopyWith<$Res>? get unit;

}
/// @nodoc
class __$MaintenanceDetailCopyWithImpl<$Res>
    implements _$MaintenanceDetailCopyWith<$Res> {
  __$MaintenanceDetailCopyWithImpl(this._self, this._then);

  final _MaintenanceDetail _self;
  final $Res Function(_MaintenanceDetail) _then;

/// Create a copy of MaintenanceDetail
/// with the given fields replaced by the non-null parameter values.
@override @pragma('vm:prefer-inline') $Res call({Object? id = null,Object? reference = null,Object? status = null,Object? priority = null,Object? title = null,Object? property = null,Object? unit = freezed,Object? reportedAt = null,Object? slaDueAt = freezed,Object? isOverdue = null,Object? assignedToUserId = freezed,Object? ageHours = null,Object? description = null,Object? locationDetail = freezed,Object? category = freezed,Object? reporterType = null,Object? estimatedAmount = null,Object? actualAmount = null,Object? chargedTo = freezed,Object? landlordApproved = null,Object? inspectionId = freezed,Object? rejectionReason = freezed,Object? updates = null,}) {
  return _then(_MaintenanceDetail(
id: null == id ? _self.id : id // ignore: cast_nullable_to_non_nullable
as String,reference: null == reference ? _self.reference : reference // ignore: cast_nullable_to_non_nullable
as String,status: null == status ? _self.status : status // ignore: cast_nullable_to_non_nullable
as MaintenanceStatus,priority: null == priority ? _self.priority : priority // ignore: cast_nullable_to_non_nullable
as MaintenancePriority,title: null == title ? _self.title : title // ignore: cast_nullable_to_non_nullable
as String,property: null == property ? _self.property : property // ignore: cast_nullable_to_non_nullable
as MaintenancePropertyRef,unit: freezed == unit ? _self.unit : unit // ignore: cast_nullable_to_non_nullable
as MaintenanceUnitRef?,reportedAt: null == reportedAt ? _self.reportedAt : reportedAt // ignore: cast_nullable_to_non_nullable
as String,slaDueAt: freezed == slaDueAt ? _self.slaDueAt : slaDueAt // ignore: cast_nullable_to_non_nullable
as String?,isOverdue: null == isOverdue ? _self.isOverdue : isOverdue // ignore: cast_nullable_to_non_nullable
as bool,assignedToUserId: freezed == assignedToUserId ? _self.assignedToUserId : assignedToUserId // ignore: cast_nullable_to_non_nullable
as String?,ageHours: null == ageHours ? _self.ageHours : ageHours // ignore: cast_nullable_to_non_nullable
as int,description: null == description ? _self.description : description // ignore: cast_nullable_to_non_nullable
as String,locationDetail: freezed == locationDetail ? _self.locationDetail : locationDetail // ignore: cast_nullable_to_non_nullable
as String?,category: freezed == category ? _self.category : category // ignore: cast_nullable_to_non_nullable
as String?,reporterType: null == reporterType ? _self.reporterType : reporterType // ignore: cast_nullable_to_non_nullable
as MaintenanceReporter,estimatedAmount: null == estimatedAmount ? _self.estimatedAmount : estimatedAmount // ignore: cast_nullable_to_non_nullable
as int,actualAmount: null == actualAmount ? _self.actualAmount : actualAmount // ignore: cast_nullable_to_non_nullable
as int,chargedTo: freezed == chargedTo ? _self.chargedTo : chargedTo // ignore: cast_nullable_to_non_nullable
as String?,landlordApproved: null == landlordApproved ? _self.landlordApproved : landlordApproved // ignore: cast_nullable_to_non_nullable
as bool,inspectionId: freezed == inspectionId ? _self.inspectionId : inspectionId // ignore: cast_nullable_to_non_nullable
as String?,rejectionReason: freezed == rejectionReason ? _self.rejectionReason : rejectionReason // ignore: cast_nullable_to_non_nullable
as String?,updates: null == updates ? _self._updates : updates // ignore: cast_nullable_to_non_nullable
as List<MaintenanceUpdate>,
  ));
}

/// Create a copy of MaintenanceDetail
/// with the given fields replaced by the non-null parameter values.
@override
@pragma('vm:prefer-inline')
$MaintenancePropertyRefCopyWith<$Res> get property {
  
  return $MaintenancePropertyRefCopyWith<$Res>(_self.property, (value) {
    return _then(_self.copyWith(property: value));
  });
}/// Create a copy of MaintenanceDetail
/// with the given fields replaced by the non-null parameter values.
@override
@pragma('vm:prefer-inline')
$MaintenanceUnitRefCopyWith<$Res>? get unit {
    if (_self.unit == null) {
    return null;
  }

  return $MaintenanceUnitRefCopyWith<$Res>(_self.unit!, (value) {
    return _then(_self.copyWith(unit: value));
  });
}
}

// dart format on
