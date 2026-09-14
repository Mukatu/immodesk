import 'package:json_annotation/json_annotation.dart';

/// `MomoStatus` du contrat de phase 4 (`docs/api/phase4-contract.md`) :
/// `INITIATED, PENDING, DECLARED, SUCCEEDED, FAILED, EXPIRED, CANCELLED,
/// REJECTED, REFUNDED`.
enum MomoStatus {
  @JsonValue('INITIATED')
  initiated,
  @JsonValue('PENDING')
  pending,
  @JsonValue('DECLARED')
  declared,
  @JsonValue('SUCCEEDED')
  succeeded,
  @JsonValue('FAILED')
  failed,
  @JsonValue('EXPIRED')
  expired,
  @JsonValue('CANCELLED')
  cancelled,
  @JsonValue('REJECTED')
  rejected,
  @JsonValue('REFUNDED')
  refunded,
}

const Map<String, MomoStatus> _momoStatusByApiValue = {
  'INITIATED': MomoStatus.initiated,
  'PENDING': MomoStatus.pending,
  'DECLARED': MomoStatus.declared,
  'SUCCEEDED': MomoStatus.succeeded,
  'FAILED': MomoStatus.failed,
  'EXPIRED': MomoStatus.expired,
  'CANCELLED': MomoStatus.cancelled,
  'REJECTED': MomoStatus.rejected,
  'REFUNDED': MomoStatus.refunded,
};

const Map<MomoStatus, String> _momoStatusToApiValue = {
  MomoStatus.initiated: 'INITIATED',
  MomoStatus.pending: 'PENDING',
  MomoStatus.declared: 'DECLARED',
  MomoStatus.succeeded: 'SUCCEEDED',
  MomoStatus.failed: 'FAILED',
  MomoStatus.expired: 'EXPIRED',
  MomoStatus.cancelled: 'CANCELLED',
  MomoStatus.rejected: 'REJECTED',
  MomoStatus.refunded: 'REFUNDED',
};

/// Convertit la valeur API (`SCREAMING_SNAKE_CASE`) en [MomoStatus].
MomoStatus momoStatusFromApiValue(String value) {
  final MomoStatus? status = _momoStatusByApiValue[value];
  if (status == null) {
    throw FormatException(
      'Statut de transaction Mobile Money inconnu : $value',
    );
  }
  return status;
}

/// Valeur API correspondant à ce statut.
String momoStatusToApiValue(MomoStatus status) =>
    _momoStatusToApiValue[status]!;

/// Statuts d'une transaction agrégateur pour laquelle l'écran d'attente
/// doit continuer à interroger le statut (arbitrage §5 du contrat : jamais
/// de confirmation sur la seule foi du webhook côté client non plus).
bool momoStatusIsPending(MomoStatus status) =>
    status == MomoStatus.initiated || status == MomoStatus.pending;
