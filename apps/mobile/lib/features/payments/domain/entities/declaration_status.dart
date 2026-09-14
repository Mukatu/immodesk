import 'package:json_annotation/json_annotation.dart';

/// `DeclarationStatus` (virement) du contrat de phase 4 :
/// `SUBMITTED, UNDER_REVIEW, MATCHED, APPROVED, REJECTED, CANCELLED`.
/// `MATCHED` est réservé au rapprochement de la phase 6.
enum DeclarationStatus {
  @JsonValue('SUBMITTED')
  submitted,
  @JsonValue('UNDER_REVIEW')
  underReview,
  @JsonValue('MATCHED')
  matched,
  @JsonValue('APPROVED')
  approved,
  @JsonValue('REJECTED')
  rejected,
  @JsonValue('CANCELLED')
  cancelled,
}

const Map<String, DeclarationStatus> _declarationStatusByApiValue = {
  'SUBMITTED': DeclarationStatus.submitted,
  'UNDER_REVIEW': DeclarationStatus.underReview,
  'MATCHED': DeclarationStatus.matched,
  'APPROVED': DeclarationStatus.approved,
  'REJECTED': DeclarationStatus.rejected,
  'CANCELLED': DeclarationStatus.cancelled,
};

/// Convertit la valeur API (`SCREAMING_SNAKE_CASE`) en [DeclarationStatus].
DeclarationStatus declarationStatusFromApiValue(String value) {
  final DeclarationStatus? status = _declarationStatusByApiValue[value];
  if (status == null) {
    throw FormatException('Statut de déclaration inconnu : $value');
  }
  return status;
}
