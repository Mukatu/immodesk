// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'selected_organization_controller.dart';

// **************************************************************************
// RiverpodGenerator
// **************************************************************************

// GENERATED CODE - DO NOT MODIFY BY HAND
// ignore_for_file: type=lint, type=warning
/// Organisation courante, persistée localement (table Drift `app_settings`)
/// afin de survivre au redémarrage de l'application.

@ProviderFor(SelectedOrganizationController)
final selectedOrganizationControllerProvider =
    SelectedOrganizationControllerProvider._();

/// Organisation courante, persistée localement (table Drift `app_settings`)
/// afin de survivre au redémarrage de l'application.
final class SelectedOrganizationControllerProvider
    extends $AsyncNotifierProvider<SelectedOrganizationController, String?> {
  /// Organisation courante, persistée localement (table Drift `app_settings`)
  /// afin de survivre au redémarrage de l'application.
  SelectedOrganizationControllerProvider._()
    : super(
        from: null,
        argument: null,
        retry: null,
        name: r'selectedOrganizationControllerProvider',
        isAutoDispose: true,
        dependencies: null,
        $allTransitiveDependencies: null,
      );

  @override
  String debugGetCreateSourceHash() => _$selectedOrganizationControllerHash();

  @$internal
  @override
  SelectedOrganizationController create() => SelectedOrganizationController();
}

String _$selectedOrganizationControllerHash() =>
    r'1b9bb843c6406f87f6ff0aeb281caf23119709db';

/// Organisation courante, persistée localement (table Drift `app_settings`)
/// afin de survivre au redémarrage de l'application.

abstract class _$SelectedOrganizationController
    extends $AsyncNotifier<String?> {
  FutureOr<String?> build();
  @$mustCallSuper
  @override
  void runBuild() {
    final ref = this.ref as $Ref<AsyncValue<String?>, String?>;
    final element =
        ref.element
            as $ClassProviderElement<
              AnyNotifier<AsyncValue<String?>, String?>,
              AsyncValue<String?>,
              Object?,
              Object?
            >;
    element.handleCreate(ref, build);
  }
}
