import 'package:freezed_annotation/freezed_annotation.dart';

part 'meter_reading_result.freezed.dart';
part 'meter_reading_result.g.dart';

/// Résultat minimal d'un relevé enregistré en ligne : l'index précédent et
/// la consommation sont calculés par le serveur, jamais par l'appareil
/// (`docs/api/phase8-contract.md`).
@freezed
abstract class MeterReadingResult with _$MeterReadingResult {
  const factory MeterReadingResult({
    required String id,
    required int previousIndex,
    required int consumption,
    @Default(false) bool rolloverApplied,
    @Default(false) bool isEstimated,
  }) = _MeterReadingResult;

  factory MeterReadingResult.fromJson(Map<String, dynamic> json) =>
      _$MeterReadingResultFromJson(json);
}
