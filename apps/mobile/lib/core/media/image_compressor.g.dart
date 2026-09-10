// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'image_compressor.dart';

// **************************************************************************
// RiverpodGenerator
// **************************************************************************

// GENERATED CODE - DO NOT MODIFY BY HAND
// ignore_for_file: type=lint, type=warning

@ProviderFor(imageCompressor)
final imageCompressorProvider = ImageCompressorProvider._();

final class ImageCompressorProvider
    extends
        $FunctionalProvider<ImageCompressor, ImageCompressor, ImageCompressor>
    with $Provider<ImageCompressor> {
  ImageCompressorProvider._()
    : super(
        from: null,
        argument: null,
        retry: null,
        name: r'imageCompressorProvider',
        isAutoDispose: true,
        dependencies: null,
        $allTransitiveDependencies: null,
      );

  @override
  String debugGetCreateSourceHash() => _$imageCompressorHash();

  @$internal
  @override
  $ProviderElement<ImageCompressor> $createElement($ProviderPointer pointer) =>
      $ProviderElement(pointer);

  @override
  ImageCompressor create(Ref ref) {
    return imageCompressor(ref);
  }

  /// {@macro riverpod.override_with_value}
  Override overrideWithValue(ImageCompressor value) {
    return $ProviderOverride(
      origin: this,
      providerOverride: $SyncValueProvider<ImageCompressor>(value),
    );
  }
}

String _$imageCompressorHash() => r'b70214a126fddaa0be914b5b7859bbf84559c76d';
