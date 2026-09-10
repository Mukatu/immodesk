// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'photo_outbox_service.dart';

// **************************************************************************
// RiverpodGenerator
// **************************************************************************

// GENERATED CODE - DO NOT MODIFY BY HAND
// ignore_for_file: type=lint, type=warning

@ProviderFor(photoOutboxService)
final photoOutboxServiceProvider = PhotoOutboxServiceProvider._();

final class PhotoOutboxServiceProvider
    extends
        $FunctionalProvider<
          PhotoOutboxService,
          PhotoOutboxService,
          PhotoOutboxService
        >
    with $Provider<PhotoOutboxService> {
  PhotoOutboxServiceProvider._()
    : super(
        from: null,
        argument: null,
        retry: null,
        name: r'photoOutboxServiceProvider',
        isAutoDispose: true,
        dependencies: null,
        $allTransitiveDependencies: null,
      );

  @override
  String debugGetCreateSourceHash() => _$photoOutboxServiceHash();

  @$internal
  @override
  $ProviderElement<PhotoOutboxService> $createElement(
    $ProviderPointer pointer,
  ) => $ProviderElement(pointer);

  @override
  PhotoOutboxService create(Ref ref) {
    return photoOutboxService(ref);
  }

  /// {@macro riverpod.override_with_value}
  Override overrideWithValue(PhotoOutboxService value) {
    return $ProviderOverride(
      origin: this,
      providerOverride: $SyncValueProvider<PhotoOutboxService>(value),
    );
  }
}

String _$photoOutboxServiceHash() =>
    r'bb6b6d7a597763e9f5a343190bf504c92a144da0';
