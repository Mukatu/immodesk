import '../../domain/entities/maintenance_detail.dart';
import '../../domain/entities/maintenance_summary.dart';
import '../../domain/entities/maintenance_update.dart';
import '../../domain/repositories/maintenance_repository.dart';
import '../datasources/maintenance_remote_data_source.dart';

class MaintenanceRepositoryImpl implements MaintenanceRepository {
  MaintenanceRepositoryImpl(this._remote);

  final MaintenanceRemoteDataSource _remote;

  @override
  Future<List<MaintenanceSummary>> fetchAssigned({
    required String organizationId,
    required String assignedToUserId,
  }) {
    return _remote.fetchAssigned(organizationId, assignedToUserId);
  }

  @override
  Future<MaintenanceDetail> fetchDetail({
    required String organizationId,
    required String id,
  }) {
    return _remote.fetchDetail(organizationId, id);
  }

  @override
  Future<MaintenanceUpdate> postUpdate({
    required String organizationId,
    required String id,
    String? newStatus,
    String? message,
    String? photoDocumentId,
    required String clientRef,
  }) async {
    final Map<String, dynamic> data = await _remote
        .postUpdate(organizationId, id, <String, dynamic>{
          'newStatus': ?newStatus,
          'message': ?message,
          'photoDocumentId': ?photoDocumentId,
          'clientRef': clientRef,
        });
    return MaintenanceUpdate.fromJson(data);
  }
}
