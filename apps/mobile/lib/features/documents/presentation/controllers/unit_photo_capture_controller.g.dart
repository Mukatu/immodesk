// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'unit_photo_capture_controller.dart';

// **************************************************************************
// RiverpodGenerator
// **************************************************************************

// GENERATED CODE - DO NOT MODIFY BY HAND
// ignore_for_file: type=lint, type=warning
/// Prise de photo d'un lot : capture caméra, compression 1600 px / qualité
/// 80, puis envoi direct si le réseau est disponible, sinon mise en
/// attente locale dans l'outbox (rejouée au retour du réseau).

@ProviderFor(UnitPhotoCaptureController)
final unitPhotoCaptureControllerProvider =
    UnitPhotoCaptureControllerProvider._();

/// Prise de photo d'un lot : capture caméra, compression 1600 px / qualité
/// 80, puis envoi direct si le réseau est disponible, sinon mise en
/// attente locale dans l'outbox (rejouée au retour du réseau).
final class UnitPhotoCaptureControllerProvider
    extends $NotifierProvider<UnitPhotoCaptureController, PhotoCaptureState> {
  /// Prise de photo d'un lot : capture caméra, compression 1600 px / qualité
  /// 80, puis envoi direct si le réseau est disponible, sinon mise en
  /// attente locale dans l'outbox (rejouée au retour du réseau).
  UnitPhotoCaptureControllerProvider._()
    : super(
        from: null,
        argument: null,
        retry: null,
        name: r'unitPhotoCaptureControllerProvider',
        isAutoDispose: true,
        dependencies: null,
        $allTransitiveDependencies: null,
      );

  @override
  String debugGetCreateSourceHash() => _$unitPhotoCaptureControllerHash();

  @$internal
  @override
  UnitPhotoCaptureController create() => UnitPhotoCaptureController();

  /// {@macro riverpod.override_with_value}
  Override overrideWithValue(PhotoCaptureState value) {
    return $ProviderOverride(
      origin: this,
      providerOverride: $SyncValueProvider<PhotoCaptureState>(value),
    );
  }
}

String _$unitPhotoCaptureControllerHash() =>
    r'e0274259ea321488b4f48eaba979ba994cfcf189';

/// Prise de photo d'un lot : capture caméra, compression 1600 px / qualité
/// 80, puis envoi direct si le réseau est disponible, sinon mise en
/// attente locale dans l'outbox (rejouée au retour du réseau).

abstract class _$UnitPhotoCaptureController
    extends $Notifier<PhotoCaptureState> {
  PhotoCaptureState build();
  @$mustCallSuper
  @override
  void runBuild() {
    final ref = this.ref as $Ref<PhotoCaptureState, PhotoCaptureState>;
    final element =
        ref.element
            as $ClassProviderElement<
              AnyNotifier<PhotoCaptureState, PhotoCaptureState>,
              PhotoCaptureState,
              Object?,
              Object?
            >;
    element.handleCreate(ref, build);
  }
}
