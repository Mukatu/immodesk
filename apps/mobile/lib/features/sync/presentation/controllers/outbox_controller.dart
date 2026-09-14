import 'dart:async';

import 'package:riverpod_annotation/riverpod_annotation.dart';

import '../../../../core/sync/outbox_repository.dart';
import '../../../../core/sync/sync_providers.dart';

part 'outbox_controller.g.dart';

/// Actions de l'écran Outbox : nouvelle tentative manuelle, puis
/// déclenchement immédiat d'un cycle de synchronisation si le réseau est
/// disponible (`SyncCoordinator` ignore l'appel sans effet si hors ligne).
@riverpod
class OutboxController extends _$OutboxController {
  @override
  void build() {}

  /// Retourne `false` si l'élément est un conflit : seul un gestionnaire
  /// peut le résoudre depuis le dashboard, jamais depuis le mobile.
  Future<bool> retry(String clientRef) async {
    final bool accepted = await ref
        .read(outboxRepositoryProvider)
        .retryFromScreen(clientRef);
    if (accepted) {
      unawaited(ref.read(syncCoordinatorProvider.notifier).triggerSync());
    }
    return accepted;
  }
}
