import '../../domain/entities/meter.dart';
import '../../domain/entities/meter_reading_result.dart';
import '../../domain/repositories/meters_repository.dart';
import '../datasources/meters_remote_data_source.dart';

class MetersRepositoryImpl implements MetersRepository {
  MetersRepositoryImpl(this._remote);

  final MetersRemoteDataSource _remote;

  @override
  Future<List<Meter>> fetchMeters({
    required String organizationId,
    String? unitId,
    String? propertyId,
  }) {
    return _remote.fetchMeters(
      organizationId,
      unitId: unitId,
      propertyId: propertyId,
    );
  }

  @override
  Future<MeterReadingResult> createReading({
    required String organizationId,
    required String meterId,
    required String readingDate,
    required int currentIndex,
    bool rolloverApplied = false,
    bool isEstimated = false,
    String? photoDocumentId,
    String? notes,
    required String clientRef,
  }) async {
    final Map<String, dynamic> data = await _remote
        .createReading(organizationId, meterId, <String, dynamic>{
          'readingDate': readingDate,
          'currentIndex': currentIndex,
          'rolloverApplied': rolloverApplied,
          'isEstimated': isEstimated,
          'photoDocumentId': ?photoDocumentId,
          'notes': ?notes,
          'clientRef': clientRef,
        });
    return MeterReadingResult.fromJson(data);
  }
}
