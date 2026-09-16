import 'dart:convert';
import 'dart:io';

import 'package:package_info_plus/package_info_plus.dart';
import 'package:riverpod_annotation/riverpod_annotation.dart';

import '../db/app_database.dart';
import '../network/api_exception.dart';
import 'document_field_paths.dart';
import 'mobile_config.dart';
import 'outbox_ordering.dart';
import 'outbox_repository.dart';
import 'outbox_types.dart';
import 'pull_service.dart';
import 'sync_dto.dart';
import 'sync_remote_data_source.dart';
import 'ulid.dart';

part 'sync_engine.g.dart';

/// Repli exponentiel plafonné à 5 minutes
/// (`docs/api/phase5-contract.md` « Côté mobile »).
Duration backoffDelay(int consecutiveFailures) {
  if (consecutiveFailures <= 0) return Duration.zero;
  final int seconds = 5 * (1 << (consecutiveFailures - 1).clamp(0, 6));
  return Duration(seconds: seconds > 300 ? 300 : seconds);
}

/// Identifiant stable de l'appareil : généré une fois, conservé dans
/// `app_settings` (aucune dépendance à un identifiant matériel, pour
/// rester simple et testable).
Future<String> resolveDeviceId(AppDatabase db) async {
  final String? existing = await db.getSetting('sync.device_id');
  if (existing != null) return existing;
  final String generated = Ulid.generate();
  await db.setSetting('sync.device_id', generated);
  return generated;
}

/// Orchestre l'outbox généralisée : téléversement des pièces jointes
/// (`DOCUMENT`, routes documents existantes), envoi par lots des
/// `CASH_RECEIPT` (`/v1/sync/batches`), puis préchargement (`/v1/sync/pull`)
/// et purge des référentiels. Voir `docs/api/phase5-contract.md`.
class SyncEngine {
  SyncEngine({
    required this.db,
    required this.outbox,
    required this.remote,
    required this.pullService,
    required this.documentUploader,
  });

  final AppDatabase db;
  final OutboxRepository outbox;
  final SyncRemoteDataSource remote;
  final PullService pullService;

  /// Téléverse le fichier d'une ligne `DOCUMENT` via les routes documents
  /// existantes et renvoie l'identifiant serveur. Injecté pour rester
  /// testable sans dépendre du module `documents` complet.
  final Future<String> Function(OutboxRow documentRow) documentUploader;

  bool _cycleRunning = false;

  /// Un cycle complet : téléversement des pièces jointes, envoi des lots
  /// `CASH_RECEIPT`, puis préchargement. N'exécute jamais deux cycles en
  /// parallèle sur la même instance.
  Future<void> runCycle(String organizationId, MobileConfig config) async {
    if (_cycleRunning) return;
    _cycleRunning = true;
    try {
      await _uploadPendingDocuments(organizationId);
      await _sendCashReceiptBatches(organizationId, config);
      await pullService.pullAndStore(organizationId);
      await pullService.purgeIfStale(organizationId, config.retentionHours);
    } finally {
      _cycleRunning = false;
    }
  }

  Future<void> _uploadPendingDocuments(String organizationId) async {
    final List<OutboxRow> rows = await outbox.all(organizationId);
    for (final OutboxRow row in rows) {
      if (row.operation != OutboxOperationType.document.apiValue) continue;
      if (row.status != OutboxStatus.pending.dbValue) continue;
      try {
        final String documentId = await documentUploader(row);
        await outbox.markSent(row.clientRef);
        for (final OutboxRow dependent in await outbox.dependentsOf(
          organizationId,
          row.clientRef,
        )) {
          await outbox.patchPayload(dependent.clientRef, (payload) {
            final Map<String, dynamic>? fieldPaths =
                payload['_documentFieldPaths'] as Map<String, dynamic>?;
            final String? path = fieldPaths?[row.clientRef] as String?;
            if (path != null) {
              setDocumentFieldPath(payload, path, documentId);
            } else {
              // Compatibilité `CASH_RECEIPT` (phase 5) : un seul champ
              // possible, sans déclaration de chemin.
              payload['paperReceiptDocumentId'] = documentId;
            }
            return payload;
          });
        }
      } on ApiException catch (e) {
        await outbox.markFailedOrConflict(
          row.clientRef,
          isConflict: false,
          code: e.code,
          message: e.message,
        );
      }
    }
  }

  Future<void> _sendCashReceiptBatches(
    String organizationId,
    MobileConfig config,
  ) async {
    List<OutboxRow> candidates = await outbox.selectBatchCandidates(
      organizationId,
      config.maxOperationsPerBatch,
    );
    // Une ligne dont la dépendance (DOCUMENT) n'est pas encore résolue
    // reste hors du lot : elle sera reprise à un cycle suivant.
    candidates = candidates
        .where(
          (row) => outbox
              .dependsOnOf(row)
              .every((ref) => _dependencyResolvedSync(candidates, ref)),
        )
        .toList();
    if (candidates.isEmpty) return;

    final List<OutboxRow> ordered = orderForBatch(candidates, outbox);
    final String? existingBatchRef = await outbox.inFlightBatchRef(
      organizationId,
    );
    final String batchRef = existingBatchRef ?? Ulid.generate();
    if (existingBatchRef == null) {
      await outbox.markSending(
        ordered.map((r) => r.clientRef).toList(),
        batchRef,
      );
    }

    final SyncBatchInput input = await _buildBatchInput(
      organizationId,
      batchRef,
      ordered,
    );
    final SyncBatchResult result = await remote.postBatch(
      organizationId,
      input,
    );
    await _applyResults(result);
  }

  bool _dependencyResolvedSync(List<OutboxRow> batch, String ref) {
    // Une dépendance absente du lot est considérée déjà résolue (DOCUMENT
    // envoyé hors bande, voir `_uploadPendingDocuments`).
    return batch.every((r) => r.clientRef != ref);
  }

  Future<SyncBatchInput> _buildBatchInput(
    String organizationId,
    String batchRef,
    List<OutboxRow> ordered,
  ) async {
    final String deviceId = await resolveDeviceId(db);
    String appVersion = '';
    try {
      final PackageInfo info = await PackageInfo.fromPlatform();
      appVersion = info.version;
    } catch (_) {
      // Indisponible en environnement de test : champ informatif seulement.
    }
    return SyncBatchInput(
      batchRef: batchRef,
      deviceId: deviceId,
      devicePlatform: Platform.isIOS ? 'ios' : 'android',
      appVersion: appVersion,
      operations: ordered.map((row) {
        // `_documentFieldPaths` n'est qu'une note interne de résolution
        // (voir `document_field_paths.dart`) : elle ne fait pas partie du
        // contrat et n'est jamais envoyée au serveur.
        final Map<String, dynamic> payload =
            jsonDecode(row.payload) as Map<String, dynamic>;
        payload.remove('_documentFieldPaths');
        return SyncOperation(
          clientRef: row.clientRef,
          type: OutboxOperationType.fromApiValue(row.operation),
          clientCreatedAt: row.createdAt.toIso8601String(),
          dependsOn: outbox.dependsOnOf(row),
          payload: payload,
        );
      }).toList(),
    );
  }

  Future<void> _applyResults(SyncBatchResult result) async {
    for (final SyncOperationResult r in result.results) {
      switch (r.outcome) {
        case SyncOperationOutcome.applied:
        case SyncOperationOutcome.duplicate:
          await outbox.markSent(r.clientRef);
        case SyncOperationOutcome.rejected:
          await outbox.markFailedOrConflict(
            r.clientRef,
            isConflict: false,
            code: r.code,
            message: r.message ?? 'Rejeté par le serveur.',
          );
        case SyncOperationOutcome.conflict:
          await outbox.markFailedOrConflict(
            r.clientRef,
            isConflict: true,
            code: r.code,
            message:
                r.message ??
                'Conflit détecté : seul un gestionnaire peut trancher.',
          );
        case SyncOperationOutcome.skipped:
          await outbox.requeue(r.clientRef);
      }
    }
  }
}

@riverpod
Future<String> syncDeviceId(Ref ref) {
  return resolveDeviceId(ref.watch(appDatabaseProvider));
}
