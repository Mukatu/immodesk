// GENERATED CODE - DO NOT MODIFY BY HAND
// coverage:ignore-file
// ignore_for_file: type=lint
// ignore_for_file: unused_element, deprecated_member_use, deprecated_member_use_from_same_package, use_function_type_syntax_for_parameters, unnecessary_const, avoid_init_to_null, invalid_override_different_default_values_named, prefer_expression_function_bodies, annotate_overrides, invalid_annotation_target, unnecessary_question_mark

part of 'lease_document.dart';

// **************************************************************************
// FreezedGenerator
// **************************************************************************

// dart format off
T _$identity<T>(T value) => value;

/// @nodoc
mixin _$LeaseDocument {

 String get id; String get leaseId; LeaseDocumentKind get kind; String get documentId; int get version; String get title; String? get effectiveDate; bool get isSigned; String? get signedAt; String? get createdAt;
/// Create a copy of LeaseDocument
/// with the given fields replaced by the non-null parameter values.
@JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
$LeaseDocumentCopyWith<LeaseDocument> get copyWith => _$LeaseDocumentCopyWithImpl<LeaseDocument>(this as LeaseDocument, _$identity);

  /// Serializes this LeaseDocument to a JSON map.
  Map<String, dynamic> toJson();


@override
bool operator ==(Object other) {
  return identical(this, other) || (other.runtimeType == runtimeType&&other is LeaseDocument&&(identical(other.id, id) || other.id == id)&&(identical(other.leaseId, leaseId) || other.leaseId == leaseId)&&(identical(other.kind, kind) || other.kind == kind)&&(identical(other.documentId, documentId) || other.documentId == documentId)&&(identical(other.version, version) || other.version == version)&&(identical(other.title, title) || other.title == title)&&(identical(other.effectiveDate, effectiveDate) || other.effectiveDate == effectiveDate)&&(identical(other.isSigned, isSigned) || other.isSigned == isSigned)&&(identical(other.signedAt, signedAt) || other.signedAt == signedAt)&&(identical(other.createdAt, createdAt) || other.createdAt == createdAt));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode => Object.hash(runtimeType,id,leaseId,kind,documentId,version,title,effectiveDate,isSigned,signedAt,createdAt);

@override
String toString() {
  return 'LeaseDocument(id: $id, leaseId: $leaseId, kind: $kind, documentId: $documentId, version: $version, title: $title, effectiveDate: $effectiveDate, isSigned: $isSigned, signedAt: $signedAt, createdAt: $createdAt)';
}


}

/// @nodoc
abstract mixin class $LeaseDocumentCopyWith<$Res>  {
  factory $LeaseDocumentCopyWith(LeaseDocument value, $Res Function(LeaseDocument) _then) = _$LeaseDocumentCopyWithImpl;
@useResult
$Res call({
 String id, String leaseId, LeaseDocumentKind kind, String documentId, int version, String title, String? effectiveDate, bool isSigned, String? signedAt, String? createdAt
});




}
/// @nodoc
class _$LeaseDocumentCopyWithImpl<$Res>
    implements $LeaseDocumentCopyWith<$Res> {
  _$LeaseDocumentCopyWithImpl(this._self, this._then);

  final LeaseDocument _self;
  final $Res Function(LeaseDocument) _then;

/// Create a copy of LeaseDocument
/// with the given fields replaced by the non-null parameter values.
@pragma('vm:prefer-inline') @override $Res call({Object? id = null,Object? leaseId = null,Object? kind = null,Object? documentId = null,Object? version = null,Object? title = null,Object? effectiveDate = freezed,Object? isSigned = null,Object? signedAt = freezed,Object? createdAt = freezed,}) {
  return _then(_self.copyWith(
id: null == id ? _self.id : id // ignore: cast_nullable_to_non_nullable
as String,leaseId: null == leaseId ? _self.leaseId : leaseId // ignore: cast_nullable_to_non_nullable
as String,kind: null == kind ? _self.kind : kind // ignore: cast_nullable_to_non_nullable
as LeaseDocumentKind,documentId: null == documentId ? _self.documentId : documentId // ignore: cast_nullable_to_non_nullable
as String,version: null == version ? _self.version : version // ignore: cast_nullable_to_non_nullable
as int,title: null == title ? _self.title : title // ignore: cast_nullable_to_non_nullable
as String,effectiveDate: freezed == effectiveDate ? _self.effectiveDate : effectiveDate // ignore: cast_nullable_to_non_nullable
as String?,isSigned: null == isSigned ? _self.isSigned : isSigned // ignore: cast_nullable_to_non_nullable
as bool,signedAt: freezed == signedAt ? _self.signedAt : signedAt // ignore: cast_nullable_to_non_nullable
as String?,createdAt: freezed == createdAt ? _self.createdAt : createdAt // ignore: cast_nullable_to_non_nullable
as String?,
  ));
}

}


/// Adds pattern-matching-related methods to [LeaseDocument].
extension LeaseDocumentPatterns on LeaseDocument {
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

@optionalTypeArgs TResult maybeMap<TResult extends Object?>(TResult Function( _LeaseDocument value)?  $default,{required TResult orElse(),}){
final _that = this;
switch (_that) {
case _LeaseDocument() when $default != null:
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

@optionalTypeArgs TResult map<TResult extends Object?>(TResult Function( _LeaseDocument value)  $default,){
final _that = this;
switch (_that) {
case _LeaseDocument():
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

@optionalTypeArgs TResult? mapOrNull<TResult extends Object?>(TResult? Function( _LeaseDocument value)?  $default,){
final _that = this;
switch (_that) {
case _LeaseDocument() when $default != null:
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

@optionalTypeArgs TResult maybeWhen<TResult extends Object?>(TResult Function( String id,  String leaseId,  LeaseDocumentKind kind,  String documentId,  int version,  String title,  String? effectiveDate,  bool isSigned,  String? signedAt,  String? createdAt)?  $default,{required TResult orElse(),}) {final _that = this;
switch (_that) {
case _LeaseDocument() when $default != null:
return $default(_that.id,_that.leaseId,_that.kind,_that.documentId,_that.version,_that.title,_that.effectiveDate,_that.isSigned,_that.signedAt,_that.createdAt);case _:
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

@optionalTypeArgs TResult when<TResult extends Object?>(TResult Function( String id,  String leaseId,  LeaseDocumentKind kind,  String documentId,  int version,  String title,  String? effectiveDate,  bool isSigned,  String? signedAt,  String? createdAt)  $default,) {final _that = this;
switch (_that) {
case _LeaseDocument():
return $default(_that.id,_that.leaseId,_that.kind,_that.documentId,_that.version,_that.title,_that.effectiveDate,_that.isSigned,_that.signedAt,_that.createdAt);case _:
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

@optionalTypeArgs TResult? whenOrNull<TResult extends Object?>(TResult? Function( String id,  String leaseId,  LeaseDocumentKind kind,  String documentId,  int version,  String title,  String? effectiveDate,  bool isSigned,  String? signedAt,  String? createdAt)?  $default,) {final _that = this;
switch (_that) {
case _LeaseDocument() when $default != null:
return $default(_that.id,_that.leaseId,_that.kind,_that.documentId,_that.version,_that.title,_that.effectiveDate,_that.isSigned,_that.signedAt,_that.createdAt);case _:
  return null;

}
}

}

/// @nodoc
@JsonSerializable()

class _LeaseDocument implements LeaseDocument {
  const _LeaseDocument({required this.id, required this.leaseId, required this.kind, required this.documentId, this.version = 1, required this.title, this.effectiveDate, this.isSigned = false, this.signedAt, this.createdAt});
  factory _LeaseDocument.fromJson(Map<String, dynamic> json) => _$LeaseDocumentFromJson(json);

@override final  String id;
@override final  String leaseId;
@override final  LeaseDocumentKind kind;
@override final  String documentId;
@override@JsonKey() final  int version;
@override final  String title;
@override final  String? effectiveDate;
@override@JsonKey() final  bool isSigned;
@override final  String? signedAt;
@override final  String? createdAt;

/// Create a copy of LeaseDocument
/// with the given fields replaced by the non-null parameter values.
@override @JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
_$LeaseDocumentCopyWith<_LeaseDocument> get copyWith => __$LeaseDocumentCopyWithImpl<_LeaseDocument>(this, _$identity);

@override
Map<String, dynamic> toJson() {
  return _$LeaseDocumentToJson(this, );
}

@override
bool operator ==(Object other) {
  return identical(this, other) || (other.runtimeType == runtimeType&&other is _LeaseDocument&&(identical(other.id, id) || other.id == id)&&(identical(other.leaseId, leaseId) || other.leaseId == leaseId)&&(identical(other.kind, kind) || other.kind == kind)&&(identical(other.documentId, documentId) || other.documentId == documentId)&&(identical(other.version, version) || other.version == version)&&(identical(other.title, title) || other.title == title)&&(identical(other.effectiveDate, effectiveDate) || other.effectiveDate == effectiveDate)&&(identical(other.isSigned, isSigned) || other.isSigned == isSigned)&&(identical(other.signedAt, signedAt) || other.signedAt == signedAt)&&(identical(other.createdAt, createdAt) || other.createdAt == createdAt));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode => Object.hash(runtimeType,id,leaseId,kind,documentId,version,title,effectiveDate,isSigned,signedAt,createdAt);

@override
String toString() {
  return 'LeaseDocument(id: $id, leaseId: $leaseId, kind: $kind, documentId: $documentId, version: $version, title: $title, effectiveDate: $effectiveDate, isSigned: $isSigned, signedAt: $signedAt, createdAt: $createdAt)';
}


}

/// @nodoc
abstract mixin class _$LeaseDocumentCopyWith<$Res> implements $LeaseDocumentCopyWith<$Res> {
  factory _$LeaseDocumentCopyWith(_LeaseDocument value, $Res Function(_LeaseDocument) _then) = __$LeaseDocumentCopyWithImpl;
@override @useResult
$Res call({
 String id, String leaseId, LeaseDocumentKind kind, String documentId, int version, String title, String? effectiveDate, bool isSigned, String? signedAt, String? createdAt
});




}
/// @nodoc
class __$LeaseDocumentCopyWithImpl<$Res>
    implements _$LeaseDocumentCopyWith<$Res> {
  __$LeaseDocumentCopyWithImpl(this._self, this._then);

  final _LeaseDocument _self;
  final $Res Function(_LeaseDocument) _then;

/// Create a copy of LeaseDocument
/// with the given fields replaced by the non-null parameter values.
@override @pragma('vm:prefer-inline') $Res call({Object? id = null,Object? leaseId = null,Object? kind = null,Object? documentId = null,Object? version = null,Object? title = null,Object? effectiveDate = freezed,Object? isSigned = null,Object? signedAt = freezed,Object? createdAt = freezed,}) {
  return _then(_LeaseDocument(
id: null == id ? _self.id : id // ignore: cast_nullable_to_non_nullable
as String,leaseId: null == leaseId ? _self.leaseId : leaseId // ignore: cast_nullable_to_non_nullable
as String,kind: null == kind ? _self.kind : kind // ignore: cast_nullable_to_non_nullable
as LeaseDocumentKind,documentId: null == documentId ? _self.documentId : documentId // ignore: cast_nullable_to_non_nullable
as String,version: null == version ? _self.version : version // ignore: cast_nullable_to_non_nullable
as int,title: null == title ? _self.title : title // ignore: cast_nullable_to_non_nullable
as String,effectiveDate: freezed == effectiveDate ? _self.effectiveDate : effectiveDate // ignore: cast_nullable_to_non_nullable
as String?,isSigned: null == isSigned ? _self.isSigned : isSigned // ignore: cast_nullable_to_non_nullable
as bool,signedAt: freezed == signedAt ? _self.signedAt : signedAt // ignore: cast_nullable_to_non_nullable
as String?,createdAt: freezed == createdAt ? _self.createdAt : createdAt // ignore: cast_nullable_to_non_nullable
as String?,
  ));
}


}

// dart format on
