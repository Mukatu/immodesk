import 'package:freezed_annotation/freezed_annotation.dart';

import 'declaration_status.dart';

part 'transfer_declaration_result.freezed.dart';
part 'transfer_declaration_result.g.dart';

/// Sous-ensemble de `TransferDeclaration` (contrat de phase 4) utile au
/// mobile : confirmation de la déclaration de virement soumise.
@freezed
abstract class TransferDeclarationResult with _$TransferDeclarationResult {
  const factory TransferDeclarationResult({
    required String id,
    required DeclarationStatus status,
    String? paymentId,
    String? rejectionReason,
    String? clientRef,
  }) = _TransferDeclarationResult;

  factory TransferDeclarationResult.fromJson(Map<String, dynamic> json) =>
      _$TransferDeclarationResultFromJson(json);
}
