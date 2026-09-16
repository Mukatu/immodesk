import 'package:freezed_annotation/freezed_annotation.dart';

import 'maintenance_priority.dart';
import 'maintenance_status.dart';
import 'maintenance_summary.dart';
import 'maintenance_update.dart';

part 'maintenance_detail.freezed.dart';
part 'maintenance_detail.g.dart';

/// `MaintenanceDetail` du contrat d'API : le résumé complété de la
/// description, de l'historique des mises à jour, et des champs de gestion
/// (catégorie en texte libre — la liste `ExpenseCategory` complète relève
/// du module dépenses, hors périmètre mobile de la phase 8).
@freezed
abstract class MaintenanceDetail with _$MaintenanceDetail {
  const factory MaintenanceDetail({
    required String id,
    required String reference,
    required MaintenanceStatus status,
    required MaintenancePriority priority,
    required String title,
    required MaintenancePropertyRef property,
    MaintenanceUnitRef? unit,
    required String reportedAt,
    String? slaDueAt,
    @Default(false) bool isOverdue,
    String? assignedToUserId,
    @Default(0) int ageHours,
    required String description,
    String? locationDetail,
    String? category,
    required MaintenanceReporter reporterType,
    @Default(0) int estimatedAmount,
    @Default(0) int actualAmount,
    String? chargedTo,
    @Default(false) bool landlordApproved,
    String? inspectionId,
    String? rejectionReason,
    @Default([]) List<MaintenanceUpdate> updates,
  }) = _MaintenanceDetail;

  factory MaintenanceDetail.fromJson(Map<String, dynamic> json) =>
      _$MaintenanceDetailFromJson(json);
}
