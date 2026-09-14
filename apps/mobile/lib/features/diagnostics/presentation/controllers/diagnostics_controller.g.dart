// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'diagnostics_controller.dart';

// **************************************************************************
// RiverpodGenerator
// **************************************************************************

// GENERATED CODE - DO NOT MODIFY BY HAND
// ignore_for_file: type=lint, type=warning
/// Écran « à propos / diagnostic » (coquille phase 0, enrichie en phase 5 :
/// préchargement manuel de la tournée, réinitialisation de la base locale
/// chiffrée en cas de perte de clé — `docs/04_plan_de_phases.md` §5.10).

@ProviderFor(DiagnosticsController)
final diagnosticsControllerProvider = DiagnosticsControllerProvider._();

/// Écran « à propos / diagnostic » (coquille phase 0, enrichie en phase 5 :
/// préchargement manuel de la tournée, réinitialisation de la base locale
/// chiffrée en cas de perte de clé — `docs/04_plan_de_phases.md` §5.10).
final class DiagnosticsControllerProvider
    extends $AsyncNotifierProvider<DiagnosticsController, DiagnosticsInfo> {
  /// Écran « à propos / diagnostic » (coquille phase 0, enrichie en phase 5 :
  /// préchargement manuel de la tournée, réinitialisation de la base locale
  /// chiffrée en cas de perte de clé — `docs/04_plan_de_phases.md` §5.10).
  DiagnosticsControllerProvider._()
    : super(
        from: null,
        argument: null,
        retry: null,
        name: r'diagnosticsControllerProvider',
        isAutoDispose: true,
        dependencies: null,
        $allTransitiveDependencies: null,
      );

  @override
  String debugGetCreateSourceHash() => _$diagnosticsControllerHash();

  @$internal
  @override
  DiagnosticsController create() => DiagnosticsController();
}

String _$diagnosticsControllerHash() =>
    r'6890f103d7b0cd20ec013b4228e93020f44899e2';

/// Écran « à propos / diagnostic » (coquille phase 0, enrichie en phase 5 :
/// préchargement manuel de la tournée, réinitialisation de la base locale
/// chiffrée en cas de perte de clé — `docs/04_plan_de_phases.md` §5.10).

abstract class _$DiagnosticsController extends $AsyncNotifier<DiagnosticsInfo> {
  FutureOr<DiagnosticsInfo> build();
  @$mustCallSuper
  @override
  void runBuild() {
    final ref = this.ref as $Ref<AsyncValue<DiagnosticsInfo>, DiagnosticsInfo>;
    final element =
        ref.element
            as $ClassProviderElement<
              AnyNotifier<AsyncValue<DiagnosticsInfo>, DiagnosticsInfo>,
              AsyncValue<DiagnosticsInfo>,
              Object?,
              Object?
            >;
    element.handleCreate(ref, build);
  }
}
