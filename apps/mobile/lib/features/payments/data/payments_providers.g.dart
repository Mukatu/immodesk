// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'payments_providers.dart';

// **************************************************************************
// RiverpodGenerator
// **************************************************************************

// GENERATED CODE - DO NOT MODIFY BY HAND
// ignore_for_file: type=lint, type=warning

@ProviderFor(paymentsRemoteDataSource)
final paymentsRemoteDataSourceProvider = PaymentsRemoteDataSourceProvider._();

final class PaymentsRemoteDataSourceProvider
    extends
        $FunctionalProvider<
          PaymentsRemoteDataSource,
          PaymentsRemoteDataSource,
          PaymentsRemoteDataSource
        >
    with $Provider<PaymentsRemoteDataSource> {
  PaymentsRemoteDataSourceProvider._()
    : super(
        from: null,
        argument: null,
        retry: null,
        name: r'paymentsRemoteDataSourceProvider',
        isAutoDispose: true,
        dependencies: null,
        $allTransitiveDependencies: null,
      );

  @override
  String debugGetCreateSourceHash() => _$paymentsRemoteDataSourceHash();

  @$internal
  @override
  $ProviderElement<PaymentsRemoteDataSource> $createElement(
    $ProviderPointer pointer,
  ) => $ProviderElement(pointer);

  @override
  PaymentsRemoteDataSource create(Ref ref) {
    return paymentsRemoteDataSource(ref);
  }

  /// {@macro riverpod.override_with_value}
  Override overrideWithValue(PaymentsRemoteDataSource value) {
    return $ProviderOverride(
      origin: this,
      providerOverride: $SyncValueProvider<PaymentsRemoteDataSource>(value),
    );
  }
}

String _$paymentsRemoteDataSourceHash() =>
    r'f299bab843d1c952b835d6276b8fa9356016c687';

@ProviderFor(paymentsRepository)
final paymentsRepositoryProvider = PaymentsRepositoryProvider._();

final class PaymentsRepositoryProvider
    extends
        $FunctionalProvider<
          PaymentsRepository,
          PaymentsRepository,
          PaymentsRepository
        >
    with $Provider<PaymentsRepository> {
  PaymentsRepositoryProvider._()
    : super(
        from: null,
        argument: null,
        retry: null,
        name: r'paymentsRepositoryProvider',
        isAutoDispose: true,
        dependencies: null,
        $allTransitiveDependencies: null,
      );

  @override
  String debugGetCreateSourceHash() => _$paymentsRepositoryHash();

  @$internal
  @override
  $ProviderElement<PaymentsRepository> $createElement(
    $ProviderPointer pointer,
  ) => $ProviderElement(pointer);

  @override
  PaymentsRepository create(Ref ref) {
    return paymentsRepository(ref);
  }

  /// {@macro riverpod.override_with_value}
  Override overrideWithValue(PaymentsRepository value) {
    return $ProviderOverride(
      origin: this,
      providerOverride: $SyncValueProvider<PaymentsRepository>(value),
    );
  }
}

String _$paymentsRepositoryHash() =>
    r'cda84f18c2d15ccb497e3ab39d0153123da0ca3a';

/// Intervalle d'interrogation du statut d'une transaction agrégateur en
/// attente (`docs/api/phase4-contract.md` : toutes les 3 secondes).
/// Surchargeable dans les tests pour ne pas attendre le délai réel.

@ProviderFor(momoPollInterval)
final momoPollIntervalProvider = MomoPollIntervalProvider._();

/// Intervalle d'interrogation du statut d'une transaction agrégateur en
/// attente (`docs/api/phase4-contract.md` : toutes les 3 secondes).
/// Surchargeable dans les tests pour ne pas attendre le délai réel.

final class MomoPollIntervalProvider
    extends $FunctionalProvider<Duration, Duration, Duration>
    with $Provider<Duration> {
  /// Intervalle d'interrogation du statut d'une transaction agrégateur en
  /// attente (`docs/api/phase4-contract.md` : toutes les 3 secondes).
  /// Surchargeable dans les tests pour ne pas attendre le délai réel.
  MomoPollIntervalProvider._()
    : super(
        from: null,
        argument: null,
        retry: null,
        name: r'momoPollIntervalProvider',
        isAutoDispose: true,
        dependencies: null,
        $allTransitiveDependencies: null,
      );

  @override
  String debugGetCreateSourceHash() => _$momoPollIntervalHash();

  @$internal
  @override
  $ProviderElement<Duration> $createElement($ProviderPointer pointer) =>
      $ProviderElement(pointer);

  @override
  Duration create(Ref ref) {
    return momoPollInterval(ref);
  }

  /// {@macro riverpod.override_with_value}
  Override overrideWithValue(Duration value) {
    return $ProviderOverride(
      origin: this,
      providerOverride: $SyncValueProvider<Duration>(value),
    );
  }
}

String _$momoPollIntervalHash() => r'43e09d315eda55cab0b9ba7328cfedcf6834d66b';
