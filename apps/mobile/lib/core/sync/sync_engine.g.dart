// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'sync_engine.dart';

// **************************************************************************
// RiverpodGenerator
// **************************************************************************

// GENERATED CODE - DO NOT MODIFY BY HAND
// ignore_for_file: type=lint, type=warning

@ProviderFor(syncDeviceId)
final syncDeviceIdProvider = SyncDeviceIdProvider._();

final class SyncDeviceIdProvider
    extends $FunctionalProvider<AsyncValue<String>, String, FutureOr<String>>
    with $FutureModifier<String>, $FutureProvider<String> {
  SyncDeviceIdProvider._()
    : super(
        from: null,
        argument: null,
        retry: null,
        name: r'syncDeviceIdProvider',
        isAutoDispose: true,
        dependencies: null,
        $allTransitiveDependencies: null,
      );

  @override
  String debugGetCreateSourceHash() => _$syncDeviceIdHash();

  @$internal
  @override
  $FutureProviderElement<String> $createElement($ProviderPointer pointer) =>
      $FutureProviderElement(pointer);

  @override
  FutureOr<String> create(Ref ref) {
    return syncDeviceId(ref);
  }
}

String _$syncDeviceIdHash() => r'0351ffee895495966472c30b3bdd5316dfc532de';
