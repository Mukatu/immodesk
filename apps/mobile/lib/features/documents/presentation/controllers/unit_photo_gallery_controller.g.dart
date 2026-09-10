// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'unit_photo_gallery_controller.dart';

// **************************************************************************
// RiverpodGenerator
// **************************************************************************

// GENERATED CODE - DO NOT MODIFY BY HAND
// ignore_for_file: type=lint, type=warning
/// Galerie des photos d'un lot (`GET /v1/documents` + `.../download-url`),
/// complétée par les photos encore en attente d'envoi dans l'outbox.

@ProviderFor(UnitPhotoGalleryController)
final unitPhotoGalleryControllerProvider = UnitPhotoGalleryControllerFamily._();

/// Galerie des photos d'un lot (`GET /v1/documents` + `.../download-url`),
/// complétée par les photos encore en attente d'envoi dans l'outbox.
final class UnitPhotoGalleryControllerProvider
    extends
        $AsyncNotifierProvider<
          UnitPhotoGalleryController,
          UnitPhotoGalleryState
        > {
  /// Galerie des photos d'un lot (`GET /v1/documents` + `.../download-url`),
  /// complétée par les photos encore en attente d'envoi dans l'outbox.
  UnitPhotoGalleryControllerProvider._({
    required UnitPhotoGalleryControllerFamily super.from,
    required String super.argument,
  }) : super(
         retry: null,
         name: r'unitPhotoGalleryControllerProvider',
         isAutoDispose: true,
         dependencies: null,
         $allTransitiveDependencies: null,
       );

  @override
  String debugGetCreateSourceHash() => _$unitPhotoGalleryControllerHash();

  @override
  String toString() {
    return r'unitPhotoGalleryControllerProvider'
        ''
        '($argument)';
  }

  @$internal
  @override
  UnitPhotoGalleryController create() => UnitPhotoGalleryController();

  @override
  bool operator ==(Object other) {
    return other is UnitPhotoGalleryControllerProvider &&
        other.argument == argument;
  }

  @override
  int get hashCode {
    return argument.hashCode;
  }
}

String _$unitPhotoGalleryControllerHash() =>
    r'4811415cd46974d0381bfe095eb7f24236c19920';

/// Galerie des photos d'un lot (`GET /v1/documents` + `.../download-url`),
/// complétée par les photos encore en attente d'envoi dans l'outbox.

final class UnitPhotoGalleryControllerFamily extends $Family
    with
        $ClassFamilyOverride<
          UnitPhotoGalleryController,
          AsyncValue<UnitPhotoGalleryState>,
          UnitPhotoGalleryState,
          FutureOr<UnitPhotoGalleryState>,
          String
        > {
  UnitPhotoGalleryControllerFamily._()
    : super(
        retry: null,
        name: r'unitPhotoGalleryControllerProvider',
        dependencies: null,
        $allTransitiveDependencies: null,
        isAutoDispose: true,
      );

  /// Galerie des photos d'un lot (`GET /v1/documents` + `.../download-url`),
  /// complétée par les photos encore en attente d'envoi dans l'outbox.

  UnitPhotoGalleryControllerProvider call(String unitId) =>
      UnitPhotoGalleryControllerProvider._(argument: unitId, from: this);

  @override
  String toString() => r'unitPhotoGalleryControllerProvider';
}

/// Galerie des photos d'un lot (`GET /v1/documents` + `.../download-url`),
/// complétée par les photos encore en attente d'envoi dans l'outbox.

abstract class _$UnitPhotoGalleryController
    extends $AsyncNotifier<UnitPhotoGalleryState> {
  late final _$args = ref.$arg as String;
  String get unitId => _$args;

  FutureOr<UnitPhotoGalleryState> build(String unitId);
  @$mustCallSuper
  @override
  void runBuild() {
    final ref =
        this.ref
            as $Ref<AsyncValue<UnitPhotoGalleryState>, UnitPhotoGalleryState>;
    final element =
        ref.element
            as $ClassProviderElement<
              AnyNotifier<
                AsyncValue<UnitPhotoGalleryState>,
                UnitPhotoGalleryState
              >,
              AsyncValue<UnitPhotoGalleryState>,
              Object?,
              Object?
            >;
    element.handleCreate(ref, () => build(_$args));
  }
}
