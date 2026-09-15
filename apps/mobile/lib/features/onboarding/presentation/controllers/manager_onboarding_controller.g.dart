// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'manager_onboarding_controller.dart';

// **************************************************************************
// RiverpodGenerator
// **************************************************************************

// GENERATED CODE - DO NOT MODIFY BY HAND
// ignore_for_file: type=lint, type=warning
/// Contrôleur du parcours d'onboarding du gestionnaire indépendant, conçu
/// pour tenir en moins de dix minutes (`docs/04_plan_de_phases.md` §7.3,
/// épic 7.F) : organisation, premier bailleur, premier immeuble, premier
/// mandat avec la commission par défaut de 10 % — un seul appel réseau à
/// la fin du parcours (transaction unique côté API).

@ProviderFor(ManagerOnboardingController)
final managerOnboardingControllerProvider =
    ManagerOnboardingControllerProvider._();

/// Contrôleur du parcours d'onboarding du gestionnaire indépendant, conçu
/// pour tenir en moins de dix minutes (`docs/04_plan_de_phases.md` §7.3,
/// épic 7.F) : organisation, premier bailleur, premier immeuble, premier
/// mandat avec la commission par défaut de 10 % — un seul appel réseau à
/// la fin du parcours (transaction unique côté API).
final class ManagerOnboardingControllerProvider
    extends $AsyncNotifierProvider<ManagerOnboardingController, void> {
  /// Contrôleur du parcours d'onboarding du gestionnaire indépendant, conçu
  /// pour tenir en moins de dix minutes (`docs/04_plan_de_phases.md` §7.3,
  /// épic 7.F) : organisation, premier bailleur, premier immeuble, premier
  /// mandat avec la commission par défaut de 10 % — un seul appel réseau à
  /// la fin du parcours (transaction unique côté API).
  ManagerOnboardingControllerProvider._()
    : super(
        from: null,
        argument: null,
        retry: null,
        name: r'managerOnboardingControllerProvider',
        isAutoDispose: true,
        dependencies: null,
        $allTransitiveDependencies: null,
      );

  @override
  String debugGetCreateSourceHash() => _$managerOnboardingControllerHash();

  @$internal
  @override
  ManagerOnboardingController create() => ManagerOnboardingController();
}

String _$managerOnboardingControllerHash() =>
    r'952da3b98d2a7608540dad650cd5b68ffe716740';

/// Contrôleur du parcours d'onboarding du gestionnaire indépendant, conçu
/// pour tenir en moins de dix minutes (`docs/04_plan_de_phases.md` §7.3,
/// épic 7.F) : organisation, premier bailleur, premier immeuble, premier
/// mandat avec la commission par défaut de 10 % — un seul appel réseau à
/// la fin du parcours (transaction unique côté API).

abstract class _$ManagerOnboardingController extends $AsyncNotifier<void> {
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
