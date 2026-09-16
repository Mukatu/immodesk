import 'package:freezed_annotation/freezed_annotation.dart';

import 'meter_type.dart';

part 'meter.freezed.dart';
part 'meter.g.dart';

/// Dernier relevé connu d'un compteur (`Meter.lastReading`,
/// `docs/api/phase8-contract.md`) : sert à afficher l'index précédent et à
/// détecter localement un index régressif avant l'envoi.
@freezed
abstract class MeterLastReading with _$MeterLastReading {
  const factory MeterLastReading({
    required String readingDate,
    required int currentIndex,
  }) = _MeterLastReading;

  factory MeterLastReading.fromJson(Map<String, dynamic> json) =>
      _$MeterLastReadingFromJson(json);
}

/// `Meter` du contrat d'API. `digitsCount` fixe la capacité du compteur
/// (nombre de chiffres du cadran), utilisée pour calculer la consommation
/// en cas de passage par zéro (`rolloverApplied`).
@freezed
abstract class Meter with _$Meter {
  const factory Meter({
    required String id,
    required String propertyId,
    String? unitId,
    required MeterType meterType,
    required String serialNumber,
    @Default(false) bool isPrepaid,
    @Default(false) bool isShared,
    @Default(5) int digitsCount,
    String? measurementUnit,
    MeterLastReading? lastReading,
  }) = _Meter;

  factory Meter.fromJson(Map<String, dynamic> json) => _$MeterFromJson(json);
}
