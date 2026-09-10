// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'outbox_connectivity_watcher.dart';

// **************************************************************************
// RiverpodGenerator
// **************************************************************************

// GENERATED CODE - DO NOT MODIFY BY HAND
// ignore_for_file: type=lint, type=warning
/// Déclenche le rejeu de l'outbox des photos dès que la connectivité
/// revient. À activer une seule fois (ex. dans la coquille de navigation)
/// via `ref.watch(outboxConnectivityWatcherProvider)`.

@ProviderFor(OutboxConnectivityWatcher)
final outboxConnectivityWatcherProvider = OutboxConnectivityWatcherProvider._();

/// Déclenche le rejeu de l'outbox des photos dès que la connectivité
/// revient. À activer une seule fois (ex. dans la coquille de navigation)
/// via `ref.watch(outboxConnectivityWatcherProvider)`.
final class OutboxConnectivityWatcherProvider
    extends $NotifierProvider<OutboxConnectivityWatcher, void> {
  /// Déclenche le rejeu de l'outbox des photos dès que la connectivité
  /// revient. À activer une seule fois (ex. dans la coquille de navigation)
  /// via `ref.watch(outboxConnectivityWatcherProvider)`.
  OutboxConnectivityWatcherProvider._()
    : super(
        from: null,
        argument: null,
        retry: null,
        name: r'outboxConnectivityWatcherProvider',
        isAutoDispose: false,
        dependencies: null,
        $allTransitiveDependencies: null,
      );

  @override
  String debugGetCreateSourceHash() => _$outboxConnectivityWatcherHash();

  @$internal
  @override
  OutboxConnectivityWatcher create() => OutboxConnectivityWatcher();

  /// {@macro riverpod.override_with_value}
  Override overrideWithValue(void value) {
    return $ProviderOverride(
      origin: this,
      providerOverride: $SyncValueProvider<void>(value),
    );
  }
}

String _$outboxConnectivityWatcherHash() =>
    r'91855c319c393df92fbaf3cf2047af1527d8186c';

/// Déclenche le rejeu de l'outbox des photos dès que la connectivité
/// revient. À activer une seule fois (ex. dans la coquille de navigation)
/// via `ref.watch(outboxConnectivityWatcherProvider)`.

abstract class _$OutboxConnectivityWatcher extends $Notifier<void> {
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
