// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'dunning_providers.dart';

// **************************************************************************
// RiverpodGenerator
// **************************************************************************

// GENERATED CODE - DO NOT MODIFY BY HAND
// ignore_for_file: type=lint, type=warning

@ProviderFor(dunningRemoteDataSource)
final dunningRemoteDataSourceProvider = DunningRemoteDataSourceProvider._();

final class DunningRemoteDataSourceProvider
    extends
        $FunctionalProvider<
          DunningRemoteDataSource,
          DunningRemoteDataSource,
          DunningRemoteDataSource
        >
    with $Provider<DunningRemoteDataSource> {
  DunningRemoteDataSourceProvider._()
    : super(
        from: null,
        argument: null,
        retry: null,
        name: r'dunningRemoteDataSourceProvider',
        isAutoDispose: true,
        dependencies: null,
        $allTransitiveDependencies: null,
      );

  @override
  String debugGetCreateSourceHash() => _$dunningRemoteDataSourceHash();

  @$internal
  @override
  $ProviderElement<DunningRemoteDataSource> $createElement(
    $ProviderPointer pointer,
  ) => $ProviderElement(pointer);

  @override
  DunningRemoteDataSource create(Ref ref) {
    return dunningRemoteDataSource(ref);
  }

  /// {@macro riverpod.override_with_value}
  Override overrideWithValue(DunningRemoteDataSource value) {
    return $ProviderOverride(
      origin: this,
      providerOverride: $SyncValueProvider<DunningRemoteDataSource>(value),
    );
  }
}

String _$dunningRemoteDataSourceHash() =>
    r'6e4c3321d8ff991cc58376dc7957f11f6301cc99';

@ProviderFor(dunningRepository)
final dunningRepositoryProvider = DunningRepositoryProvider._();

final class DunningRepositoryProvider
    extends
        $FunctionalProvider<
          DunningRepository,
          DunningRepository,
          DunningRepository
        >
    with $Provider<DunningRepository> {
  DunningRepositoryProvider._()
    : super(
        from: null,
        argument: null,
        retry: null,
        name: r'dunningRepositoryProvider',
        isAutoDispose: true,
        dependencies: null,
        $allTransitiveDependencies: null,
      );

  @override
  String debugGetCreateSourceHash() => _$dunningRepositoryHash();

  @$internal
  @override
  $ProviderElement<DunningRepository> $createElement(
    $ProviderPointer pointer,
  ) => $ProviderElement(pointer);

  @override
  DunningRepository create(Ref ref) {
    return dunningRepository(ref);
  }

  /// {@macro riverpod.override_with_value}
  Override overrideWithValue(DunningRepository value) {
    return $ProviderOverride(
      origin: this,
      providerOverride: $SyncValueProvider<DunningRepository>(value),
    );
  }
}

String _$dunningRepositoryHash() => r'08d581d3a774e43f872ee8698a3f3abe5932554f';
