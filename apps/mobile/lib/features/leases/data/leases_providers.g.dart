// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'leases_providers.dart';

// **************************************************************************
// RiverpodGenerator
// **************************************************************************

// GENERATED CODE - DO NOT MODIFY BY HAND
// ignore_for_file: type=lint, type=warning

@ProviderFor(leasesRemoteDataSource)
final leasesRemoteDataSourceProvider = LeasesRemoteDataSourceProvider._();

final class LeasesRemoteDataSourceProvider
    extends
        $FunctionalProvider<
          LeasesRemoteDataSource,
          LeasesRemoteDataSource,
          LeasesRemoteDataSource
        >
    with $Provider<LeasesRemoteDataSource> {
  LeasesRemoteDataSourceProvider._()
    : super(
        from: null,
        argument: null,
        retry: null,
        name: r'leasesRemoteDataSourceProvider',
        isAutoDispose: true,
        dependencies: null,
        $allTransitiveDependencies: null,
      );

  @override
  String debugGetCreateSourceHash() => _$leasesRemoteDataSourceHash();

  @$internal
  @override
  $ProviderElement<LeasesRemoteDataSource> $createElement(
    $ProviderPointer pointer,
  ) => $ProviderElement(pointer);

  @override
  LeasesRemoteDataSource create(Ref ref) {
    return leasesRemoteDataSource(ref);
  }

  /// {@macro riverpod.override_with_value}
  Override overrideWithValue(LeasesRemoteDataSource value) {
    return $ProviderOverride(
      origin: this,
      providerOverride: $SyncValueProvider<LeasesRemoteDataSource>(value),
    );
  }
}

String _$leasesRemoteDataSourceHash() =>
    r'bec66b565d037a93c62bd136dbaf6f1ee61a0d7c';

@ProviderFor(leasesRepository)
final leasesRepositoryProvider = LeasesRepositoryProvider._();

final class LeasesRepositoryProvider
    extends
        $FunctionalProvider<
          LeasesRepository,
          LeasesRepository,
          LeasesRepository
        >
    with $Provider<LeasesRepository> {
  LeasesRepositoryProvider._()
    : super(
        from: null,
        argument: null,
        retry: null,
        name: r'leasesRepositoryProvider',
        isAutoDispose: true,
        dependencies: null,
        $allTransitiveDependencies: null,
      );

  @override
  String debugGetCreateSourceHash() => _$leasesRepositoryHash();

  @$internal
  @override
  $ProviderElement<LeasesRepository> $createElement($ProviderPointer pointer) =>
      $ProviderElement(pointer);

  @override
  LeasesRepository create(Ref ref) {
    return leasesRepository(ref);
  }

  /// {@macro riverpod.override_with_value}
  Override overrideWithValue(LeasesRepository value) {
    return $ProviderOverride(
      origin: this,
      providerOverride: $SyncValueProvider<LeasesRepository>(value),
    );
  }
}

String _$leasesRepositoryHash() => r'3ec51495dd4d2829fe34e4b76d2d24efe1aa0dce';
