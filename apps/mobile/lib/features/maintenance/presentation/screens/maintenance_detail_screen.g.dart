// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'maintenance_detail_screen.dart';

// **************************************************************************
// RiverpodGenerator
// **************************************************************************

// GENERATED CODE - DO NOT MODIFY BY HAND
// ignore_for_file: type=lint, type=warning

@ProviderFor(maintenanceDetail)
final maintenanceDetailProvider = MaintenanceDetailFamily._();

final class MaintenanceDetailProvider
    extends
        $FunctionalProvider<
          AsyncValue<MaintenanceDetail>,
          MaintenanceDetail,
          FutureOr<MaintenanceDetail>
        >
    with
        $FutureModifier<MaintenanceDetail>,
        $FutureProvider<MaintenanceDetail> {
  MaintenanceDetailProvider._({
    required MaintenanceDetailFamily super.from,
    required String super.argument,
  }) : super(
         retry: null,
         name: r'maintenanceDetailProvider',
         isAutoDispose: true,
         dependencies: null,
         $allTransitiveDependencies: null,
       );

  @override
  String debugGetCreateSourceHash() => _$maintenanceDetailHash();

  @override
  String toString() {
    return r'maintenanceDetailProvider'
        ''
        '($argument)';
  }

  @$internal
  @override
  $FutureProviderElement<MaintenanceDetail> $createElement(
    $ProviderPointer pointer,
  ) => $FutureProviderElement(pointer);

  @override
  FutureOr<MaintenanceDetail> create(Ref ref) {
    final argument = this.argument as String;
    return maintenanceDetail(ref, argument);
  }

  @override
  bool operator ==(Object other) {
    return other is MaintenanceDetailProvider && other.argument == argument;
  }

  @override
  int get hashCode {
    return argument.hashCode;
  }
}

String _$maintenanceDetailHash() => r'eb774cc3cee94804e0b2863a8c3a4a98933235db';

final class MaintenanceDetailFamily extends $Family
    with $FunctionalFamilyOverride<FutureOr<MaintenanceDetail>, String> {
  MaintenanceDetailFamily._()
    : super(
        retry: null,
        name: r'maintenanceDetailProvider',
        dependencies: null,
        $allTransitiveDependencies: null,
        isAutoDispose: true,
      );

  MaintenanceDetailProvider call(String id) =>
      MaintenanceDetailProvider._(argument: id, from: this);

  @override
  String toString() => r'maintenanceDetailProvider';
}
