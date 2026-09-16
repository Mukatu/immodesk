// GENERATED CODE - DO NOT MODIFY BY HAND
// coverage:ignore-file
// ignore_for_file: type=lint
// ignore_for_file: unused_element, deprecated_member_use, deprecated_member_use_from_same_package, use_function_type_syntax_for_parameters, unnecessary_const, avoid_init_to_null, invalid_override_different_default_values_named, prefer_expression_function_bodies, annotate_overrides, invalid_annotation_target, unnecessary_question_mark

part of 'maintenance_summary.dart';

// **************************************************************************
// FreezedGenerator
// **************************************************************************

// dart format off
T _$identity<T>(T value) => value;

/// @nodoc
mixin _$MaintenancePropertyRef {

 String get id; String get name;
/// Create a copy of MaintenancePropertyRef
/// with the given fields replaced by the non-null parameter values.
@JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
$MaintenancePropertyRefCopyWith<MaintenancePropertyRef> get copyWith => _$MaintenancePropertyRefCopyWithImpl<MaintenancePropertyRef>(this as MaintenancePropertyRef, _$identity);

  /// Serializes this MaintenancePropertyRef to a JSON map.
  Map<String, dynamic> toJson();


@override
bool operator ==(Object other) {
  return identical(this, other) || (other.runtimeType == runtimeType&&other is MaintenancePropertyRef&&(identical(other.id, id) || other.id == id)&&(identical(other.name, name) || other.name == name));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode => Object.hash(runtimeType,id,name);

@override
String toString() {
  return 'MaintenancePropertyRef(id: $id, name: $name)';
}


}

/// @nodoc
abstract mixin class $MaintenancePropertyRefCopyWith<$Res>  {
  factory $MaintenancePropertyRefCopyWith(MaintenancePropertyRef value, $Res Function(MaintenancePropertyRef) _then) = _$MaintenancePropertyRefCopyWithImpl;
@useResult
$Res call({
 String id, String name
});




}
/// @nodoc
class _$MaintenancePropertyRefCopyWithImpl<$Res>
    implements $MaintenancePropertyRefCopyWith<$Res> {
  _$MaintenancePropertyRefCopyWithImpl(this._self, this._then);

  final MaintenancePropertyRef _self;
  final $Res Function(MaintenancePropertyRef) _then;

/// Create a copy of MaintenancePropertyRef
/// with the given fields replaced by the non-null parameter values.
@pragma('vm:prefer-inline') @override $Res call({Object? id = null,Object? name = null,}) {
  return _then(_self.copyWith(
id: null == id ? _self.id : id // ignore: cast_nullable_to_non_nullable
as String,name: null == name ? _self.name : name // ignore: cast_nullable_to_non_nullable
as String,
  ));
}

}


/// Adds pattern-matching-related methods to [MaintenancePropertyRef].
extension MaintenancePropertyRefPatterns on MaintenancePropertyRef {
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

@optionalTypeArgs TResult maybeMap<TResult extends Object?>(TResult Function( _MaintenancePropertyRef value)?  $default,{required TResult orElse(),}){
final _that = this;
switch (_that) {
case _MaintenancePropertyRef() when $default != null:
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

@optionalTypeArgs TResult map<TResult extends Object?>(TResult Function( _MaintenancePropertyRef value)  $default,){
final _that = this;
switch (_that) {
case _MaintenancePropertyRef():
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

@optionalTypeArgs TResult? mapOrNull<TResult extends Object?>(TResult? Function( _MaintenancePropertyRef value)?  $default,){
final _that = this;
switch (_that) {
case _MaintenancePropertyRef() when $default != null:
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

@optionalTypeArgs TResult maybeWhen<TResult extends Object?>(TResult Function( String id,  String name)?  $default,{required TResult orElse(),}) {final _that = this;
switch (_that) {
case _MaintenancePropertyRef() when $default != null:
return $default(_that.id,_that.name);case _:
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

@optionalTypeArgs TResult when<TResult extends Object?>(TResult Function( String id,  String name)  $default,) {final _that = this;
switch (_that) {
case _MaintenancePropertyRef():
return $default(_that.id,_that.name);case _:
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

@optionalTypeArgs TResult? whenOrNull<TResult extends Object?>(TResult? Function( String id,  String name)?  $default,) {final _that = this;
switch (_that) {
case _MaintenancePropertyRef() when $default != null:
return $default(_that.id,_that.name);case _:
  return null;

}
}

}

/// @nodoc
@JsonSerializable()

class _MaintenancePropertyRef implements MaintenancePropertyRef {
  const _MaintenancePropertyRef({required this.id, required this.name});
  factory _MaintenancePropertyRef.fromJson(Map<String, dynamic> json) => _$MaintenancePropertyRefFromJson(json);

@override final  String id;
@override final  String name;

/// Create a copy of MaintenancePropertyRef
/// with the given fields replaced by the non-null parameter values.
@override @JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
_$MaintenancePropertyRefCopyWith<_MaintenancePropertyRef> get copyWith => __$MaintenancePropertyRefCopyWithImpl<_MaintenancePropertyRef>(this, _$identity);

@override
Map<String, dynamic> toJson() {
  return _$MaintenancePropertyRefToJson(this, );
}

@override
bool operator ==(Object other) {
  return identical(this, other) || (other.runtimeType == runtimeType&&other is _MaintenancePropertyRef&&(identical(other.id, id) || other.id == id)&&(identical(other.name, name) || other.name == name));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode => Object.hash(runtimeType,id,name);

@override
String toString() {
  return 'MaintenancePropertyRef(id: $id, name: $name)';
}


}

/// @nodoc
abstract mixin class _$MaintenancePropertyRefCopyWith<$Res> implements $MaintenancePropertyRefCopyWith<$Res> {
  factory _$MaintenancePropertyRefCopyWith(_MaintenancePropertyRef value, $Res Function(_MaintenancePropertyRef) _then) = __$MaintenancePropertyRefCopyWithImpl;
@override @useResult
$Res call({
 String id, String name
});




}
/// @nodoc
class __$MaintenancePropertyRefCopyWithImpl<$Res>
    implements _$MaintenancePropertyRefCopyWith<$Res> {
  __$MaintenancePropertyRefCopyWithImpl(this._self, this._then);

  final _MaintenancePropertyRef _self;
  final $Res Function(_MaintenancePropertyRef) _then;

/// Create a copy of MaintenancePropertyRef
/// with the given fields replaced by the non-null parameter values.
@override @pragma('vm:prefer-inline') $Res call({Object? id = null,Object? name = null,}) {
  return _then(_MaintenancePropertyRef(
id: null == id ? _self.id : id // ignore: cast_nullable_to_non_nullable
as String,name: null == name ? _self.name : name // ignore: cast_nullable_to_non_nullable
as String,
  ));
}


}


/// @nodoc
mixin _$MaintenanceUnitRef {

 String get id; String get code;
/// Create a copy of MaintenanceUnitRef
/// with the given fields replaced by the non-null parameter values.
@JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
$MaintenanceUnitRefCopyWith<MaintenanceUnitRef> get copyWith => _$MaintenanceUnitRefCopyWithImpl<MaintenanceUnitRef>(this as MaintenanceUnitRef, _$identity);

  /// Serializes this MaintenanceUnitRef to a JSON map.
  Map<String, dynamic> toJson();


@override
bool operator ==(Object other) {
  return identical(this, other) || (other.runtimeType == runtimeType&&other is MaintenanceUnitRef&&(identical(other.id, id) || other.id == id)&&(identical(other.code, code) || other.code == code));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode => Object.hash(runtimeType,id,code);

@override
String toString() {
  return 'MaintenanceUnitRef(id: $id, code: $code)';
}


}

/// @nodoc
abstract mixin class $MaintenanceUnitRefCopyWith<$Res>  {
  factory $MaintenanceUnitRefCopyWith(MaintenanceUnitRef value, $Res Function(MaintenanceUnitRef) _then) = _$MaintenanceUnitRefCopyWithImpl;
@useResult
$Res call({
 String id, String code
});




}
/// @nodoc
class _$MaintenanceUnitRefCopyWithImpl<$Res>
    implements $MaintenanceUnitRefCopyWith<$Res> {
  _$MaintenanceUnitRefCopyWithImpl(this._self, this._then);

  final MaintenanceUnitRef _self;
  final $Res Function(MaintenanceUnitRef) _then;

/// Create a copy of MaintenanceUnitRef
/// with the given fields replaced by the non-null parameter values.
@pragma('vm:prefer-inline') @override $Res call({Object? id = null,Object? code = null,}) {
  return _then(_self.copyWith(
id: null == id ? _self.id : id // ignore: cast_nullable_to_non_nullable
as String,code: null == code ? _self.code : code // ignore: cast_nullable_to_non_nullable
as String,
  ));
}

}


/// Adds pattern-matching-related methods to [MaintenanceUnitRef].
extension MaintenanceUnitRefPatterns on MaintenanceUnitRef {
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

@optionalTypeArgs TResult maybeMap<TResult extends Object?>(TResult Function( _MaintenanceUnitRef value)?  $default,{required TResult orElse(),}){
final _that = this;
switch (_that) {
case _MaintenanceUnitRef() when $default != null:
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

@optionalTypeArgs TResult map<TResult extends Object?>(TResult Function( _MaintenanceUnitRef value)  $default,){
final _that = this;
switch (_that) {
case _MaintenanceUnitRef():
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

@optionalTypeArgs TResult? mapOrNull<TResult extends Object?>(TResult? Function( _MaintenanceUnitRef value)?  $default,){
final _that = this;
switch (_that) {
case _MaintenanceUnitRef() when $default != null:
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

@optionalTypeArgs TResult maybeWhen<TResult extends Object?>(TResult Function( String id,  String code)?  $default,{required TResult orElse(),}) {final _that = this;
switch (_that) {
case _MaintenanceUnitRef() when $default != null:
return $default(_that.id,_that.code);case _:
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

@optionalTypeArgs TResult when<TResult extends Object?>(TResult Function( String id,  String code)  $default,) {final _that = this;
switch (_that) {
case _MaintenanceUnitRef():
return $default(_that.id,_that.code);case _:
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

@optionalTypeArgs TResult? whenOrNull<TResult extends Object?>(TResult? Function( String id,  String code)?  $default,) {final _that = this;
switch (_that) {
case _MaintenanceUnitRef() when $default != null:
return $default(_that.id,_that.code);case _:
  return null;

}
}

}

/// @nodoc
@JsonSerializable()

class _MaintenanceUnitRef implements MaintenanceUnitRef {
  const _MaintenanceUnitRef({required this.id, required this.code});
  factory _MaintenanceUnitRef.fromJson(Map<String, dynamic> json) => _$MaintenanceUnitRefFromJson(json);

@override final  String id;
@override final  String code;

/// Create a copy of MaintenanceUnitRef
/// with the given fields replaced by the non-null parameter values.
@override @JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
_$MaintenanceUnitRefCopyWith<_MaintenanceUnitRef> get copyWith => __$MaintenanceUnitRefCopyWithImpl<_MaintenanceUnitRef>(this, _$identity);

@override
Map<String, dynamic> toJson() {
  return _$MaintenanceUnitRefToJson(this, );
}

@override
bool operator ==(Object other) {
  return identical(this, other) || (other.runtimeType == runtimeType&&other is _MaintenanceUnitRef&&(identical(other.id, id) || other.id == id)&&(identical(other.code, code) || other.code == code));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode => Object.hash(runtimeType,id,code);

@override
String toString() {
  return 'MaintenanceUnitRef(id: $id, code: $code)';
}


}

/// @nodoc
abstract mixin class _$MaintenanceUnitRefCopyWith<$Res> implements $MaintenanceUnitRefCopyWith<$Res> {
  factory _$MaintenanceUnitRefCopyWith(_MaintenanceUnitRef value, $Res Function(_MaintenanceUnitRef) _then) = __$MaintenanceUnitRefCopyWithImpl;
@override @useResult
$Res call({
 String id, String code
});




}
/// @nodoc
class __$MaintenanceUnitRefCopyWithImpl<$Res>
    implements _$MaintenanceUnitRefCopyWith<$Res> {
  __$MaintenanceUnitRefCopyWithImpl(this._self, this._then);

  final _MaintenanceUnitRef _self;
  final $Res Function(_MaintenanceUnitRef) _then;

/// Create a copy of MaintenanceUnitRef
/// with the given fields replaced by the non-null parameter values.
@override @pragma('vm:prefer-inline') $Res call({Object? id = null,Object? code = null,}) {
  return _then(_MaintenanceUnitRef(
id: null == id ? _self.id : id // ignore: cast_nullable_to_non_nullable
as String,code: null == code ? _self.code : code // ignore: cast_nullable_to_non_nullable
as String,
  ));
}


}


/// @nodoc
mixin _$MaintenanceSummary {

 String get id; String get reference; MaintenanceStatus get status; MaintenancePriority get priority; String get title; MaintenancePropertyRef get property; MaintenanceUnitRef? get unit; String get reportedAt; String? get slaDueAt; bool get isOverdue; String? get assignedToUserId; int get ageHours;
/// Create a copy of MaintenanceSummary
/// with the given fields replaced by the non-null parameter values.
@JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
$MaintenanceSummaryCopyWith<MaintenanceSummary> get copyWith => _$MaintenanceSummaryCopyWithImpl<MaintenanceSummary>(this as MaintenanceSummary, _$identity);

  /// Serializes this MaintenanceSummary to a JSON map.
  Map<String, dynamic> toJson();


@override
bool operator ==(Object other) {
  return identical(this, other) || (other.runtimeType == runtimeType&&other is MaintenanceSummary&&(identical(other.id, id) || other.id == id)&&(identical(other.reference, reference) || other.reference == reference)&&(identical(other.status, status) || other.status == status)&&(identical(other.priority, priority) || other.priority == priority)&&(identical(other.title, title) || other.title == title)&&(identical(other.property, property) || other.property == property)&&(identical(other.unit, unit) || other.unit == unit)&&(identical(other.reportedAt, reportedAt) || other.reportedAt == reportedAt)&&(identical(other.slaDueAt, slaDueAt) || other.slaDueAt == slaDueAt)&&(identical(other.isOverdue, isOverdue) || other.isOverdue == isOverdue)&&(identical(other.assignedToUserId, assignedToUserId) || other.assignedToUserId == assignedToUserId)&&(identical(other.ageHours, ageHours) || other.ageHours == ageHours));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode => Object.hash(runtimeType,id,reference,status,priority,title,property,unit,reportedAt,slaDueAt,isOverdue,assignedToUserId,ageHours);

@override
String toString() {
  return 'MaintenanceSummary(id: $id, reference: $reference, status: $status, priority: $priority, title: $title, property: $property, unit: $unit, reportedAt: $reportedAt, slaDueAt: $slaDueAt, isOverdue: $isOverdue, assignedToUserId: $assignedToUserId, ageHours: $ageHours)';
}


}

/// @nodoc
abstract mixin class $MaintenanceSummaryCopyWith<$Res>  {
  factory $MaintenanceSummaryCopyWith(MaintenanceSummary value, $Res Function(MaintenanceSummary) _then) = _$MaintenanceSummaryCopyWithImpl;
@useResult
$Res call({
 String id, String reference, MaintenanceStatus status, MaintenancePriority priority, String title, MaintenancePropertyRef property, MaintenanceUnitRef? unit, String reportedAt, String? slaDueAt, bool isOverdue, String? assignedToUserId, int ageHours
});


$MaintenancePropertyRefCopyWith<$Res> get property;$MaintenanceUnitRefCopyWith<$Res>? get unit;

}
/// @nodoc
class _$MaintenanceSummaryCopyWithImpl<$Res>
    implements $MaintenanceSummaryCopyWith<$Res> {
  _$MaintenanceSummaryCopyWithImpl(this._self, this._then);

  final MaintenanceSummary _self;
  final $Res Function(MaintenanceSummary) _then;

/// Create a copy of MaintenanceSummary
/// with the given fields replaced by the non-null parameter values.
@pragma('vm:prefer-inline') @override $Res call({Object? id = null,Object? reference = null,Object? status = null,Object? priority = null,Object? title = null,Object? property = null,Object? unit = freezed,Object? reportedAt = null,Object? slaDueAt = freezed,Object? isOverdue = null,Object? assignedToUserId = freezed,Object? ageHours = null,}) {
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
as int,
  ));
}
/// Create a copy of MaintenanceSummary
/// with the given fields replaced by the non-null parameter values.
@override
@pragma('vm:prefer-inline')
$MaintenancePropertyRefCopyWith<$Res> get property {
  
  return $MaintenancePropertyRefCopyWith<$Res>(_self.property, (value) {
    return _then(_self.copyWith(property: value));
  });
}/// Create a copy of MaintenanceSummary
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


/// Adds pattern-matching-related methods to [MaintenanceSummary].
extension MaintenanceSummaryPatterns on MaintenanceSummary {
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

@optionalTypeArgs TResult maybeMap<TResult extends Object?>(TResult Function( _MaintenanceSummary value)?  $default,{required TResult orElse(),}){
final _that = this;
switch (_that) {
case _MaintenanceSummary() when $default != null:
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

@optionalTypeArgs TResult map<TResult extends Object?>(TResult Function( _MaintenanceSummary value)  $default,){
final _that = this;
switch (_that) {
case _MaintenanceSummary():
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

@optionalTypeArgs TResult? mapOrNull<TResult extends Object?>(TResult? Function( _MaintenanceSummary value)?  $default,){
final _that = this;
switch (_that) {
case _MaintenanceSummary() when $default != null:
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

@optionalTypeArgs TResult maybeWhen<TResult extends Object?>(TResult Function( String id,  String reference,  MaintenanceStatus status,  MaintenancePriority priority,  String title,  MaintenancePropertyRef property,  MaintenanceUnitRef? unit,  String reportedAt,  String? slaDueAt,  bool isOverdue,  String? assignedToUserId,  int ageHours)?  $default,{required TResult orElse(),}) {final _that = this;
switch (_that) {
case _MaintenanceSummary() when $default != null:
return $default(_that.id,_that.reference,_that.status,_that.priority,_that.title,_that.property,_that.unit,_that.reportedAt,_that.slaDueAt,_that.isOverdue,_that.assignedToUserId,_that.ageHours);case _:
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

@optionalTypeArgs TResult when<TResult extends Object?>(TResult Function( String id,  String reference,  MaintenanceStatus status,  MaintenancePriority priority,  String title,  MaintenancePropertyRef property,  MaintenanceUnitRef? unit,  String reportedAt,  String? slaDueAt,  bool isOverdue,  String? assignedToUserId,  int ageHours)  $default,) {final _that = this;
switch (_that) {
case _MaintenanceSummary():
return $default(_that.id,_that.reference,_that.status,_that.priority,_that.title,_that.property,_that.unit,_that.reportedAt,_that.slaDueAt,_that.isOverdue,_that.assignedToUserId,_that.ageHours);case _:
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

@optionalTypeArgs TResult? whenOrNull<TResult extends Object?>(TResult? Function( String id,  String reference,  MaintenanceStatus status,  MaintenancePriority priority,  String title,  MaintenancePropertyRef property,  MaintenanceUnitRef? unit,  String reportedAt,  String? slaDueAt,  bool isOverdue,  String? assignedToUserId,  int ageHours)?  $default,) {final _that = this;
switch (_that) {
case _MaintenanceSummary() when $default != null:
return $default(_that.id,_that.reference,_that.status,_that.priority,_that.title,_that.property,_that.unit,_that.reportedAt,_that.slaDueAt,_that.isOverdue,_that.assignedToUserId,_that.ageHours);case _:
  return null;

}
}

}

/// @nodoc
@JsonSerializable()

class _MaintenanceSummary implements MaintenanceSummary {
  const _MaintenanceSummary({required this.id, required this.reference, required this.status, required this.priority, required this.title, required this.property, this.unit, required this.reportedAt, this.slaDueAt, this.isOverdue = false, this.assignedToUserId, this.ageHours = 0});
  factory _MaintenanceSummary.fromJson(Map<String, dynamic> json) => _$MaintenanceSummaryFromJson(json);

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

/// Create a copy of MaintenanceSummary
/// with the given fields replaced by the non-null parameter values.
@override @JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
_$MaintenanceSummaryCopyWith<_MaintenanceSummary> get copyWith => __$MaintenanceSummaryCopyWithImpl<_MaintenanceSummary>(this, _$identity);

@override
Map<String, dynamic> toJson() {
  return _$MaintenanceSummaryToJson(this, );
}

@override
bool operator ==(Object other) {
  return identical(this, other) || (other.runtimeType == runtimeType&&other is _MaintenanceSummary&&(identical(other.id, id) || other.id == id)&&(identical(other.reference, reference) || other.reference == reference)&&(identical(other.status, status) || other.status == status)&&(identical(other.priority, priority) || other.priority == priority)&&(identical(other.title, title) || other.title == title)&&(identical(other.property, property) || other.property == property)&&(identical(other.unit, unit) || other.unit == unit)&&(identical(other.reportedAt, reportedAt) || other.reportedAt == reportedAt)&&(identical(other.slaDueAt, slaDueAt) || other.slaDueAt == slaDueAt)&&(identical(other.isOverdue, isOverdue) || other.isOverdue == isOverdue)&&(identical(other.assignedToUserId, assignedToUserId) || other.assignedToUserId == assignedToUserId)&&(identical(other.ageHours, ageHours) || other.ageHours == ageHours));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode => Object.hash(runtimeType,id,reference,status,priority,title,property,unit,reportedAt,slaDueAt,isOverdue,assignedToUserId,ageHours);

@override
String toString() {
  return 'MaintenanceSummary(id: $id, reference: $reference, status: $status, priority: $priority, title: $title, property: $property, unit: $unit, reportedAt: $reportedAt, slaDueAt: $slaDueAt, isOverdue: $isOverdue, assignedToUserId: $assignedToUserId, ageHours: $ageHours)';
}


}

/// @nodoc
abstract mixin class _$MaintenanceSummaryCopyWith<$Res> implements $MaintenanceSummaryCopyWith<$Res> {
  factory _$MaintenanceSummaryCopyWith(_MaintenanceSummary value, $Res Function(_MaintenanceSummary) _then) = __$MaintenanceSummaryCopyWithImpl;
@override @useResult
$Res call({
 String id, String reference, MaintenanceStatus status, MaintenancePriority priority, String title, MaintenancePropertyRef property, MaintenanceUnitRef? unit, String reportedAt, String? slaDueAt, bool isOverdue, String? assignedToUserId, int ageHours
});


@override $MaintenancePropertyRefCopyWith<$Res> get property;@override $MaintenanceUnitRefCopyWith<$Res>? get unit;

}
/// @nodoc
class __$MaintenanceSummaryCopyWithImpl<$Res>
    implements _$MaintenanceSummaryCopyWith<$Res> {
  __$MaintenanceSummaryCopyWithImpl(this._self, this._then);

  final _MaintenanceSummary _self;
  final $Res Function(_MaintenanceSummary) _then;

/// Create a copy of MaintenanceSummary
/// with the given fields replaced by the non-null parameter values.
@override @pragma('vm:prefer-inline') $Res call({Object? id = null,Object? reference = null,Object? status = null,Object? priority = null,Object? title = null,Object? property = null,Object? unit = freezed,Object? reportedAt = null,Object? slaDueAt = freezed,Object? isOverdue = null,Object? assignedToUserId = freezed,Object? ageHours = null,}) {
  return _then(_MaintenanceSummary(
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
as int,
  ));
}

/// Create a copy of MaintenanceSummary
/// with the given fields replaced by the non-null parameter values.
@override
@pragma('vm:prefer-inline')
$MaintenancePropertyRefCopyWith<$Res> get property {
  
  return $MaintenancePropertyRefCopyWith<$Res>(_self.property, (value) {
    return _then(_self.copyWith(property: value));
  });
}/// Create a copy of MaintenanceSummary
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
