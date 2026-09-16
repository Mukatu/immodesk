import 'package:freezed_annotation/freezed_annotation.dart';

import 'maintenance_priority.dart';
import 'maintenance_status.dart';

part 'maintenance_summary.freezed.dart';
part 'maintenance_summary.g.dart';

@freezed
abstract class MaintenancePropertyRef with _$MaintenancePropertyRef {
  const factory MaintenancePropertyRef({
    required String id,
    required String name,
  }) = _MaintenancePropertyRef;

  factory MaintenancePropertyRef.fromJson(Map<String, dynamic> json) =>
      _$MaintenancePropertyRefFromJson(json);
}

@freezed
abstract class MaintenanceUnitRef with _$MaintenanceUnitRef {
  const factory MaintenanceUnitRef({required String id, required String code}) =
      _MaintenanceUnitRef;

  factory MaintenanceUnitRef.fromJson(Map<String, dynamic> json) =>
      _$MaintenanceUnitRefFromJson(json);
}

/// `MaintenanceSummary` du contrat d'API (`docs/api/phase8-contract.md`).
@freezed
abstract class MaintenanceSummary with _$MaintenanceSummary {
  const factory MaintenanceSummary({
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
  }) = _MaintenanceSummary;

  factory MaintenanceSummary.fromJson(Map<String, dynamic> json) =>
      _$MaintenanceSummaryFromJson(json);
}
