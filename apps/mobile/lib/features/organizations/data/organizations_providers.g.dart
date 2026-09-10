// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'organizations_providers.dart';

// **************************************************************************
// RiverpodGenerator
// **************************************************************************

// GENERATED CODE - DO NOT MODIFY BY HAND
// ignore_for_file: type=lint, type=warning

@ProviderFor(organizationsRemoteDataSource)
final organizationsRemoteDataSourceProvider =
    OrganizationsRemoteDataSourceProvider._();

final class OrganizationsRemoteDataSourceProvider
    extends
        $FunctionalProvider<
          OrganizationsRemoteDataSource,
          OrganizationsRemoteDataSource,
          OrganizationsRemoteDataSource
        >
    with $Provider<OrganizationsRemoteDataSource> {
  OrganizationsRemoteDataSourceProvider._()
    : super(
        from: null,
        argument: null,
        retry: null,
        name: r'organizationsRemoteDataSourceProvider',
        isAutoDispose: true,
        dependencies: null,
        $allTransitiveDependencies: null,
      );

  @override
  String debugGetCreateSourceHash() => _$organizationsRemoteDataSourceHash();

  @$internal
  @override
  $ProviderElement<OrganizationsRemoteDataSource> $createElement(
    $ProviderPointer pointer,
  ) => $ProviderElement(pointer);

  @override
  OrganizationsRemoteDataSource create(Ref ref) {
    return organizationsRemoteDataSource(ref);
  }

  /// {@macro riverpod.override_with_value}
  Override overrideWithValue(OrganizationsRemoteDataSource value) {
    return $ProviderOverride(
      origin: this,
      providerOverride: $SyncValueProvider<OrganizationsRemoteDataSource>(
        value,
      ),
    );
  }
}

String _$organizationsRemoteDataSourceHash() =>
    r'b267dfbd50da463c193e6f2d123d01f7c2de99f8';

@ProviderFor(organizationsRepository)
final organizationsRepositoryProvider = OrganizationsRepositoryProvider._();

final class OrganizationsRepositoryProvider
    extends
        $FunctionalProvider<
          OrganizationsRepository,
          OrganizationsRepository,
          OrganizationsRepository
        >
    with $Provider<OrganizationsRepository> {
  OrganizationsRepositoryProvider._()
    : super(
        from: null,
        argument: null,
        retry: null,
        name: r'organizationsRepositoryProvider',
        isAutoDispose: true,
        dependencies: null,
        $allTransitiveDependencies: null,
      );

  @override
  String debugGetCreateSourceHash() => _$organizationsRepositoryHash();

  @$internal
  @override
  $ProviderElement<OrganizationsRepository> $createElement(
    $ProviderPointer pointer,
  ) => $ProviderElement(pointer);

  @override
  OrganizationsRepository create(Ref ref) {
    return organizationsRepository(ref);
  }

  /// {@macro riverpod.override_with_value}
  Override overrideWithValue(OrganizationsRepository value) {
    return $ProviderOverride(
      origin: this,
      providerOverride: $SyncValueProvider<OrganizationsRepository>(value),
    );
  }
}

String _$organizationsRepositoryHash() =>
    r'5d807a06a60932d6c45ae19bf49b1a64533ad7e2';
