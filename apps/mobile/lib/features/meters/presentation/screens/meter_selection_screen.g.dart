// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'meter_selection_screen.dart';

// **************************************************************************
// RiverpodGenerator
// **************************************************************************

// GENERATED CODE - DO NOT MODIFY BY HAND
// ignore_for_file: type=lint, type=warning

@ProviderFor(unitMeters)
final unitMetersProvider = UnitMetersFamily._();

final class UnitMetersProvider
    extends
        $FunctionalProvider<
          AsyncValue<List<Meter>>,
          List<Meter>,
          FutureOr<List<Meter>>
        >
    with $FutureModifier<List<Meter>>, $FutureProvider<List<Meter>> {
  UnitMetersProvider._({
    required UnitMetersFamily super.from,
    required String super.argument,
  }) : super(
         retry: null,
         name: r'unitMetersProvider',
         isAutoDispose: true,
         dependencies: null,
         $allTransitiveDependencies: null,
       );

  @override
  String debugGetCreateSourceHash() => _$unitMetersHash();

  @override
  String toString() {
    return r'unitMetersProvider'
        ''
        '($argument)';
  }

  @$internal
  @override
  $FutureProviderElement<List<Meter>> $createElement(
    $ProviderPointer pointer,
  ) => $FutureProviderElement(pointer);

  @override
  FutureOr<List<Meter>> create(Ref ref) {
    final argument = this.argument as String;
    return unitMeters(ref, argument);
  }

  @override
  bool operator ==(Object other) {
    return other is UnitMetersProvider && other.argument == argument;
  }

  @override
  int get hashCode {
    return argument.hashCode;
  }
}

String _$unitMetersHash() => r'f1519dfa35720ef55e57722c47e3c23606f4d88b';

final class UnitMetersFamily extends $Family
    with $FunctionalFamilyOverride<FutureOr<List<Meter>>, String> {
  UnitMetersFamily._()
    : super(
        retry: null,
        name: r'unitMetersProvider',
        dependencies: null,
        $allTransitiveDependencies: null,
        isAutoDispose: true,
      );

  UnitMetersProvider call(String unitId) =>
      UnitMetersProvider._(argument: unitId, from: this);

  @override
  String toString() => r'unitMetersProvider';
}
