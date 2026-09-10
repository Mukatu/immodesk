// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'diagnostics_controller.dart';

// **************************************************************************
// RiverpodGenerator
// **************************************************************************

// GENERATED CODE - DO NOT MODIFY BY HAND
// ignore_for_file: type=lint, type=warning
/// Écran « à propos / diagnostic » (coquille phase 0, enrichie en phase 5).

@ProviderFor(DiagnosticsController)
final diagnosticsControllerProvider = DiagnosticsControllerProvider._();

/// Écran « à propos / diagnostic » (coquille phase 0, enrichie en phase 5).
final class DiagnosticsControllerProvider
    extends $AsyncNotifierProvider<DiagnosticsController, DiagnosticsInfo> {
  /// Écran « à propos / diagnostic » (coquille phase 0, enrichie en phase 5).
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
    r'7289dc2bf50b91b61535b8109ed84c6d2cad25c2';

/// Écran « à propos / diagnostic » (coquille phase 0, enrichie en phase 5).

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
