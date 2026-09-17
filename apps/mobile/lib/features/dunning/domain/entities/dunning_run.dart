import 'package:freezed_annotation/freezed_annotation.dart';

import 'dunning_step_status.dart';
import 'message_status.dart';
import 'notification_channel.dart';

part 'dunning_run.freezed.dart';
part 'dunning_run.g.dart';

/// Référence légère vers la facture relancée, telle qu'imbriquée dans
/// `DunningRun` (`null` si la facture a depuis été supprimée).
@freezed
abstract class DunningRunInvoiceRef with _$DunningRunInvoiceRef {
  const factory DunningRunInvoiceRef({
    required String id,
    String? invoiceNumber,
  }) = _DunningRunInvoiceRef;

  factory DunningRunInvoiceRef.fromJson(Map<String, dynamic> json) =>
      _$DunningRunInvoiceRefFromJson(json);
}

/// Référence légère vers le locataire relancé.
@freezed
abstract class DunningRunTenantRef with _$DunningRunTenantRef {
  const factory DunningRunTenantRef({
    required String id,
    required String displayName,
  }) = _DunningRunTenantRef;

  factory DunningRunTenantRef.fromJson(Map<String, dynamic> json) =>
      _$DunningRunTenantRefFromJson(json);
}

/// `DunningRun` du contrat d'API (`docs/api/phase9-contract.md`, § Types).
/// Consultation en lecture seule uniquement côté mobile : aucune règle de
/// relance ni de pénalité n'est configurable depuis l'application, cet
/// écran affiche l'historique déjà exécuté par le moteur côté serveur.
@freezed
abstract class DunningRun with _$DunningRun {
  const factory DunningRun({
    required String id,
    required String ruleId,
    required String ruleName,
    required int stepOrder,
    required DunningStepStatus status,
    required String runDate,
    required String scheduledAt,
    String? executedAt,
    @Default(0) int daysOverdue,
    @Default(0) int balanceAmount,
    required NotificationChannel channel,
    DunningRunInvoiceRef? invoice,
    required DunningRunTenantRef tenant,
    String? notificationId,
    String? messageLogId,
    MessageStatus? messageStatus,
    @Default(false) bool guarantorNotified,
    @Default(false) bool penaltyApplied,
    @Default(0) int penaltyAmount,
    String? skipReason,
    String? errorMessage,
  }) = _DunningRun;

  factory DunningRun.fromJson(Map<String, dynamic> json) =>
      _$DunningRunFromJson(json);
}
