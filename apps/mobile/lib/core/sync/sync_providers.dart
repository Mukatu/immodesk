import 'dart:async';
import 'dart:convert';
import 'dart:io';

import 'package:connectivity_plus/connectivity_plus.dart';
import 'package:riverpod_annotation/riverpod_annotation.dart';

import '../../features/documents/data/documents_providers.dart';
import '../../features/documents/domain/entities/document_kind.dart';
import '../../features/documents/domain/repositories/documents_repository.dart';
import '../../features/organizations/presentation/controllers/selected_organization_controller.dart';
import '../connectivity/connectivity_service.dart';
import '../db/app_database.dart';
import 'mobile_config.dart';
import 'outbox_repository.dart';
import 'pull_service.dart';
import 'sync_engine.dart';
import 'sync_remote_data_source.dart';

part 'sync_providers.g.dart';

/// Téléverse le fichier local d'une ligne `DOCUMENT` par les routes
/// documents existantes (`upload-url` puis `documents`), avec le
/// `clientRef` de la ligne comme clé d'idempotence.
Future<String> _uploadOutboxDocument(
  DocumentsRepository repository,
  OutboxRow row,
  Map<String, dynamic> payload,
) async {
  final File file = File(payload['filePath'] as String);
  final int sizeBytes = payload['sizeBytes'] as int? ?? await file.length();
  final String mimeType = payload['mimeType'] as String? ?? 'image/jpeg';
  final upload = await repository.requestUploadUrl(
    organizationId: row.organizationId,
    fileName: payload['fileName'] as String? ?? 'preuve.jpg',
    mimeType: mimeType,
    sizeBytes: sizeBytes,
    kind: DocumentKind.other,
  );
  await repository.putFile(
    uploadUrl: upload.uploadUrl,
    file: file,
    mimeType: mimeType,
  );
  final document = await repository.registerDocument(
    organizationId: row.organizationId,
    objectKey: upload.objectKey,
    fileName: payload['fileName'] as String? ?? 'preuve.jpg',
    mimeType: mimeType,
    sizeBytes: sizeBytes,
    kind: DocumentKind.other,
    clientRef: row.clientRef,
  );
  return document.id;
}

@riverpod
SyncEngine syncEngine(Ref ref) {
  final DocumentsRepository documentsRepository = ref.watch(
    documentsRepositoryProvider,
  );
  return SyncEngine(
    db: ref.watch(appDatabaseProvider),
    outbox: ref.watch(outboxRepositoryProvider),
    remote: ref.watch(syncRemoteDataSourceProvider),
    pullService: ref.watch(pullServiceProvider),
    documentUploader: (row) async {
      final Map<String, dynamic> payload =
          jsonDecode(row.payload) as Map<String, dynamic>;
      return _uploadOutboxDocument(documentsRepository, row, payload);
    },
  );
}

/// Déclenche un cycle de synchronisation au retour du réseau et de façon
/// périodique (`syncIntervalSeconds` de `MobileConfig`). Expose aussi une
/// méthode manuelle pour l'écran Outbox (« Réessayer ») et pour
/// l'encaissement (déclenchement immédiat après enqueue si déjà en ligne).
@Riverpod(keepAlive: true)
class SyncCoordinator extends _$SyncCoordinator {
  Timer? _periodicTimer;
  StreamSubscription<List<ConnectivityResult>>? _connectivitySubscription;

  /// Compteur d'échecs consécutifs : pilote le repli exponentiel plafonné
  /// à cinq minutes (`backoffDelay`, `docs/api/phase5-contract.md`). Remis
  /// à zéro dès qu'un cycle réussit.
  int _consecutiveFailures = 0;

  @override
  void build() {
    _connectivitySubscription = Connectivity().onConnectivityChanged.listen((
      results,
    ) {
      final bool isOnline =
          results.isNotEmpty && !results.contains(ConnectivityResult.none);
      if (isOnline) triggerSync();
    });
    ref.onDispose(() {
      _connectivitySubscription?.cancel();
      _periodicTimer?.cancel();
    });
  }

  /// Ne fait rien hors ligne : ni `GET /v1/mobile/config`, ni le reste du
  /// cycle. C'est le retour du réseau (écouteur ci-dessus) ou la minuterie
  /// qui redéclenchent l'essai suivant — jamais un appel réseau tenté à
  /// l'aveugle.
  Future<void> triggerSync() async {
    final String? organizationId = ref
        .read(selectedOrganizationControllerProvider)
        .value;
    if (organizationId == null) return;
    if (await ref.read(connectivityServiceProvider).isOffline()) return;
    final MobileConfig config = await ref.read(mobileConfigProvider.future);

    if (config.offlineWritesEnabled) {
      try {
        await ref.read(syncEngineProvider).runCycle(organizationId, config);
        _consecutiveFailures = 0;
      } catch (_) {
        // Erreur réseau/technique : le lot reste `SENDING` avec son
        // `batchRef`, rejoué tel quel au prochain essai (repli
        // exponentiel), jamais régénéré.
        _consecutiveFailures++;
      }
    }

    final Duration delay = _consecutiveFailures > 0
        ? backoffDelay(_consecutiveFailures)
        : Duration(seconds: config.syncIntervalSeconds);
    _periodicTimer?.cancel();
    _periodicTimer = Timer(delay, triggerSync);
  }
}
