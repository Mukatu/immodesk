// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'outbox_controller.dart';

// **************************************************************************
// RiverpodGenerator
// **************************************************************************

// GENERATED CODE - DO NOT MODIFY BY HAND
// ignore_for_file: type=lint, type=warning
/// Actions de l'écran Outbox : nouvelle tentative manuelle, puis
/// déclenchement immédiat d'un cycle de synchronisation si le réseau est
/// disponible (`SyncCoordinator` ignore l'appel sans effet si hors ligne).

@ProviderFor(OutboxController)
final outboxControllerProvider = OutboxControllerProvider._();

/// Actions de l'écran Outbox : nouvelle tentative manuelle, puis
/// déclenchement immédiat d'un cycle de synchronisation si le réseau est
/// disponible (`SyncCoordinator` ignore l'appel sans effet si hors ligne).
final class OutboxControllerProvider
    extends $NotifierProvider<OutboxController, void> {
  /// Actions de l'écran Outbox : nouvelle tentative manuelle, puis
  /// déclenchement immédiat d'un cycle de synchronisation si le réseau est
  /// disponible (`SyncCoordinator` ignore l'appel sans effet si hors ligne).
  OutboxControllerProvider._()
    : super(
        from: null,
        argument: null,
        retry: null,
        name: r'outboxControllerProvider',
        isAutoDispose: true,
        dependencies: null,
        $allTransitiveDependencies: null,
      );

  @override
  String debugGetCreateSourceHash() => _$outboxControllerHash();

  @$internal
  @override
  OutboxController create() => OutboxController();

  /// {@macro riverpod.override_with_value}
  Override overrideWithValue(void value) {
    return $ProviderOverride(
      origin: this,
      providerOverride: $SyncValueProvider<void>(value),
    );
  }
}

String _$outboxControllerHash() => r'd9689a6b4c28157a6d061d52bf3b8dc26de8bb73';

/// Actions de l'écran Outbox : nouvelle tentative manuelle, puis
/// déclenchement immédiat d'un cycle de synchronisation si le réseau est
/// disponible (`SyncCoordinator` ignore l'appel sans effet si hors ligne).

abstract class _$OutboxController extends $Notifier<void> {
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
