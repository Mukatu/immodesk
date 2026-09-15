// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'landlord_portal_providers.dart';

// **************************************************************************
// RiverpodGenerator
// **************************************************************************

// GENERATED CODE - DO NOT MODIFY BY HAND
// ignore_for_file: type=lint, type=warning

@ProviderFor(landlordPortalRemoteDataSource)
final landlordPortalRemoteDataSourceProvider =
    LandlordPortalRemoteDataSourceProvider._();

final class LandlordPortalRemoteDataSourceProvider
    extends
        $FunctionalProvider<
          LandlordPortalRemoteDataSource,
          LandlordPortalRemoteDataSource,
          LandlordPortalRemoteDataSource
        >
    with $Provider<LandlordPortalRemoteDataSource> {
  LandlordPortalRemoteDataSourceProvider._()
    : super(
        from: null,
        argument: null,
        retry: null,
        name: r'landlordPortalRemoteDataSourceProvider',
        isAutoDispose: true,
        dependencies: null,
        $allTransitiveDependencies: null,
      );

  @override
  String debugGetCreateSourceHash() => _$landlordPortalRemoteDataSourceHash();

  @$internal
  @override
  $ProviderElement<LandlordPortalRemoteDataSource> $createElement(
    $ProviderPointer pointer,
  ) => $ProviderElement(pointer);

  @override
  LandlordPortalRemoteDataSource create(Ref ref) {
    return landlordPortalRemoteDataSource(ref);
  }

  /// {@macro riverpod.override_with_value}
  Override overrideWithValue(LandlordPortalRemoteDataSource value) {
    return $ProviderOverride(
      origin: this,
      providerOverride: $SyncValueProvider<LandlordPortalRemoteDataSource>(
        value,
      ),
    );
  }
}

String _$landlordPortalRemoteDataSourceHash() =>
    r'bbf58d2bfc097da5746407f7bf17c6b1265e3d72';

@ProviderFor(landlordPortalRepository)
final landlordPortalRepositoryProvider = LandlordPortalRepositoryProvider._();

final class LandlordPortalRepositoryProvider
    extends
        $FunctionalProvider<
          LandlordPortalRepository,
          LandlordPortalRepository,
          LandlordPortalRepository
        >
    with $Provider<LandlordPortalRepository> {
  LandlordPortalRepositoryProvider._()
    : super(
        from: null,
        argument: null,
        retry: null,
        name: r'landlordPortalRepositoryProvider',
        isAutoDispose: true,
        dependencies: null,
        $allTransitiveDependencies: null,
      );

  @override
  String debugGetCreateSourceHash() => _$landlordPortalRepositoryHash();

  @$internal
  @override
  $ProviderElement<LandlordPortalRepository> $createElement(
    $ProviderPointer pointer,
  ) => $ProviderElement(pointer);

  @override
  LandlordPortalRepository create(Ref ref) {
    return landlordPortalRepository(ref);
  }

  /// {@macro riverpod.override_with_value}
  Override overrideWithValue(LandlordPortalRepository value) {
    return $ProviderOverride(
      origin: this,
      providerOverride: $SyncValueProvider<LandlordPortalRepository>(value),
    );
  }
}

String _$landlordPortalRepositoryHash() =>
    r'e6b33fd494bab99f1e5d1ed332db5bd063b70e77';
