// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'leases_list_controller.dart';

// **************************************************************************
// RiverpodGenerator
// **************************************************************************

// GENERATED CODE - DO NOT MODIFY BY HAND
// ignore_for_file: type=lint, type=warning
/// Liste des baux de l'organisation, avec filtre local par statut.

@ProviderFor(LeasesListController)
final leasesListControllerProvider = LeasesListControllerProvider._();

/// Liste des baux de l'organisation, avec filtre local par statut.
final class LeasesListControllerProvider
    extends $AsyncNotifierProvider<LeasesListController, LeasesListState> {
  /// Liste des baux de l'organisation, avec filtre local par statut.
  LeasesListControllerProvider._()
    : super(
        from: null,
        argument: null,
        retry: null,
        name: r'leasesListControllerProvider',
        isAutoDispose: true,
        dependencies: null,
        $allTransitiveDependencies: null,
      );

  @override
  String debugGetCreateSourceHash() => _$leasesListControllerHash();

  @$internal
  @override
  LeasesListController create() => LeasesListController();
}

String _$leasesListControllerHash() =>
    r'0ced95e27e755d5dd047ff0e8d52cba4a64e7aff';

/// Liste des baux de l'organisation, avec filtre local par statut.

abstract class _$LeasesListController extends $AsyncNotifier<LeasesListState> {
  FutureOr<LeasesListState> build();
  @$mustCallSuper
  @override
  void runBuild() {
    final ref = this.ref as $Ref<AsyncValue<LeasesListState>, LeasesListState>;
    final element =
        ref.element
            as $ClassProviderElement<
              AnyNotifier<AsyncValue<LeasesListState>, LeasesListState>,
              AsyncValue<LeasesListState>,
              Object?,
              Object?
            >;
    element.handleCreate(ref, build);
  }
}
