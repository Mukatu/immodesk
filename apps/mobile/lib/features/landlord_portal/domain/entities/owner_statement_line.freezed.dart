// GENERATED CODE - DO NOT MODIFY BY HAND
// coverage:ignore-file
// ignore_for_file: type=lint
// ignore_for_file: unused_element, deprecated_member_use, deprecated_member_use_from_same_package, use_function_type_syntax_for_parameters, unnecessary_const, avoid_init_to_null, invalid_override_different_default_values_named, prefer_expression_function_bodies, annotate_overrides, invalid_annotation_target, unnecessary_question_mark

part of 'owner_statement_line.dart';

// **************************************************************************
// FreezedGenerator
// **************************************************************************

// dart format off
T _$identity<T>(T value) => value;

/// @nodoc
mixin _$OwnerStatementLine {

 String get id; OwnerStatementLineType get lineType; String get label; int get amount; bool get isDebit; int get position;
/// Create a copy of OwnerStatementLine
/// with the given fields replaced by the non-null parameter values.
@JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
$OwnerStatementLineCopyWith<OwnerStatementLine> get copyWith => _$OwnerStatementLineCopyWithImpl<OwnerStatementLine>(this as OwnerStatementLine, _$identity);

  /// Serializes this OwnerStatementLine to a JSON map.
  Map<String, dynamic> toJson();


@override
bool operator ==(Object other) {
  return identical(this, other) || (other.runtimeType == runtimeType&&other is OwnerStatementLine&&(identical(other.id, id) || other.id == id)&&(identical(other.lineType, lineType) || other.lineType == lineType)&&(identical(other.label, label) || other.label == label)&&(identical(other.amount, amount) || other.amount == amount)&&(identical(other.isDebit, isDebit) || other.isDebit == isDebit)&&(identical(other.position, position) || other.position == position));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode => Object.hash(runtimeType,id,lineType,label,amount,isDebit,position);

@override
String toString() {
  return 'OwnerStatementLine(id: $id, lineType: $lineType, label: $label, amount: $amount, isDebit: $isDebit, position: $position)';
}


}

/// @nodoc
abstract mixin class $OwnerStatementLineCopyWith<$Res>  {
  factory $OwnerStatementLineCopyWith(OwnerStatementLine value, $Res Function(OwnerStatementLine) _then) = _$OwnerStatementLineCopyWithImpl;
@useResult
$Res call({
 String id, OwnerStatementLineType lineType, String label, int amount, bool isDebit, int position
});




}
/// @nodoc
class _$OwnerStatementLineCopyWithImpl<$Res>
    implements $OwnerStatementLineCopyWith<$Res> {
  _$OwnerStatementLineCopyWithImpl(this._self, this._then);

  final OwnerStatementLine _self;
  final $Res Function(OwnerStatementLine) _then;

/// Create a copy of OwnerStatementLine
/// with the given fields replaced by the non-null parameter values.
@pragma('vm:prefer-inline') @override $Res call({Object? id = null,Object? lineType = null,Object? label = null,Object? amount = null,Object? isDebit = null,Object? position = null,}) {
  return _then(_self.copyWith(
id: null == id ? _self.id : id // ignore: cast_nullable_to_non_nullable
as String,lineType: null == lineType ? _self.lineType : lineType // ignore: cast_nullable_to_non_nullable
as OwnerStatementLineType,label: null == label ? _self.label : label // ignore: cast_nullable_to_non_nullable
as String,amount: null == amount ? _self.amount : amount // ignore: cast_nullable_to_non_nullable
as int,isDebit: null == isDebit ? _self.isDebit : isDebit // ignore: cast_nullable_to_non_nullable
as bool,position: null == position ? _self.position : position // ignore: cast_nullable_to_non_nullable
as int,
  ));
}

}


/// Adds pattern-matching-related methods to [OwnerStatementLine].
extension OwnerStatementLinePatterns on OwnerStatementLine {
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

@optionalTypeArgs TResult maybeMap<TResult extends Object?>(TResult Function( _OwnerStatementLine value)?  $default,{required TResult orElse(),}){
final _that = this;
switch (_that) {
case _OwnerStatementLine() when $default != null:
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

@optionalTypeArgs TResult map<TResult extends Object?>(TResult Function( _OwnerStatementLine value)  $default,){
final _that = this;
switch (_that) {
case _OwnerStatementLine():
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

@optionalTypeArgs TResult? mapOrNull<TResult extends Object?>(TResult? Function( _OwnerStatementLine value)?  $default,){
final _that = this;
switch (_that) {
case _OwnerStatementLine() when $default != null:
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

@optionalTypeArgs TResult maybeWhen<TResult extends Object?>(TResult Function( String id,  OwnerStatementLineType lineType,  String label,  int amount,  bool isDebit,  int position)?  $default,{required TResult orElse(),}) {final _that = this;
switch (_that) {
case _OwnerStatementLine() when $default != null:
return $default(_that.id,_that.lineType,_that.label,_that.amount,_that.isDebit,_that.position);case _:
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

@optionalTypeArgs TResult when<TResult extends Object?>(TResult Function( String id,  OwnerStatementLineType lineType,  String label,  int amount,  bool isDebit,  int position)  $default,) {final _that = this;
switch (_that) {
case _OwnerStatementLine():
return $default(_that.id,_that.lineType,_that.label,_that.amount,_that.isDebit,_that.position);case _:
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

@optionalTypeArgs TResult? whenOrNull<TResult extends Object?>(TResult? Function( String id,  OwnerStatementLineType lineType,  String label,  int amount,  bool isDebit,  int position)?  $default,) {final _that = this;
switch (_that) {
case _OwnerStatementLine() when $default != null:
return $default(_that.id,_that.lineType,_that.label,_that.amount,_that.isDebit,_that.position);case _:
  return null;

}
}

}

/// @nodoc
@JsonSerializable()

class _OwnerStatementLine implements OwnerStatementLine {
  const _OwnerStatementLine({required this.id, required this.lineType, required this.label, required this.amount, required this.isDebit, this.position = 0});
  factory _OwnerStatementLine.fromJson(Map<String, dynamic> json) => _$OwnerStatementLineFromJson(json);

@override final  String id;
@override final  OwnerStatementLineType lineType;
@override final  String label;
@override final  int amount;
@override final  bool isDebit;
@override@JsonKey() final  int position;

/// Create a copy of OwnerStatementLine
/// with the given fields replaced by the non-null parameter values.
@override @JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
_$OwnerStatementLineCopyWith<_OwnerStatementLine> get copyWith => __$OwnerStatementLineCopyWithImpl<_OwnerStatementLine>(this, _$identity);

@override
Map<String, dynamic> toJson() {
  return _$OwnerStatementLineToJson(this, );
}

@override
bool operator ==(Object other) {
  return identical(this, other) || (other.runtimeType == runtimeType&&other is _OwnerStatementLine&&(identical(other.id, id) || other.id == id)&&(identical(other.lineType, lineType) || other.lineType == lineType)&&(identical(other.label, label) || other.label == label)&&(identical(other.amount, amount) || other.amount == amount)&&(identical(other.isDebit, isDebit) || other.isDebit == isDebit)&&(identical(other.position, position) || other.position == position));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode => Object.hash(runtimeType,id,lineType,label,amount,isDebit,position);

@override
String toString() {
  return 'OwnerStatementLine(id: $id, lineType: $lineType, label: $label, amount: $amount, isDebit: $isDebit, position: $position)';
}


}

/// @nodoc
abstract mixin class _$OwnerStatementLineCopyWith<$Res> implements $OwnerStatementLineCopyWith<$Res> {
  factory _$OwnerStatementLineCopyWith(_OwnerStatementLine value, $Res Function(_OwnerStatementLine) _then) = __$OwnerStatementLineCopyWithImpl;
@override @useResult
$Res call({
 String id, OwnerStatementLineType lineType, String label, int amount, bool isDebit, int position
});




}
/// @nodoc
class __$OwnerStatementLineCopyWithImpl<$Res>
    implements _$OwnerStatementLineCopyWith<$Res> {
  __$OwnerStatementLineCopyWithImpl(this._self, this._then);

  final _OwnerStatementLine _self;
  final $Res Function(_OwnerStatementLine) _then;

/// Create a copy of OwnerStatementLine
/// with the given fields replaced by the non-null parameter values.
@override @pragma('vm:prefer-inline') $Res call({Object? id = null,Object? lineType = null,Object? label = null,Object? amount = null,Object? isDebit = null,Object? position = null,}) {
  return _then(_OwnerStatementLine(
id: null == id ? _self.id : id // ignore: cast_nullable_to_non_nullable
as String,lineType: null == lineType ? _self.lineType : lineType // ignore: cast_nullable_to_non_nullable
as OwnerStatementLineType,label: null == label ? _self.label : label // ignore: cast_nullable_to_non_nullable
as String,amount: null == amount ? _self.amount : amount // ignore: cast_nullable_to_non_nullable
as int,isDebit: null == isDebit ? _self.isDebit : isDebit // ignore: cast_nullable_to_non_nullable
as bool,position: null == position ? _self.position : position // ignore: cast_nullable_to_non_nullable
as int,
  ));
}


}

// dart format on
