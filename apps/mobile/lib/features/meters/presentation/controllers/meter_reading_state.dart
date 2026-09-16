import '../../domain/entities/meter.dart';
import '../../domain/entities/meter_reading_result.dart';
import '../../domain/meter_reading_math.dart';

/// État de la saisie d'un relevé pour un compteur donné.
class MeterReadingState {
  const MeterReadingState({
    required this.meter,
    required this.clientRef,
    this.currentIndexInput,
    this.rolloverApplied = false,
    this.photoPath,
    this.isSubmitting = false,
    this.errorMessage,
    this.result,
    this.queuedOffline = false,
  });

  final Meter meter;
  final String clientRef;
  final int? currentIndexInput;
  final bool rolloverApplied;
  final String? photoPath;
  final bool isSubmitting;
  final String? errorMessage;
  final MeterReadingResult? result;
  final bool queuedOffline;

  int? get previousIndex => meter.lastReading?.currentIndex;

  /// Une régression est détectée mais pas encore tranchée par le démarcheur
  /// (ni confirmée comme passage par zéro, ni corrigée) : la soumission doit
  /// être bloquée et une décision explicite demandée.
  bool get hasUnconfirmedRegression {
    final int? previous = previousIndex;
    final int? current = currentIndexInput;
    if (previous == null || current == null) return false;
    return isIndexRegression(previousIndex: previous, currentIndex: current) &&
        !rolloverApplied;
  }

  /// Aperçu de consommation affiché à l'écran (indicatif : le montant
  /// opposable reste celui calculé par le serveur).
  int? get previewConsumption {
    final int? previous = previousIndex;
    final int? current = currentIndexInput;
    if (previous == null || current == null) return null;
    if (isIndexRegression(previousIndex: previous, currentIndex: current) &&
        !rolloverApplied) {
      return null;
    }
    return computeConsumption(
      previousIndex: previous,
      currentIndex: current,
      digitsCount: meter.digitsCount,
      rolloverApplied: rolloverApplied,
    );
  }

  bool get canSubmit =>
      currentIndexInput != null && !hasUnconfirmedRegression && !isSubmitting;

  MeterReadingState copyWith({
    int? currentIndexInput,
    bool clearCurrentIndexInput = false,
    bool? rolloverApplied,
    String? photoPath,
    bool? isSubmitting,
    String? errorMessage,
    bool clearError = false,
    MeterReadingResult? result,
    bool? queuedOffline,
  }) {
    return MeterReadingState(
      meter: meter,
      clientRef: clientRef,
      currentIndexInput: clearCurrentIndexInput
          ? null
          : (currentIndexInput ?? this.currentIndexInput),
      rolloverApplied: rolloverApplied ?? this.rolloverApplied,
      photoPath: photoPath ?? this.photoPath,
      isSubmitting: isSubmitting ?? this.isSubmitting,
      errorMessage: clearError ? null : (errorMessage ?? this.errorMessage),
      result: result ?? this.result,
      queuedOffline: queuedOffline ?? this.queuedOffline,
    );
  }
}
