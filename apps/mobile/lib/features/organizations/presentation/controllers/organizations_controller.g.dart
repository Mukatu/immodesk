// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'organizations_controller.dart';

// **************************************************************************
// RiverpodGenerator
// **************************************************************************

// GENERATED CODE - DO NOT MODIFY BY HAND
// ignore_for_file: type=lint, type=warning
/// Liste des organisations de l'utilisateur courant (dérivée de la
/// session applicative, elle-même alimentée par `GET /v1/me`).

@ProviderFor(OrganizationsController)
final organizationsControllerProvider = OrganizationsControllerProvider._();

/// Liste des organisations de l'utilisateur courant (dérivée de la
/// session applicative, elle-même alimentée par `GET /v1/me`).
final class OrganizationsControllerProvider
    extends
        $AsyncNotifierProvider<
          OrganizationsController,
          List<OrganizationMembership>
        > {
  /// Liste des organisations de l'utilisateur courant (dérivée de la
  /// session applicative, elle-même alimentée par `GET /v1/me`).
  OrganizationsControllerProvider._()
    : super(
        from: null,
        argument: null,
        retry: null,
        name: r'organizationsControllerProvider',
        isAutoDispose: true,
        dependencies: null,
        $allTransitiveDependencies: null,
      );

  @override
  String debugGetCreateSourceHash() => _$organizationsControllerHash();

  @$internal
  @override
  OrganizationsController create() => OrganizationsController();
}

String _$organizationsControllerHash() =>
    r'c4aff2fc5898a2388458da74ef7b454da3ddab53';

/// Liste des organisations de l'utilisateur courant (dérivée de la
/// session applicative, elle-même alimentée par `GET /v1/me`).

abstract class _$OrganizationsController
    extends $AsyncNotifier<List<OrganizationMembership>> {
  FutureOr<List<OrganizationMembership>> build();
  @$mustCallSuper
  @override
  void runBuild() {
    final ref =
        this.ref
            as $Ref<
              AsyncValue<List<OrganizationMembership>>,
              List<OrganizationMembership>
            >;
    final element =
        ref.element
            as $ClassProviderElement<
              AnyNotifier<
                AsyncValue<List<OrganizationMembership>>,
                List<OrganizationMembership>
              >,
              AsyncValue<List<OrganizationMembership>>,
              Object?,
              Object?
            >;
    element.handleCreate(ref, build);
  }
}
