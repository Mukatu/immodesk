import 'outbox_types.dart';

/// Une opération de l'enveloppe de synchronisation
/// (`docs/api/phase5-contract.md`).
class SyncOperation {
  const SyncOperation({
    required this.clientRef,
    required this.type,
    required this.clientCreatedAt,
    this.dependsOn = const [],
    required this.payload,
  });

  final String clientRef;
  final OutboxOperationType type;

  /// ISO 8601, informatif : le serveur ne fait jamais confiance à
  /// l'horodatage de l'appareil pour les dates métier opposables.
  final String clientCreatedAt;

  /// `clientRef` d'opérations du même lot à appliquer avant celle-ci.
  final List<String> dependsOn;
  final Object? payload;

  Map<String, dynamic> toJson() => <String, dynamic>{
    'clientRef': clientRef,
    'type': type.apiValue,
    'clientCreatedAt': clientCreatedAt,
    if (dependsOn.isNotEmpty) 'dependsOn': dependsOn,
    'payload': payload,
  };
}

/// Corps de `POST /v1/sync/batches`.
class SyncBatchInput {
  const SyncBatchInput({
    required this.batchRef,
    required this.deviceId,
    this.devicePlatform,
    this.appVersion,
    this.clientGeneratedAt,
    this.offlineDurationMinutes,
    required this.operations,
  });

  final String batchRef;
  final String deviceId;
  final String? devicePlatform;
  final String? appVersion;
  final String? clientGeneratedAt;
  final int? offlineDurationMinutes;
  final List<SyncOperation> operations;

  Map<String, dynamic> toJson() => <String, dynamic>{
    'batchRef': batchRef,
    'deviceId': deviceId,
    if (devicePlatform != null) 'devicePlatform': devicePlatform,
    if (appVersion != null) 'appVersion': appVersion,
    if (clientGeneratedAt != null) 'clientGeneratedAt': clientGeneratedAt,
    if (offlineDurationMinutes != null)
      'offlineDurationMinutes': offlineDurationMinutes,
    'operations': operations.map((o) => o.toJson()).toList(),
  };
}

/// Résultat par opération, `SyncOperationOutcome` du contrat.
enum SyncOperationOutcome {
  applied('APPLIED'),
  duplicate('DUPLICATE'),
  rejected('REJECTED'),
  conflict('CONFLICT'),
  skipped('SKIPPED');

  const SyncOperationOutcome(this.apiValue);

  final String apiValue;

  static SyncOperationOutcome fromApiValue(String value) {
    return SyncOperationOutcome.values.firstWhere(
      (o) => o.apiValue == value,
      orElse: () => SyncOperationOutcome.rejected,
    );
  }
}

class SyncOperationResult {
  const SyncOperationResult({
    required this.clientRef,
    required this.type,
    required this.outcome,
    this.resourceType,
    this.resourceId,
    this.code,
    this.message,
    this.retryable = false,
  });

  final String clientRef;
  final String type;
  final SyncOperationOutcome outcome;
  final String? resourceType;
  final String? resourceId;
  final String? code;
  final String? message;
  final bool retryable;

  factory SyncOperationResult.fromJson(Map<String, dynamic> json) {
    return SyncOperationResult(
      clientRef: json['clientRef'] as String,
      type: json['type'] as String,
      outcome: SyncOperationOutcome.fromApiValue(json['outcome'] as String),
      resourceType: json['resourceType'] as String?,
      resourceId: json['resourceId'] as String?,
      code: json['code'] as String?,
      message: json['message'] as String?,
      retryable: json['retryable'] as bool? ?? false,
    );
  }
}

class SyncBatchResult {
  const SyncBatchResult({
    required this.batchId,
    required this.batchRef,
    required this.status,
    required this.operationsCount,
    required this.appliedCount,
    required this.rejectedCount,
    required this.conflictsCount,
    required this.receivedAt,
    this.appliedAt,
    required this.results,
  });

  final String batchId;
  final String batchRef;
  final String status;
  final int operationsCount;
  final int appliedCount;
  final int rejectedCount;
  final int conflictsCount;
  final String receivedAt;
  final String? appliedAt;
  final List<SyncOperationResult> results;

  factory SyncBatchResult.fromJson(Map<String, dynamic> json) {
    final List<dynamic> results = json['results'] as List<dynamic>? ?? [];
    return SyncBatchResult(
      batchId: json['batchId'] as String,
      batchRef: json['batchRef'] as String,
      status: json['status'] as String,
      operationsCount: json['operationsCount'] as int? ?? 0,
      appliedCount: json['appliedCount'] as int? ?? 0,
      rejectedCount: json['rejectedCount'] as int? ?? 0,
      conflictsCount: json['conflictsCount'] as int? ?? 0,
      receivedAt: json['receivedAt'] as String? ?? '',
      appliedAt: json['appliedAt'] as String?,
      results: results
          .map(
            (dynamic e) =>
                SyncOperationResult.fromJson(e as Map<String, dynamic>),
          )
          .toList(),
    );
  }
}
