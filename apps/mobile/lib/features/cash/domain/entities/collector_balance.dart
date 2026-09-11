import 'package:freezed_annotation/freezed_annotation.dart';

part 'collector_balance.freezed.dart';
part 'collector_balance.g.dart';

/// `CollectorBalance` du contrat de phase 3
/// (`GET /v1/cash/collectors/{userId}/balance`) : encours détenu par le
/// démarcheur, plafond d'organisation (`CashSettings.collectorHoldingCapAmount`,
/// défaut 500 000 XAF) et alerte de dépassement (jamais bloquant).
@freezed
abstract class CollectorBalance with _$CollectorBalance {
  const factory CollectorBalance({
    required String userId,
    required String fullName,
    required int heldAmount,
    required int receiptsCount,
    String? oldestReceiptAt,
    required int capAmount,
    required bool overCap,
    String? lastRemittanceAt,
  }) = _CollectorBalance;

  factory CollectorBalance.fromJson(Map<String, dynamic> json) =>
      _$CollectorBalanceFromJson(json);
}
