// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'portfolio_providers.dart';

// **************************************************************************
// RiverpodGenerator
// **************************************************************************

// GENERATED CODE - DO NOT MODIFY BY HAND
// ignore_for_file: type=lint, type=warning

@ProviderFor(portfolioRemoteDataSource)
final portfolioRemoteDataSourceProvider = PortfolioRemoteDataSourceProvider._();

final class PortfolioRemoteDataSourceProvider
    extends
        $FunctionalProvider<
          PortfolioRemoteDataSource,
          PortfolioRemoteDataSource,
          PortfolioRemoteDataSource
        >
    with $Provider<PortfolioRemoteDataSource> {
  PortfolioRemoteDataSourceProvider._()
    : super(
        from: null,
        argument: null,
        retry: null,
        name: r'portfolioRemoteDataSourceProvider',
        isAutoDispose: true,
        dependencies: null,
        $allTransitiveDependencies: null,
      );

  @override
  String debugGetCreateSourceHash() => _$portfolioRemoteDataSourceHash();

  @$internal
  @override
  $ProviderElement<PortfolioRemoteDataSource> $createElement(
    $ProviderPointer pointer,
  ) => $ProviderElement(pointer);

  @override
  PortfolioRemoteDataSource create(Ref ref) {
    return portfolioRemoteDataSource(ref);
  }

  /// {@macro riverpod.override_with_value}
  Override overrideWithValue(PortfolioRemoteDataSource value) {
    return $ProviderOverride(
      origin: this,
      providerOverride: $SyncValueProvider<PortfolioRemoteDataSource>(value),
    );
  }
}

String _$portfolioRemoteDataSourceHash() =>
    r'9904464652799975909c8963c9ad89448630e150';

@ProviderFor(portfolioRepository)
final portfolioRepositoryProvider = PortfolioRepositoryProvider._();

final class PortfolioRepositoryProvider
    extends
        $FunctionalProvider<
          PortfolioRepository,
          PortfolioRepository,
          PortfolioRepository
        >
    with $Provider<PortfolioRepository> {
  PortfolioRepositoryProvider._()
    : super(
        from: null,
        argument: null,
        retry: null,
        name: r'portfolioRepositoryProvider',
        isAutoDispose: true,
        dependencies: null,
        $allTransitiveDependencies: null,
      );

  @override
  String debugGetCreateSourceHash() => _$portfolioRepositoryHash();

  @$internal
  @override
  $ProviderElement<PortfolioRepository> $createElement(
    $ProviderPointer pointer,
  ) => $ProviderElement(pointer);

  @override
  PortfolioRepository create(Ref ref) {
    return portfolioRepository(ref);
  }

  /// {@macro riverpod.override_with_value}
  Override overrideWithValue(PortfolioRepository value) {
    return $ProviderOverride(
      origin: this,
      providerOverride: $SyncValueProvider<PortfolioRepository>(value),
    );
  }
}

String _$portfolioRepositoryHash() =>
    r'88992f3854b5ebda8406da3cb74743d38ecbceca';
