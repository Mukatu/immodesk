// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'inspection_flow_controller.dart';

// **************************************************************************
// RiverpodGenerator
// **************************************************************************

// GENERATED CODE - DO NOT MODIFY BY HAND
// ignore_for_file: type=lint, type=warning
/// Pilote la saisie d'un état des lieux pièce par pièce jusqu'à sa
/// soumission (en ligne, séquence de routes réelles ; hors ligne, une seule
/// opération `INSPECTION_SUBMIT` dans l'outbox — voir
/// `docs/api/phase5-contract.md` et `InspectionOfflinePlan`).

@ProviderFor(InspectionFlowController)
final inspectionFlowControllerProvider = InspectionFlowControllerProvider._();

/// Pilote la saisie d'un état des lieux pièce par pièce jusqu'à sa
/// soumission (en ligne, séquence de routes réelles ; hors ligne, une seule
/// opération `INSPECTION_SUBMIT` dans l'outbox — voir
/// `docs/api/phase5-contract.md` et `InspectionOfflinePlan`).
final class InspectionFlowControllerProvider
    extends $NotifierProvider<InspectionFlowController, InspectionFlowState?> {
  /// Pilote la saisie d'un état des lieux pièce par pièce jusqu'à sa
  /// soumission (en ligne, séquence de routes réelles ; hors ligne, une seule
  /// opération `INSPECTION_SUBMIT` dans l'outbox — voir
  /// `docs/api/phase5-contract.md` et `InspectionOfflinePlan`).
  InspectionFlowControllerProvider._()
    : super(
        from: null,
        argument: null,
        retry: null,
        name: r'inspectionFlowControllerProvider',
        isAutoDispose: false,
        dependencies: null,
        $allTransitiveDependencies: null,
      );

  @override
  String debugGetCreateSourceHash() => _$inspectionFlowControllerHash();

  @$internal
  @override
  InspectionFlowController create() => InspectionFlowController();

  /// {@macro riverpod.override_with_value}
  Override overrideWithValue(InspectionFlowState? value) {
    return $ProviderOverride(
      origin: this,
      providerOverride: $SyncValueProvider<InspectionFlowState?>(value),
    );
  }
}

String _$inspectionFlowControllerHash() =>
    r'109cf78bdd214761d42c53f09a690e090c12fdb5';

/// Pilote la saisie d'un état des lieux pièce par pièce jusqu'à sa
/// soumission (en ligne, séquence de routes réelles ; hors ligne, une seule
/// opération `INSPECTION_SUBMIT` dans l'outbox — voir
/// `docs/api/phase5-contract.md` et `InspectionOfflinePlan`).

abstract class _$InspectionFlowController
    extends $Notifier<InspectionFlowState?> {
  InspectionFlowState? build();
  @$mustCallSuper
  @override
  void runBuild() {
    final ref = this.ref as $Ref<InspectionFlowState?, InspectionFlowState?>;
    final element =
        ref.element
            as $ClassProviderElement<
              AnyNotifier<InspectionFlowState?, InspectionFlowState?>,
              InspectionFlowState?,
              Object?,
              Object?
            >;
    element.handleCreate(ref, build);
  }
}
