import 'package:freezed_annotation/freezed_annotation.dart';

import 'deposit_status.dart';

part 'deposit.freezed.dart';
part 'deposit.g.dart';

/// `Deposit` du contrat de phase 2 : dépôt de garantie d'un bail, avec ses
/// quatre montants (requis, encaissé, retenu, restitué) — lecture seule.
@freezed
abstract class Deposit with _$Deposit {
  const factory Deposit({
    required String id,
    required String leaseId,
    required String tenantId,
    required DepositStatus status,
    required int requiredAmount,
    @Default(0) int collectedAmount,
    @Default(0) int deductedAmount,
    @Default(0) int refundedAmount,
    @Default(0) int heldAmount,
    @Default('XAF') String currency,
    int? monthsEquivalent,
    String? dueDate,
    String? refundDueDate,
    String? refundedAt,
  }) = _Deposit;

  factory Deposit.fromJson(Map<String, dynamic> json) =>
      _$DepositFromJson(json);
}

extension DepositBalance on Deposit {
  /// Solde encore détenu, recalculé côté mobile pour vérifier la cohérence
  /// de `heldAmount` renvoyé par l'API : `collecté - retenu - restitué`.
  int get computedHeldAmount =>
      collectedAmount - deductedAmount - refundedAmount;

  /// Reste à encaisser pour atteindre le montant requis (jamais négatif).
  int get remainingToCollect =>
      (requiredAmount - collectedAmount).clamp(0, requiredAmount);

  /// `true` si le dépôt requis a été intégralement encaissé.
  bool get isFullyCollected => collectedAmount >= requiredAmount;
}
