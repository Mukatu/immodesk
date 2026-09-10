import 'dart:convert';
import 'dart:io';

import 'package:drift/drift.dart';
import 'package:riverpod_annotation/riverpod_annotation.dart';

import '../../../core/db/app_database.dart';
import '../../../core/network/api_exception.dart';
import '../../../core/sync/ulid.dart';
import '../domain/entities/document_kind.dart';
import '../domain/repositories/documents_repository.dart';
import 'documents_providers.dart';

part 'photo_outbox_service.g.dart';

/// Opération d'outbox pour une photo de lot prise hors ligne. Le mécanisme
/// est volontairement simple (pas de dépendances entre opérations, pas de
/// file d'attente générale) : le `SyncEngine` complet arrive en phase 5.
const String propertyPhotoOperation = 'documents.property_photo.create';

/// Gère la mise en attente et le rejeu des photos de lot prises hors
/// ligne, dans la table `Outbox` existante (schéma inchangé).
class PhotoOutboxService {
  PhotoOutboxService(this._db, this._repository);

  final AppDatabase _db;
  final DocumentsRepository _repository;

  /// Enregistre une photo déjà compressée localement, en attente d'envoi.
  Future<String> enqueue({
    required String organizationId,
    required String unitId,
    required String filePath,
    required String fileName,
    required String mimeType,
    required int sizeBytes,
  }) async {
    final String clientRef = Ulid.generate();
    final Map<String, dynamic> payload = <String, dynamic>{
      'unitId': unitId,
      'filePath': filePath,
      'fileName': fileName,
      'mimeType': mimeType,
      'sizeBytes': sizeBytes,
      'kind': DocumentKind.propertyPhoto.apiValue,
      'relatedEntityType': 'unit',
    };
    await _db
        .into(_db.outbox)
        .insert(
          OutboxCompanion.insert(
            clientRef: clientRef,
            organizationId: organizationId,
            operation: propertyPhotoOperation,
            payload: jsonEncode(payload),
          ),
        );
    return clientRef;
  }

  Future<List<OutboxRow>> pendingForUnit(String unitId) async {
    final List<OutboxRow> pending = await _pendingRows();
    return pending
        .where((row) => (jsonDecode(row.payload) as Map)['unitId'] == unitId)
        .toList();
  }

  Future<List<OutboxRow>> _pendingRows() {
    return (_db.select(_db.outbox)..where(
          (tbl) =>
              tbl.operation.equals(propertyPhotoOperation) &
              tbl.status.equals('PENDING'),
        ))
        .get();
  }

  /// Tente d'envoyer toutes les photos en attente. Chaque échec reste en
  /// `PENDING` (compteur de tentatives incrémenté) pour un nouvel essai
  /// ultérieur (au prochain retour réseau ou à la prochaine ouverture).
  Future<void> syncPending() async {
    for (final OutboxRow row in await _pendingRows()) {
      await _trySend(row);
    }
  }

  Future<bool> _trySend(OutboxRow row) async {
    final Map<String, dynamic> payload =
        jsonDecode(row.payload) as Map<String, dynamic>;
    final File file = File(payload['filePath'] as String);
    if (!file.existsSync()) {
      await (_db.delete(
        _db.outbox,
      )..where((tbl) => tbl.clientRef.equals(row.clientRef))).go();
      return false;
    }
    try {
      final String mimeType = payload['mimeType'] as String;
      final upload = await _repository.requestUploadUrl(
        organizationId: row.organizationId,
        fileName: payload['fileName'] as String,
        mimeType: mimeType,
        sizeBytes: payload['sizeBytes'] as int,
        kind: DocumentKind.propertyPhoto,
        relatedEntityType: 'unit',
        relatedEntityId: payload['unitId'] as String,
      );
      await _repository.putFile(
        uploadUrl: upload.uploadUrl,
        file: file,
        mimeType: mimeType,
      );
      await _repository.registerDocument(
        organizationId: row.organizationId,
        objectKey: upload.objectKey,
        fileName: payload['fileName'] as String,
        mimeType: mimeType,
        sizeBytes: payload['sizeBytes'] as int,
        kind: DocumentKind.propertyPhoto,
        relatedEntityType: 'unit',
        relatedEntityId: payload['unitId'] as String,
        clientRef: row.clientRef,
      );
      await (_db.delete(
        _db.outbox,
      )..where((tbl) => tbl.clientRef.equals(row.clientRef))).go();
      return true;
    } on ApiException catch (e) {
      await (_db.update(
        _db.outbox,
      )..where((tbl) => tbl.clientRef.equals(row.clientRef))).write(
        OutboxCompanion(
          attemptCount: Value(row.attemptCount + 1),
          lastErrorCode: Value(e.code),
        ),
      );
      return false;
    }
  }
}

@riverpod
PhotoOutboxService photoOutboxService(Ref ref) {
  return PhotoOutboxService(
    ref.watch(appDatabaseProvider),
    ref.watch(documentsRepositoryProvider),
  );
}
