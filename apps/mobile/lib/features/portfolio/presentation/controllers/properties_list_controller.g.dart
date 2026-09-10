// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'properties_list_controller.dart';

// **************************************************************************
// RiverpodGenerator
// **************************************************************************

// GENERATED CODE - DO NOT MODIFY BY HAND
// ignore_for_file: type=lint, type=warning
/// Liste des immeubles avec taux d'occupation. Tente un rafraîchissement
/// réseau à l'ouverture, avec repli automatique sur le cache local Drift
/// en cas d'échec (voir `PortfolioRepositoryImpl`).

@ProviderFor(PropertiesListController)
final propertiesListControllerProvider = PropertiesListControllerProvider._();

/// Liste des immeubles avec taux d'occupation. Tente un rafraîchissement
/// réseau à l'ouverture, avec repli automatique sur le cache local Drift
/// en cas d'échec (voir `PortfolioRepositoryImpl`).
final class PropertiesListControllerProvider
    extends
        $AsyncNotifierProvider<PropertiesListController, PropertiesListState> {
  /// Liste des immeubles avec taux d'occupation. Tente un rafraîchissement
  /// réseau à l'ouverture, avec repli automatique sur le cache local Drift
  /// en cas d'échec (voir `PortfolioRepositoryImpl`).
  PropertiesListControllerProvider._()
    : super(
        from: null,
        argument: null,
        retry: null,
        name: r'propertiesListControllerProvider',
        isAutoDispose: true,
        dependencies: null,
        $allTransitiveDependencies: null,
      );

  @override
  String debugGetCreateSourceHash() => _$propertiesListControllerHash();

  @$internal
  @override
  PropertiesListController create() => PropertiesListController();
}

String _$propertiesListControllerHash() =>
    r'7168a21d34a37f724cb5b3ed319fdc116387920c';

/// Liste des immeubles avec taux d'occupation. Tente un rafraîchissement
/// réseau à l'ouverture, avec repli automatique sur le cache local Drift
/// en cas d'échec (voir `PortfolioRepositoryImpl`).

abstract class _$PropertiesListController
    extends $AsyncNotifier<PropertiesListState> {
  FutureOr<PropertiesListState> build();
  @$mustCallSuper
  @override
  void runBuild() {
    final ref =
        this.ref as $Ref<AsyncValue<PropertiesListState>, PropertiesListState>;
    final element =
        ref.element
            as $ClassProviderElement<
              AnyNotifier<AsyncValue<PropertiesListState>, PropertiesListState>,
              AsyncValue<PropertiesListState>,
              Object?,
              Object?
            >;
    element.handleCreate(ref, build);
  }
}
