// GENERATED CODE - DO NOT MODIFY BY HAND
// coverage:ignore-file
// ignore_for_file: type=lint
// ignore_for_file: unused_element, deprecated_member_use, deprecated_member_use_from_same_package, use_function_type_syntax_for_parameters, unnecessary_const, avoid_init_to_null, invalid_override_different_default_values_named, prefer_expression_function_bodies, annotate_overrides, invalid_annotation_target, unnecessary_question_mark

part of 'document.dart';

// **************************************************************************
// FreezedGenerator
// **************************************************************************

// dart format off
T _$identity<T>(T value) => value;

/// @nodoc
mixin _$Document {

 String get id; DocumentKind get kind; String get fileName; String get mimeType; int get sizeBytes; String? get relatedEntityType; String? get relatedEntityId; String get uploadedAt;
/// Create a copy of Document
/// with the given fields replaced by the non-null parameter values.
@JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
$DocumentCopyWith<Document> get copyWith => _$DocumentCopyWithImpl<Document>(this as Document, _$identity);

  /// Serializes this Document to a JSON map.
  Map<String, dynamic> toJson();


@override
bool operator ==(Object other) {
  return identical(this, other) || (other.runtimeType == runtimeType&&other is Document&&(identical(other.id, id) || other.id == id)&&(identical(other.kind, kind) || other.kind == kind)&&(identical(other.fileName, fileName) || other.fileName == fileName)&&(identical(other.mimeType, mimeType) || other.mimeType == mimeType)&&(identical(other.sizeBytes, sizeBytes) || other.sizeBytes == sizeBytes)&&(identical(other.relatedEntityType, relatedEntityType) || other.relatedEntityType == relatedEntityType)&&(identical(other.relatedEntityId, relatedEntityId) || other.relatedEntityId == relatedEntityId)&&(identical(other.uploadedAt, uploadedAt) || other.uploadedAt == uploadedAt));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode => Object.hash(runtimeType,id,kind,fileName,mimeType,sizeBytes,relatedEntityType,relatedEntityId,uploadedAt);

@override
String toString() {
  return 'Document(id: $id, kind: $kind, fileName: $fileName, mimeType: $mimeType, sizeBytes: $sizeBytes, relatedEntityType: $relatedEntityType, relatedEntityId: $relatedEntityId, uploadedAt: $uploadedAt)';
}


}

/// @nodoc
abstract mixin class $DocumentCopyWith<$Res>  {
  factory $DocumentCopyWith(Document value, $Res Function(Document) _then) = _$DocumentCopyWithImpl;
@useResult
$Res call({
 String id, DocumentKind kind, String fileName, String mimeType, int sizeBytes, String? relatedEntityType, String? relatedEntityId, String uploadedAt
});




}
/// @nodoc
class _$DocumentCopyWithImpl<$Res>
    implements $DocumentCopyWith<$Res> {
  _$DocumentCopyWithImpl(this._self, this._then);

  final Document _self;
  final $Res Function(Document) _then;

/// Create a copy of Document
/// with the given fields replaced by the non-null parameter values.
@pragma('vm:prefer-inline') @override $Res call({Object? id = null,Object? kind = null,Object? fileName = null,Object? mimeType = null,Object? sizeBytes = null,Object? relatedEntityType = freezed,Object? relatedEntityId = freezed,Object? uploadedAt = null,}) {
  return _then(_self.copyWith(
id: null == id ? _self.id : id // ignore: cast_nullable_to_non_nullable
as String,kind: null == kind ? _self.kind : kind // ignore: cast_nullable_to_non_nullable
as DocumentKind,fileName: null == fileName ? _self.fileName : fileName // ignore: cast_nullable_to_non_nullable
as String,mimeType: null == mimeType ? _self.mimeType : mimeType // ignore: cast_nullable_to_non_nullable
as String,sizeBytes: null == sizeBytes ? _self.sizeBytes : sizeBytes // ignore: cast_nullable_to_non_nullable
as int,relatedEntityType: freezed == relatedEntityType ? _self.relatedEntityType : relatedEntityType // ignore: cast_nullable_to_non_nullable
as String?,relatedEntityId: freezed == relatedEntityId ? _self.relatedEntityId : relatedEntityId // ignore: cast_nullable_to_non_nullable
as String?,uploadedAt: null == uploadedAt ? _self.uploadedAt : uploadedAt // ignore: cast_nullable_to_non_nullable
as String,
  ));
}

}


/// Adds pattern-matching-related methods to [Document].
extension DocumentPatterns on Document {
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

@optionalTypeArgs TResult maybeMap<TResult extends Object?>(TResult Function( _Document value)?  $default,{required TResult orElse(),}){
final _that = this;
switch (_that) {
case _Document() when $default != null:
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

@optionalTypeArgs TResult map<TResult extends Object?>(TResult Function( _Document value)  $default,){
final _that = this;
switch (_that) {
case _Document():
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

@optionalTypeArgs TResult? mapOrNull<TResult extends Object?>(TResult? Function( _Document value)?  $default,){
final _that = this;
switch (_that) {
case _Document() when $default != null:
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

@optionalTypeArgs TResult maybeWhen<TResult extends Object?>(TResult Function( String id,  DocumentKind kind,  String fileName,  String mimeType,  int sizeBytes,  String? relatedEntityType,  String? relatedEntityId,  String uploadedAt)?  $default,{required TResult orElse(),}) {final _that = this;
switch (_that) {
case _Document() when $default != null:
return $default(_that.id,_that.kind,_that.fileName,_that.mimeType,_that.sizeBytes,_that.relatedEntityType,_that.relatedEntityId,_that.uploadedAt);case _:
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

@optionalTypeArgs TResult when<TResult extends Object?>(TResult Function( String id,  DocumentKind kind,  String fileName,  String mimeType,  int sizeBytes,  String? relatedEntityType,  String? relatedEntityId,  String uploadedAt)  $default,) {final _that = this;
switch (_that) {
case _Document():
return $default(_that.id,_that.kind,_that.fileName,_that.mimeType,_that.sizeBytes,_that.relatedEntityType,_that.relatedEntityId,_that.uploadedAt);case _:
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

@optionalTypeArgs TResult? whenOrNull<TResult extends Object?>(TResult? Function( String id,  DocumentKind kind,  String fileName,  String mimeType,  int sizeBytes,  String? relatedEntityType,  String? relatedEntityId,  String uploadedAt)?  $default,) {final _that = this;
switch (_that) {
case _Document() when $default != null:
return $default(_that.id,_that.kind,_that.fileName,_that.mimeType,_that.sizeBytes,_that.relatedEntityType,_that.relatedEntityId,_that.uploadedAt);case _:
  return null;

}
}

}

/// @nodoc
@JsonSerializable()

class _Document implements Document {
  const _Document({required this.id, required this.kind, required this.fileName, required this.mimeType, required this.sizeBytes, this.relatedEntityType, this.relatedEntityId, required this.uploadedAt});
  factory _Document.fromJson(Map<String, dynamic> json) => _$DocumentFromJson(json);

@override final  String id;
@override final  DocumentKind kind;
@override final  String fileName;
@override final  String mimeType;
@override final  int sizeBytes;
@override final  String? relatedEntityType;
@override final  String? relatedEntityId;
@override final  String uploadedAt;

/// Create a copy of Document
/// with the given fields replaced by the non-null parameter values.
@override @JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
_$DocumentCopyWith<_Document> get copyWith => __$DocumentCopyWithImpl<_Document>(this, _$identity);

@override
Map<String, dynamic> toJson() {
  return _$DocumentToJson(this, );
}

@override
bool operator ==(Object other) {
  return identical(this, other) || (other.runtimeType == runtimeType&&other is _Document&&(identical(other.id, id) || other.id == id)&&(identical(other.kind, kind) || other.kind == kind)&&(identical(other.fileName, fileName) || other.fileName == fileName)&&(identical(other.mimeType, mimeType) || other.mimeType == mimeType)&&(identical(other.sizeBytes, sizeBytes) || other.sizeBytes == sizeBytes)&&(identical(other.relatedEntityType, relatedEntityType) || other.relatedEntityType == relatedEntityType)&&(identical(other.relatedEntityId, relatedEntityId) || other.relatedEntityId == relatedEntityId)&&(identical(other.uploadedAt, uploadedAt) || other.uploadedAt == uploadedAt));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode => Object.hash(runtimeType,id,kind,fileName,mimeType,sizeBytes,relatedEntityType,relatedEntityId,uploadedAt);

@override
String toString() {
  return 'Document(id: $id, kind: $kind, fileName: $fileName, mimeType: $mimeType, sizeBytes: $sizeBytes, relatedEntityType: $relatedEntityType, relatedEntityId: $relatedEntityId, uploadedAt: $uploadedAt)';
}


}

/// @nodoc
abstract mixin class _$DocumentCopyWith<$Res> implements $DocumentCopyWith<$Res> {
  factory _$DocumentCopyWith(_Document value, $Res Function(_Document) _then) = __$DocumentCopyWithImpl;
@override @useResult
$Res call({
 String id, DocumentKind kind, String fileName, String mimeType, int sizeBytes, String? relatedEntityType, String? relatedEntityId, String uploadedAt
});




}
/// @nodoc
class __$DocumentCopyWithImpl<$Res>
    implements _$DocumentCopyWith<$Res> {
  __$DocumentCopyWithImpl(this._self, this._then);

  final _Document _self;
  final $Res Function(_Document) _then;

/// Create a copy of Document
/// with the given fields replaced by the non-null parameter values.
@override @pragma('vm:prefer-inline') $Res call({Object? id = null,Object? kind = null,Object? fileName = null,Object? mimeType = null,Object? sizeBytes = null,Object? relatedEntityType = freezed,Object? relatedEntityId = freezed,Object? uploadedAt = null,}) {
  return _then(_Document(
id: null == id ? _self.id : id // ignore: cast_nullable_to_non_nullable
as String,kind: null == kind ? _self.kind : kind // ignore: cast_nullable_to_non_nullable
as DocumentKind,fileName: null == fileName ? _self.fileName : fileName // ignore: cast_nullable_to_non_nullable
as String,mimeType: null == mimeType ? _self.mimeType : mimeType // ignore: cast_nullable_to_non_nullable
as String,sizeBytes: null == sizeBytes ? _self.sizeBytes : sizeBytes // ignore: cast_nullable_to_non_nullable
as int,relatedEntityType: freezed == relatedEntityType ? _self.relatedEntityType : relatedEntityType // ignore: cast_nullable_to_non_nullable
as String?,relatedEntityId: freezed == relatedEntityId ? _self.relatedEntityId : relatedEntityId // ignore: cast_nullable_to_non_nullable
as String?,uploadedAt: null == uploadedAt ? _self.uploadedAt : uploadedAt // ignore: cast_nullable_to_non_nullable
as String,
  ));
}


}

// dart format on
