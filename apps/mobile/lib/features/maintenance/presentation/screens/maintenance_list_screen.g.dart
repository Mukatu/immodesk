// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'maintenance_list_screen.dart';

// **************************************************************************
// RiverpodGenerator
// **************************************************************************

// GENERATED CODE - DO NOT MODIFY BY HAND
// ignore_for_file: type=lint, type=warning

@ProviderFor(myMaintenanceRequests)
final myMaintenanceRequestsProvider = MyMaintenanceRequestsProvider._();

final class MyMaintenanceRequestsProvider
    extends
        $FunctionalProvider<
          AsyncValue<List<MaintenanceSummary>>,
          List<MaintenanceSummary>,
          FutureOr<List<MaintenanceSummary>>
        >
    with
        $FutureModifier<List<MaintenanceSummary>>,
        $FutureProvider<List<MaintenanceSummary>> {
  MyMaintenanceRequestsProvider._()
    : super(
        from: null,
        argument: null,
        retry: null,
        name: r'myMaintenanceRequestsProvider',
        isAutoDispose: true,
        dependencies: null,
        $allTransitiveDependencies: null,
      );

  @override
  String debugGetCreateSourceHash() => _$myMaintenanceRequestsHash();

  @$internal
  @override
  $FutureProviderElement<List<MaintenanceSummary>> $createElement(
    $ProviderPointer pointer,
  ) => $FutureProviderElement(pointer);

  @override
  FutureOr<List<MaintenanceSummary>> create(Ref ref) {
    return myMaintenanceRequests(ref);
  }
}

String _$myMaintenanceRequestsHash() =>
    r'45331941bdf34a5932e473c6e1a3e0565b2a0ffc';
