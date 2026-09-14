// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'pull_service.dart';

// **************************************************************************
// RiverpodGenerator
// **************************************************************************

// GENERATED CODE - DO NOT MODIFY BY HAND
// ignore_for_file: type=lint, type=warning

@ProviderFor(pullService)
final pullServiceProvider = PullServiceProvider._();

final class PullServiceProvider
    extends $FunctionalProvider<PullService, PullService, PullService>
    with $Provider<PullService> {
  PullServiceProvider._()
    : super(
        from: null,
        argument: null,
        retry: null,
        name: r'pullServiceProvider',
        isAutoDispose: true,
        dependencies: null,
        $allTransitiveDependencies: null,
      );

  @override
  String debugGetCreateSourceHash() => _$pullServiceHash();

  @$internal
  @override
  $ProviderElement<PullService> $createElement($ProviderPointer pointer) =>
      $ProviderElement(pointer);

  @override
  PullService create(Ref ref) {
    return pullService(ref);
  }

  /// {@macro riverpod.override_with_value}
  Override overrideWithValue(PullService value) {
    return $ProviderOverride(
      origin: this,
      providerOverride: $SyncValueProvider<PullService>(value),
    );
  }
}

String _$pullServiceHash() => r'3e7dded371efb05cc02bd67ab4b02576bd9bbce9';
