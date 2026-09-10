// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'create_organization_controller.dart';

// **************************************************************************
// RiverpodGenerator
// **************************************************************************

// GENERATED CODE - DO NOT MODIFY BY HAND
// ignore_for_file: type=lint, type=warning
/// Assistant de création minimale d'organisation (Epic 0.D). Le créateur
/// devient automatiquement OWNER côté API.

@ProviderFor(CreateOrganizationController)
final createOrganizationControllerProvider =
    CreateOrganizationControllerProvider._();

/// Assistant de création minimale d'organisation (Epic 0.D). Le créateur
/// devient automatiquement OWNER côté API.
final class CreateOrganizationControllerProvider
    extends $AsyncNotifierProvider<CreateOrganizationController, void> {
  /// Assistant de création minimale d'organisation (Epic 0.D). Le créateur
  /// devient automatiquement OWNER côté API.
  CreateOrganizationControllerProvider._()
    : super(
        from: null,
        argument: null,
        retry: null,
        name: r'createOrganizationControllerProvider',
        isAutoDispose: true,
        dependencies: null,
        $allTransitiveDependencies: null,
      );

  @override
  String debugGetCreateSourceHash() => _$createOrganizationControllerHash();

  @$internal
  @override
  CreateOrganizationController create() => CreateOrganizationController();
}

String _$createOrganizationControllerHash() =>
    r'e6869f10ced972e85248c280f07cdfbd2241b00b';

/// Assistant de création minimale d'organisation (Epic 0.D). Le créateur
/// devient automatiquement OWNER côté API.

abstract class _$CreateOrganizationController extends $AsyncNotifier<void> {
  FutureOr<void> build();
  @$mustCallSuper
  @override
  void runBuild() {
    final ref = this.ref as $Ref<AsyncValue<void>, void>;
    final element =
        ref.element
            as $ClassProviderElement<
              AnyNotifier<AsyncValue<void>, void>,
              AsyncValue<void>,
              Object?,
              Object?
            >;
    element.handleCreate(ref, build);
  }
}
