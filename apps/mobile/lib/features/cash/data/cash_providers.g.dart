// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'cash_providers.dart';

// **************************************************************************
// RiverpodGenerator
// **************************************************************************

// GENERATED CODE - DO NOT MODIFY BY HAND
// ignore_for_file: type=lint, type=warning

@ProviderFor(cashRemoteDataSource)
final cashRemoteDataSourceProvider = CashRemoteDataSourceProvider._();

final class CashRemoteDataSourceProvider
    extends
        $FunctionalProvider<
          CashRemoteDataSource,
          CashRemoteDataSource,
          CashRemoteDataSource
        >
    with $Provider<CashRemoteDataSource> {
  CashRemoteDataSourceProvider._()
    : super(
        from: null,
        argument: null,
        retry: null,
        name: r'cashRemoteDataSourceProvider',
        isAutoDispose: true,
        dependencies: null,
        $allTransitiveDependencies: null,
      );

  @override
  String debugGetCreateSourceHash() => _$cashRemoteDataSourceHash();

  @$internal
  @override
  $ProviderElement<CashRemoteDataSource> $createElement(
    $ProviderPointer pointer,
  ) => $ProviderElement(pointer);

  @override
  CashRemoteDataSource create(Ref ref) {
    return cashRemoteDataSource(ref);
  }

  /// {@macro riverpod.override_with_value}
  Override overrideWithValue(CashRemoteDataSource value) {
    return $ProviderOverride(
      origin: this,
      providerOverride: $SyncValueProvider<CashRemoteDataSource>(value),
    );
  }
}

String _$cashRemoteDataSourceHash() =>
    r'64f0e825a69322032f7bca2b72c1c6d333aa2dc8';

@ProviderFor(cashRepository)
final cashRepositoryProvider = CashRepositoryProvider._();

final class CashRepositoryProvider
    extends $FunctionalProvider<CashRepository, CashRepository, CashRepository>
    with $Provider<CashRepository> {
  CashRepositoryProvider._()
    : super(
        from: null,
        argument: null,
        retry: null,
        name: r'cashRepositoryProvider',
        isAutoDispose: true,
        dependencies: null,
        $allTransitiveDependencies: null,
      );

  @override
  String debugGetCreateSourceHash() => _$cashRepositoryHash();

  @$internal
  @override
  $ProviderElement<CashRepository> $createElement($ProviderPointer pointer) =>
      $ProviderElement(pointer);

  @override
  CashRepository create(Ref ref) {
    return cashRepository(ref);
  }

  /// {@macro riverpod.override_with_value}
  Override overrideWithValue(CashRepository value) {
    return $ProviderOverride(
      origin: this,
      providerOverride: $SyncValueProvider<CashRepository>(value),
    );
  }
}

String _$cashRepositoryHash() => r'9b0fb5cd27461f0a265e0a9f7b4e48c6904e9c92';
