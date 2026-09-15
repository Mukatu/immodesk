// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'mandates_providers.dart';

// **************************************************************************
// RiverpodGenerator
// **************************************************************************

// GENERATED CODE - DO NOT MODIFY BY HAND
// ignore_for_file: type=lint, type=warning

@ProviderFor(mandatesRemoteDataSource)
final mandatesRemoteDataSourceProvider = MandatesRemoteDataSourceProvider._();

final class MandatesRemoteDataSourceProvider
    extends
        $FunctionalProvider<
          MandatesRemoteDataSource,
          MandatesRemoteDataSource,
          MandatesRemoteDataSource
        >
    with $Provider<MandatesRemoteDataSource> {
  MandatesRemoteDataSourceProvider._()
    : super(
        from: null,
        argument: null,
        retry: null,
        name: r'mandatesRemoteDataSourceProvider',
        isAutoDispose: true,
        dependencies: null,
        $allTransitiveDependencies: null,
      );

  @override
  String debugGetCreateSourceHash() => _$mandatesRemoteDataSourceHash();

  @$internal
  @override
  $ProviderElement<MandatesRemoteDataSource> $createElement(
    $ProviderPointer pointer,
  ) => $ProviderElement(pointer);

  @override
  MandatesRemoteDataSource create(Ref ref) {
    return mandatesRemoteDataSource(ref);
  }

  /// {@macro riverpod.override_with_value}
  Override overrideWithValue(MandatesRemoteDataSource value) {
    return $ProviderOverride(
      origin: this,
      providerOverride: $SyncValueProvider<MandatesRemoteDataSource>(value),
    );
  }
}

String _$mandatesRemoteDataSourceHash() =>
    r'ce51e0ce1f582982ee9fd2c3999e0dbc1095eaa9';

@ProviderFor(mandatesRepository)
final mandatesRepositoryProvider = MandatesRepositoryProvider._();

final class MandatesRepositoryProvider
    extends
        $FunctionalProvider<
          MandatesRepository,
          MandatesRepository,
          MandatesRepository
        >
    with $Provider<MandatesRepository> {
  MandatesRepositoryProvider._()
    : super(
        from: null,
        argument: null,
        retry: null,
        name: r'mandatesRepositoryProvider',
        isAutoDispose: true,
        dependencies: null,
        $allTransitiveDependencies: null,
      );

  @override
  String debugGetCreateSourceHash() => _$mandatesRepositoryHash();

  @$internal
  @override
  $ProviderElement<MandatesRepository> $createElement(
    $ProviderPointer pointer,
  ) => $ProviderElement(pointer);

  @override
  MandatesRepository create(Ref ref) {
    return mandatesRepository(ref);
  }

  /// {@macro riverpod.override_with_value}
  Override overrideWithValue(MandatesRepository value) {
    return $ProviderOverride(
      origin: this,
      providerOverride: $SyncValueProvider<MandatesRepository>(value),
    );
  }
}

String _$mandatesRepositoryHash() =>
    r'55d0905b4f30788cbd5d1ca0e371305d3d0f03ed';
