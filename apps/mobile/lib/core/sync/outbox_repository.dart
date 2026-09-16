import 'dart:convert';

import 'package:drift/drift.dart';
import 'package:riverpod_annotation/riverpod_annotation.dart';

import '../db/app_database.dart';
import '../sync/ulid.dart';
import 'outbox_types.dart';

part 'outbox_repository.g.dart';

/// Accès à l'`outbox` généralisée pour le `SyncEngine` (opérations
/// `CASH_RECEIPT` et `DOCUMENT` uniquement — l'ancienne opération
/// `documents.property_photo.create` reste gérée par `PhotoOutboxService`,
/// inchangé).
class OutboxRepository {
  OutboxRepository(this._db);

  final AppDatabase _db;

  static const List<String> _syncEngineOperations = [
    'CASH_RECEIPT',
    'DOCUMENT',
    'INSPECTION_SUBMIT',
    'METER_READING',
    'MAINTENANCE_UPDATE',
  ];

  /// Ajoute une opération à l'outbox, dans l'état `PENDING`. Retourne le
  /// `clientRef` utilisé (généré si [clientRef] est omis — un écran qui a
  /// déjà attribué un `clientRef` à l'ouverture, comme `EncaissementState`,
  /// le passe explicitement pour le conserver bout en bout).
  Future<String> enqueue({
    required String organizationId,
    required OutboxOperationType type,
    required Map<String, dynamic> payload,
    List<String> dependsOn = const [],
    String? clientRef,
  }) async {
    clientRef ??= Ulid.generate();
    await _db
        .into(_db.outbox)
        .insert(
          OutboxCompanion.insert(
            clientRef: clientRef,
            organizationId: organizationId,
            operation: type.apiValue,
            payload: jsonEncode(payload),
            dependsOnClientRef: dependsOn.isEmpty
                ? const Value.absent()
                : Value(jsonEncode(dependsOn)),
          ),
        );
    return clientRef;
  }

  /// Dépendances (`clientRef`) déclarées pour une ligne, dans l'ordre.
  List<String> dependsOnOf(OutboxRow row) {
    if (row.dependsOnClientRef == null) return const [];
    return (jsonDecode(row.dependsOnClientRef!) as List<dynamic>)
        .cast<String>();
  }

  /// Toutes les lignes gérées par le `SyncEngine`, triées du plus ancien au
  /// plus récent (utilisé par l'écran Outbox et par le moteur).
  Future<List<OutboxRow>> all(String organizationId) {
    return (_db.select(_db.outbox)
          ..where(
            (t) =>
                t.organizationId.equals(organizationId) &
                t.operation.isIn(_syncEngineOperations),
          )
          ..orderBy([(t) => OrderingTerm(expression: t.createdAt)]))
        .get();
  }

  Stream<List<OutboxRow>> watchAll(String organizationId) {
    return (_db.select(_db.outbox)
          ..where(
            (t) =>
                t.organizationId.equals(organizationId) &
                t.operation.isIn(_syncEngineOperations),
          )
          ..orderBy([(t) => OrderingTerm(expression: t.createdAt)]))
        .watch();
  }

  /// `batchRef` d'un lot déjà envoyé mais dont le résultat n'est pas encore
  /// connu (coupure réseau pendant l'attente) : à rejouer tel quel, jamais
  /// régénéré.
  Future<String?> inFlightBatchRef(String organizationId) async {
    final List<OutboxRow> rows =
        await (_db.select(_db.outbox)..where(
              (t) =>
                  t.organizationId.equals(organizationId) &
                  t.status.equals(OutboxStatus.sending.dbValue),
            ))
            .get();
    if (rows.isEmpty) return null;
    return rows.first.batchRef;
  }

  /// Lignes d'un lot en cours (même `batchRef`), ou candidates `PENDING`
  /// (jusqu'à `limit`) s'il n'y a pas de lot en cours.
  Future<List<OutboxRow>> selectBatchCandidates(
    String organizationId,
    int limit,
  ) async {
    final String? inFlight = await inFlightBatchRef(organizationId);
    if (inFlight != null) {
      return (_db.select(_db.outbox)
            ..where(
              (t) =>
                  t.organizationId.equals(organizationId) &
                  t.batchRef.equals(inFlight),
            )
            ..orderBy([(t) => OrderingTerm(expression: t.createdAt)]))
          .get();
    }
    final List<OutboxRow> pending =
        await (_db.select(_db.outbox)
              ..where(
                (t) =>
                    t.organizationId.equals(organizationId) &
                    t.status.equals(OutboxStatus.pending.dbValue) &
                    t.operation.isIn(_syncEngineOperations),
              )
              ..orderBy([(t) => OrderingTerm(expression: t.createdAt)]))
            .get();
    return pending.take(limit).toList();
  }

  /// Dépendants (autres lignes candidates) dont `dependsOn` contient
  /// [clientRef] — utilisé pour reporter le `documentId` résolu d'une
  /// pièce jointe dans le `CASH_RECEIPT` qui la référence.
  Future<List<OutboxRow>> dependentsOf(
    String organizationId,
    String clientRef,
  ) async {
    final List<OutboxRow> rows = await all(organizationId);
    return rows.where((r) => dependsOnOf(r).contains(clientRef)).toList();
  }

  /// Réécrit le `payload` JSON d'une ligne encore `PENDING` (résolution
  /// locale d'un `documentId` avant l'envoi du `CASH_RECEIPT` dépendant).
  Future<void> patchPayload(
    String clientRef,
    Map<String, dynamic> Function(Map<String, dynamic>) transform,
  ) async {
    final OutboxRow? row = await (_db.select(
      _db.outbox,
    )..where((t) => t.clientRef.equals(clientRef))).getSingleOrNull();
    if (row == null) return;
    final Map<String, dynamic> updated = transform(
      jsonDecode(row.payload) as Map<String, dynamic>,
    );
    await (_db.update(_db.outbox)..where((t) => t.clientRef.equals(clientRef)))
        .write(OutboxCompanion(payload: Value(jsonEncode(updated))));
  }

  Future<void> markSending(List<String> clientRefs, String batchRef) async {
    for (final String ref in clientRefs) {
      await (_db.update(
        _db.outbox,
      )..where((t) => t.clientRef.equals(ref))).write(
        OutboxCompanion(
          status: Value(OutboxStatus.sending.dbValue),
          batchRef: Value(batchRef),
        ),
      );
    }
  }

  Future<void> markSent(String clientRef) {
    return (_db.update(
      _db.outbox,
    )..where((t) => t.clientRef.equals(clientRef))).write(
      OutboxCompanion(
        status: Value(OutboxStatus.sent.dbValue),
        batchRef: const Value(null),
        lastErrorCode: const Value(null),
        lastErrorMessage: const Value(null),
      ),
    );
  }

  Future<void> markFailedOrConflict(
    String clientRef, {
    required bool isConflict,
    String? code,
    String? message,
  }) async {
    final OutboxRow? row = await (_db.select(
      _db.outbox,
    )..where((t) => t.clientRef.equals(clientRef))).getSingleOrNull();
    final int attempts = (row?.attemptCount ?? 0) + 1;
    await (_db.update(
      _db.outbox,
    )..where((t) => t.clientRef.equals(clientRef))).write(
      OutboxCompanion(
        status: Value(
          isConflict
              ? OutboxStatus.conflict.dbValue
              : OutboxStatus.failed.dbValue,
        ),
        batchRef: const Value(null),
        lastErrorCode: Value(code),
        lastErrorMessage: Value(message),
        attemptCount: Value(attempts),
      ),
    );
  }

  /// SKIPPED (dépendance non appliquée dans ce lot) : réessayé plus tard,
  /// remis en `PENDING` sans `batchRef`.
  Future<void> requeue(String clientRef) {
    return (_db.update(
      _db.outbox,
    )..where((t) => t.clientRef.equals(clientRef))).write(
      OutboxCompanion(
        status: Value(OutboxStatus.pending.dbValue),
        batchRef: const Value(null),
      ),
    );
  }

  /// Nouvelle tentative manuelle depuis l'écran Outbox. Un élément
  /// `CONFLICT` ne peut pas être relancé depuis le mobile : seul un
  /// gestionnaire tranche via le dashboard (`docs/api/phase5-contract.md`).
  Future<bool> retryFromScreen(String clientRef) async {
    final OutboxRow? row = await (_db.select(
      _db.outbox,
    )..where((t) => t.clientRef.equals(clientRef))).getSingleOrNull();
    if (row == null || row.status == OutboxStatus.conflict.dbValue) {
      return false;
    }
    await requeue(clientRef);
    return true;
  }
}

@riverpod
OutboxRepository outboxRepository(Ref ref) {
  return OutboxRepository(ref.watch(appDatabaseProvider));
}
