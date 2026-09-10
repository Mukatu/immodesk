// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'tenants_list_controller.dart';

// **************************************************************************
// RiverpodGenerator
// **************************************************************************

// GENERATED CODE - DO NOT MODIFY BY HAND
// ignore_for_file: type=lint, type=warning
/// Liste des locataires avec recherche locale par nom ou téléphone.

@ProviderFor(TenantsListController)
final tenantsListControllerProvider = TenantsListControllerProvider._();

/// Liste des locataires avec recherche locale par nom ou téléphone.
final class TenantsListControllerProvider
    extends $AsyncNotifierProvider<TenantsListController, TenantsListState> {
  /// Liste des locataires avec recherche locale par nom ou téléphone.
  TenantsListControllerProvider._()
    : super(
        from: null,
        argument: null,
        retry: null,
        name: r'tenantsListControllerProvider',
        isAutoDispose: true,
        dependencies: null,
        $allTransitiveDependencies: null,
      );

  @override
  String debugGetCreateSourceHash() => _$tenantsListControllerHash();

  @$internal
  @override
  TenantsListController create() => TenantsListController();
}

String _$tenantsListControllerHash() =>
    r'bdc06c414980d6b5e5a7dc7f86ab713bf3bf8a60';

/// Liste des locataires avec recherche locale par nom ou téléphone.

abstract class _$TenantsListController
    extends $AsyncNotifier<TenantsListState> {
  FutureOr<TenantsListState> build();
  @$mustCallSuper
  @override
  void runBuild() {
    final ref =
        this.ref as $Ref<AsyncValue<TenantsListState>, TenantsListState>;
    final element =
        ref.element
            as $ClassProviderElement<
              AnyNotifier<AsyncValue<TenantsListState>, TenantsListState>,
              AsyncValue<TenantsListState>,
              Object?,
              Object?
            >;
    element.handleCreate(ref, build);
  }
}
