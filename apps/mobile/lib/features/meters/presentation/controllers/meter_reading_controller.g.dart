// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'meter_reading_controller.dart';

// **************************************************************************
// RiverpodGenerator
// **************************************************************************

// GENERATED CODE - DO NOT MODIFY BY HAND
// ignore_for_file: type=lint, type=warning
/// Pilote la saisie d'un relevé pour un compteur. Un seul relevé en cours à
/// la fois (`start` réinitialise), comme l'état des lieux.

@ProviderFor(MeterReadingController)
final meterReadingControllerProvider = MeterReadingControllerProvider._();

/// Pilote la saisie d'un relevé pour un compteur. Un seul relevé en cours à
/// la fois (`start` réinitialise), comme l'état des lieux.
final class MeterReadingControllerProvider
    extends $NotifierProvider<MeterReadingController, MeterReadingState?> {
  /// Pilote la saisie d'un relevé pour un compteur. Un seul relevé en cours à
  /// la fois (`start` réinitialise), comme l'état des lieux.
  MeterReadingControllerProvider._()
    : super(
        from: null,
        argument: null,
        retry: null,
        name: r'meterReadingControllerProvider',
        isAutoDispose: false,
        dependencies: null,
        $allTransitiveDependencies: null,
      );

  @override
  String debugGetCreateSourceHash() => _$meterReadingControllerHash();

  @$internal
  @override
  MeterReadingController create() => MeterReadingController();

  /// {@macro riverpod.override_with_value}
  Override overrideWithValue(MeterReadingState? value) {
    return $ProviderOverride(
      origin: this,
      providerOverride: $SyncValueProvider<MeterReadingState?>(value),
    );
  }
}

String _$meterReadingControllerHash() =>
    r'e1df3f07fcefa36a527db048f89cfea053c7c737';

/// Pilote la saisie d'un relevé pour un compteur. Un seul relevé en cours à
/// la fois (`start` réinitialise), comme l'état des lieux.

abstract class _$MeterReadingController extends $Notifier<MeterReadingState?> {
  MeterReadingState? build();
  @$mustCallSuper
  @override
  void runBuild() {
    final ref = this.ref as $Ref<MeterReadingState?, MeterReadingState?>;
    final element =
        ref.element
            as $ClassProviderElement<
              AnyNotifier<MeterReadingState?, MeterReadingState?>,
              MeterReadingState?,
              Object?,
              Object?
            >;
    element.handleCreate(ref, build);
  }
}
