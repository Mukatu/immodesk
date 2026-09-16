import '../entities/meter.dart';
import '../entities/meter_reading_result.dart';

/// Accès en ligne aux compteurs et à leurs relevés. Le mode hors ligne
/// n'emprunte pas ce port : il enqueue une opération `METER_READING` dans
/// l'outbox généralisée (voir `MeterReadingController`).
abstract interface class MetersRepository {
  Future<List<Meter>> fetchMeters({
    required String organizationId,
    String? unitId,
    String? propertyId,
  });

  Future<MeterReadingResult> createReading({
    required String organizationId,
    required String meterId,
    required String readingDate,
    required int currentIndex,
    bool rolloverApplied,
    bool isEstimated,
    String? photoDocumentId,
    String? notes,
    required String clientRef,
  });
}
