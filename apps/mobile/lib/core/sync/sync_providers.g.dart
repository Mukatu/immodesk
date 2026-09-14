// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'sync_providers.dart';

// **************************************************************************
// RiverpodGenerator
// **************************************************************************

// GENERATED CODE - DO NOT MODIFY BY HAND
// ignore_for_file: type=lint, type=warning

@ProviderFor(syncEngine)
final syncEngineProvider = SyncEngineProvider._();

final class SyncEngineProvider
    extends $FunctionalProvider<SyncEngine, SyncEngine, SyncEngine>
    with $Provider<SyncEngine> {
  SyncEngineProvider._()
    : super(
        from: null,
        argument: null,
        retry: null,
        name: r'syncEngineProvider',
        isAutoDispose: true,
        dependencies: null,
        $allTransitiveDependencies: null,
      );

  @override
  String debugGetCreateSourceHash() => _$syncEngineHash();

  @$internal
  @override
  $ProviderElement<SyncEngine> $createElement($ProviderPointer pointer) =>
      $ProviderElement(pointer);

  @override
  SyncEngine create(Ref ref) {
    return syncEngine(ref);
  }

  /// {@macro riverpod.override_with_value}
  Override overrideWithValue(SyncEngine value) {
    return $ProviderOverride(
      origin: this,
      providerOverride: $SyncValueProvider<SyncEngine>(value),
    );
  }
}

String _$syncEngineHash() => r'c649609dea4d9abe75b55f889c96973e02bc7844';

/// Déclenche un cycle de synchronisation au retour du réseau et de façon
/// périodique (`syncIntervalSeconds` de `MobileConfig`). Expose aussi une
/// méthode manuelle pour l'écran Outbox (« Réessayer ») et pour
/// l'encaissement (déclenchement immédiat après enqueue si déjà en ligne).

@ProviderFor(SyncCoordinator)
final syncCoordinatorProvider = SyncCoordinatorProvider._();

/// Déclenche un cycle de synchronisation au retour du réseau et de façon
/// périodique (`syncIntervalSeconds` de `MobileConfig`). Expose aussi une
/// méthode manuelle pour l'écran Outbox (« Réessayer ») et pour
/// l'encaissement (déclenchement immédiat après enqueue si déjà en ligne).
final class SyncCoordinatorProvider
    extends $NotifierProvider<SyncCoordinator, void> {
  /// Déclenche un cycle de synchronisation au retour du réseau et de façon
  /// périodique (`syncIntervalSeconds` de `MobileConfig`). Expose aussi une
  /// méthode manuelle pour l'écran Outbox (« Réessayer ») et pour
  /// l'encaissement (déclenchement immédiat après enqueue si déjà en ligne).
  SyncCoordinatorProvider._()
    : super(
        from: null,
        argument: null,
        retry: null,
        name: r'syncCoordinatorProvider',
        isAutoDispose: false,
        dependencies: null,
        $allTransitiveDependencies: null,
      );

  @override
  String debugGetCreateSourceHash() => _$syncCoordinatorHash();

  @$internal
  @override
  SyncCoordinator create() => SyncCoordinator();

  /// {@macro riverpod.override_with_value}
  Override overrideWithValue(void value) {
    return $ProviderOverride(
      origin: this,
      providerOverride: $SyncValueProvider<void>(value),
    );
  }
}

String _$syncCoordinatorHash() => r'4808d44e8af191f1adce234f70616f3a194ac2c4';

/// Déclenche un cycle de synchronisation au retour du réseau et de façon
/// périodique (`syncIntervalSeconds` de `MobileConfig`). Expose aussi une
/// méthode manuelle pour l'écran Outbox (« Réessayer ») et pour
/// l'encaissement (déclenchement immédiat après enqueue si déjà en ligne).

abstract class _$SyncCoordinator extends $Notifier<void> {
  void build();
  @$mustCallSuper
  @override
  void runBuild() {
    final ref = this.ref as $Ref<void, void>;
    final element =
        ref.element
            as $ClassProviderElement<
              AnyNotifier<void, void>,
              void,
              Object?,
              Object?
            >;
    element.handleCreate(ref, build);
  }
}
