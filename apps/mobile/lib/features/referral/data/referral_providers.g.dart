// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'referral_providers.dart';

// **************************************************************************
// RiverpodGenerator
// **************************************************************************

// GENERATED CODE - DO NOT MODIFY BY HAND
// ignore_for_file: type=lint, type=warning

@ProviderFor(referralRemoteDataSource)
final referralRemoteDataSourceProvider = ReferralRemoteDataSourceProvider._();

final class ReferralRemoteDataSourceProvider
    extends
        $FunctionalProvider<
          ReferralRemoteDataSource,
          ReferralRemoteDataSource,
          ReferralRemoteDataSource
        >
    with $Provider<ReferralRemoteDataSource> {
  ReferralRemoteDataSourceProvider._()
    : super(
        from: null,
        argument: null,
        retry: null,
        name: r'referralRemoteDataSourceProvider',
        isAutoDispose: true,
        dependencies: null,
        $allTransitiveDependencies: null,
      );

  @override
  String debugGetCreateSourceHash() => _$referralRemoteDataSourceHash();

  @$internal
  @override
  $ProviderElement<ReferralRemoteDataSource> $createElement(
    $ProviderPointer pointer,
  ) => $ProviderElement(pointer);

  @override
  ReferralRemoteDataSource create(Ref ref) {
    return referralRemoteDataSource(ref);
  }

  /// {@macro riverpod.override_with_value}
  Override overrideWithValue(ReferralRemoteDataSource value) {
    return $ProviderOverride(
      origin: this,
      providerOverride: $SyncValueProvider<ReferralRemoteDataSource>(value),
    );
  }
}

String _$referralRemoteDataSourceHash() =>
    r'51935b3728d9c2747a8878d0e33369d0d86c21d9';

@ProviderFor(referralRepository)
final referralRepositoryProvider = ReferralRepositoryProvider._();

final class ReferralRepositoryProvider
    extends
        $FunctionalProvider<
          ReferralRepository,
          ReferralRepository,
          ReferralRepository
        >
    with $Provider<ReferralRepository> {
  ReferralRepositoryProvider._()
    : super(
        from: null,
        argument: null,
        retry: null,
        name: r'referralRepositoryProvider',
        isAutoDispose: true,
        dependencies: null,
        $allTransitiveDependencies: null,
      );

  @override
  String debugGetCreateSourceHash() => _$referralRepositoryHash();

  @$internal
  @override
  $ProviderElement<ReferralRepository> $createElement(
    $ProviderPointer pointer,
  ) => $ProviderElement(pointer);

  @override
  ReferralRepository create(Ref ref) {
    return referralRepository(ref);
  }

  /// {@macro riverpod.override_with_value}
  Override overrideWithValue(ReferralRepository value) {
    return $ProviderOverride(
      origin: this,
      providerOverride: $SyncValueProvider<ReferralRepository>(value),
    );
  }
}

String _$referralRepositoryHash() =>
    r'fe0c93d817291cf904c8a14117fcc40f490c4447';
