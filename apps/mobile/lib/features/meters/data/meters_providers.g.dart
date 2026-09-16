// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'meters_providers.dart';

// **************************************************************************
// RiverpodGenerator
// **************************************************************************

// GENERATED CODE - DO NOT MODIFY BY HAND
// ignore_for_file: type=lint, type=warning

@ProviderFor(metersRemoteDataSource)
final metersRemoteDataSourceProvider = MetersRemoteDataSourceProvider._();

final class MetersRemoteDataSourceProvider
    extends
        $FunctionalProvider<
          MetersRemoteDataSource,
          MetersRemoteDataSource,
          MetersRemoteDataSource
        >
    with $Provider<MetersRemoteDataSource> {
  MetersRemoteDataSourceProvider._()
    : super(
        from: null,
        argument: null,
        retry: null,
        name: r'metersRemoteDataSourceProvider',
        isAutoDispose: true,
        dependencies: null,
        $allTransitiveDependencies: null,
      );

  @override
  String debugGetCreateSourceHash() => _$metersRemoteDataSourceHash();

  @$internal
  @override
  $ProviderElement<MetersRemoteDataSource> $createElement(
    $ProviderPointer pointer,
  ) => $ProviderElement(pointer);

  @override
  MetersRemoteDataSource create(Ref ref) {
    return metersRemoteDataSource(ref);
  }

  /// {@macro riverpod.override_with_value}
  Override overrideWithValue(MetersRemoteDataSource value) {
    return $ProviderOverride(
      origin: this,
      providerOverride: $SyncValueProvider<MetersRemoteDataSource>(value),
    );
  }
}

String _$metersRemoteDataSourceHash() =>
    r'6f162294bbd0aa620cf2b621e7b0eb8f31d57942';

@ProviderFor(metersRepository)
final metersRepositoryProvider = MetersRepositoryProvider._();

final class MetersRepositoryProvider
    extends
        $FunctionalProvider<
          MetersRepository,
          MetersRepository,
          MetersRepository
        >
    with $Provider<MetersRepository> {
  MetersRepositoryProvider._()
    : super(
        from: null,
        argument: null,
        retry: null,
        name: r'metersRepositoryProvider',
        isAutoDispose: true,
        dependencies: null,
        $allTransitiveDependencies: null,
      );

  @override
  String debugGetCreateSourceHash() => _$metersRepositoryHash();

  @$internal
  @override
  $ProviderElement<MetersRepository> $createElement($ProviderPointer pointer) =>
      $ProviderElement(pointer);

  @override
  MetersRepository create(Ref ref) {
    return metersRepository(ref);
  }

  /// {@macro riverpod.override_with_value}
  Override overrideWithValue(MetersRepository value) {
    return $ProviderOverride(
      origin: this,
      providerOverride: $SyncValueProvider<MetersRepository>(value),
    );
  }
}

String _$metersRepositoryHash() => r'8b2d399dbad34f12ec60fbfcc3a38f37002876ad';
