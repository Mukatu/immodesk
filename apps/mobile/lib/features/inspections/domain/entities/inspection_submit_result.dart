import 'package:freezed_annotation/freezed_annotation.dart';

part 'inspection_submit_result.freezed.dart';
part 'inspection_submit_result.g.dart';

/// Résultat minimal d'un état des lieux soumis (créé puis signé), affiché
/// sur l'écran de confirmation. Le rapport PDF complet suit un circuit
/// asynchrone (`docs/api/phase8-contract.md`, `GET /inspections/{id}/pdf`),
/// hors périmètre de cet écran.
@freezed
abstract class InspectionSubmitResult with _$InspectionSubmitResult {
  const factory InspectionSubmitResult({
    required String id,
    required String reference,
    required String status,
  }) = _InspectionSubmitResult;

  factory InspectionSubmitResult.fromJson(Map<String, dynamic> json) =>
      _$InspectionSubmitResultFromJson(json);
}
