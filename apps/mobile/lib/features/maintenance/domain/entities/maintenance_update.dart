import 'package:freezed_annotation/freezed_annotation.dart';

import 'maintenance_status.dart';

part 'maintenance_update.freezed.dart';
part 'maintenance_update.g.dart';

/// `MaintenanceUpdate` du contrat d'API (`docs/api/phase8-contract.md`) :
/// une ligne de l'historique d'une demande (auteur, statut avant/après,
/// message, photo éventuelle).
@freezed
abstract class MaintenanceUpdate with _$MaintenanceUpdate {
  const factory MaintenanceUpdate({
    required String id,
    required String requestId,
    String? authorUserId,
    String? authorLabel,
    MaintenanceStatus? previousStatus,
    MaintenanceStatus? newStatus,
    String? message,
    String? photoDocumentId,
    int? amountDelta,
    @Default(true) bool isVisibleToTenant,
    required String occurredAt,
  }) = _MaintenanceUpdate;

  factory MaintenanceUpdate.fromJson(Map<String, dynamic> json) =>
      _$MaintenanceUpdateFromJson(json);
}
