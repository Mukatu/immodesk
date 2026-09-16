// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'maintenance_providers.dart';

// **************************************************************************
// RiverpodGenerator
// **************************************************************************

// GENERATED CODE - DO NOT MODIFY BY HAND
// ignore_for_file: type=lint, type=warning

@ProviderFor(maintenanceRemoteDataSource)
final maintenanceRemoteDataSourceProvider =
    MaintenanceRemoteDataSourceProvider._();

final class MaintenanceRemoteDataSourceProvider
    extends
        $FunctionalProvider<
          MaintenanceRemoteDataSource,
          MaintenanceRemoteDataSource,
          MaintenanceRemoteDataSource
        >
    with $Provider<MaintenanceRemoteDataSource> {
  MaintenanceRemoteDataSourceProvider._()
    : super(
        from: null,
        argument: null,
        retry: null,
        name: r'maintenanceRemoteDataSourceProvider',
        isAutoDispose: true,
        dependencies: null,
        $allTransitiveDependencies: null,
      );

  @override
  String debugGetCreateSourceHash() => _$maintenanceRemoteDataSourceHash();

  @$internal
  @override
  $ProviderElement<MaintenanceRemoteDataSource> $createElement(
    $ProviderPointer pointer,
  ) => $ProviderElement(pointer);

  @override
  MaintenanceRemoteDataSource create(Ref ref) {
    return maintenanceRemoteDataSource(ref);
  }

  /// {@macro riverpod.override_with_value}
  Override overrideWithValue(MaintenanceRemoteDataSource value) {
    return $ProviderOverride(
      origin: this,
      providerOverride: $SyncValueProvider<MaintenanceRemoteDataSource>(value),
    );
  }
}

String _$maintenanceRemoteDataSourceHash() =>
    r'17d11307b4dbbca5cfd9105917562f2dbba2be1f';

@ProviderFor(maintenanceRepository)
final maintenanceRepositoryProvider = MaintenanceRepositoryProvider._();

final class MaintenanceRepositoryProvider
    extends
        $FunctionalProvider<
          MaintenanceRepository,
          MaintenanceRepository,
          MaintenanceRepository
        >
    with $Provider<MaintenanceRepository> {
  MaintenanceRepositoryProvider._()
    : super(
        from: null,
        argument: null,
        retry: null,
        name: r'maintenanceRepositoryProvider',
        isAutoDispose: true,
        dependencies: null,
        $allTransitiveDependencies: null,
      );

  @override
  String debugGetCreateSourceHash() => _$maintenanceRepositoryHash();

  @$internal
  @override
  $ProviderElement<MaintenanceRepository> $createElement(
    $ProviderPointer pointer,
  ) => $ProviderElement(pointer);

  @override
  MaintenanceRepository create(Ref ref) {
    return maintenanceRepository(ref);
  }

  /// {@macro riverpod.override_with_value}
  Override overrideWithValue(MaintenanceRepository value) {
    return $ProviderOverride(
      origin: this,
      providerOverride: $SyncValueProvider<MaintenanceRepository>(value),
    );
  }
}

String _$maintenanceRepositoryHash() =>
    r'b52be1ca7b35cfa0c4166f0c670ff467b2122899';
