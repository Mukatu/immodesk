// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'inspections_providers.dart';

// **************************************************************************
// RiverpodGenerator
// **************************************************************************

// GENERATED CODE - DO NOT MODIFY BY HAND
// ignore_for_file: type=lint, type=warning

@ProviderFor(inspectionsRemoteDataSource)
final inspectionsRemoteDataSourceProvider =
    InspectionsRemoteDataSourceProvider._();

final class InspectionsRemoteDataSourceProvider
    extends
        $FunctionalProvider<
          InspectionsRemoteDataSource,
          InspectionsRemoteDataSource,
          InspectionsRemoteDataSource
        >
    with $Provider<InspectionsRemoteDataSource> {
  InspectionsRemoteDataSourceProvider._()
    : super(
        from: null,
        argument: null,
        retry: null,
        name: r'inspectionsRemoteDataSourceProvider',
        isAutoDispose: true,
        dependencies: null,
        $allTransitiveDependencies: null,
      );

  @override
  String debugGetCreateSourceHash() => _$inspectionsRemoteDataSourceHash();

  @$internal
  @override
  $ProviderElement<InspectionsRemoteDataSource> $createElement(
    $ProviderPointer pointer,
  ) => $ProviderElement(pointer);

  @override
  InspectionsRemoteDataSource create(Ref ref) {
    return inspectionsRemoteDataSource(ref);
  }

  /// {@macro riverpod.override_with_value}
  Override overrideWithValue(InspectionsRemoteDataSource value) {
    return $ProviderOverride(
      origin: this,
      providerOverride: $SyncValueProvider<InspectionsRemoteDataSource>(value),
    );
  }
}

String _$inspectionsRemoteDataSourceHash() =>
    r'fb665e9a1209da0b8500eafcdc3c6e0bf3d3611d';

@ProviderFor(inspectionsRepository)
final inspectionsRepositoryProvider = InspectionsRepositoryProvider._();

final class InspectionsRepositoryProvider
    extends
        $FunctionalProvider<
          InspectionsRepository,
          InspectionsRepository,
          InspectionsRepository
        >
    with $Provider<InspectionsRepository> {
  InspectionsRepositoryProvider._()
    : super(
        from: null,
        argument: null,
        retry: null,
        name: r'inspectionsRepositoryProvider',
        isAutoDispose: true,
        dependencies: null,
        $allTransitiveDependencies: null,
      );

  @override
  String debugGetCreateSourceHash() => _$inspectionsRepositoryHash();

  @$internal
  @override
  $ProviderElement<InspectionsRepository> $createElement(
    $ProviderPointer pointer,
  ) => $ProviderElement(pointer);

  @override
  InspectionsRepository create(Ref ref) {
    return inspectionsRepository(ref);
  }

  /// {@macro riverpod.override_with_value}
  Override overrideWithValue(InspectionsRepository value) {
    return $ProviderOverride(
      origin: this,
      providerOverride: $SyncValueProvider<InspectionsRepository>(value),
    );
  }
}

String _$inspectionsRepositoryHash() =>
    r'09cf3aa390415a277841409000ac8b00b75f0ddd';
