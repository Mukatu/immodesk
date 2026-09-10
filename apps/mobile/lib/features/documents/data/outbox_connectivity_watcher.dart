import 'package:connectivity_plus/connectivity_plus.dart';
import 'package:riverpod_annotation/riverpod_annotation.dart';

import 'photo_outbox_service.dart';

part 'outbox_connectivity_watcher.g.dart';

/// Déclenche le rejeu de l'outbox des photos dès que la connectivité
/// revient. À activer une seule fois (ex. dans la coquille de navigation)
/// via `ref.watch(outboxConnectivityWatcherProvider)`.
@Riverpod(keepAlive: true)
class OutboxConnectivityWatcher extends _$OutboxConnectivityWatcher {
  @override
  void build() {
    final subscription = Connectivity().onConnectivityChanged.listen((results) {
      final bool isOnline =
          results.isNotEmpty && !results.contains(ConnectivityResult.none);
      if (isOnline) {
        ref.read(photoOutboxServiceProvider).syncPending();
      }
    });
    ref.onDispose(subscription.cancel);
  }
}
