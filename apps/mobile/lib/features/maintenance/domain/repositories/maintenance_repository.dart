import '../entities/maintenance_detail.dart';
import '../entities/maintenance_summary.dart';
import '../entities/maintenance_update.dart';

/// Accès en ligne aux demandes de maintenance affectées au démarcheur. Le
/// mode hors ligne n'emprunte pas ce port pour l'ajout d'une mise à jour :
/// il enqueue une opération `MAINTENANCE_UPDATE` dans l'outbox généralisée
/// (voir `MaintenanceUpdateController`).
abstract interface class MaintenanceRepository {
  Future<List<MaintenanceSummary>> fetchAssigned({
    required String organizationId,
    required String assignedToUserId,
  });

  Future<MaintenanceDetail> fetchDetail({
    required String organizationId,
    required String id,
  });

  Future<MaintenanceUpdate> postUpdate({
    required String organizationId,
    required String id,
    String? newStatus,
    String? message,
    String? photoDocumentId,
    required String clientRef,
  });
}
