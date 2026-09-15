import 'package:freezed_annotation/freezed_annotation.dart';

import 'statement_status.dart';

part 'owner_statement_summary.freezed.dart';
part 'owner_statement_summary.g.dart';

/// Bien concerné par un relevé, `null` pour un relevé consolidé
/// (mandat couvrant plusieurs biens, arbitrage 1 du contrat de phase 7).
@freezed
abstract class StatementPropertyRef with _$StatementPropertyRef {
  const factory StatementPropertyRef({
    required String id,
    required String name,
  }) = _StatementPropertyRef;

  factory StatementPropertyRef.fromJson(Map<String, dynamic> json) =>
      _$StatementPropertyRefFromJson(json);
}

/// `StatementSummary` du contrat de phase 7, tel que renvoyé par
/// `GET /v1/portal/statements`.
@freezed
abstract class OwnerStatementSummary with _$OwnerStatementSummary {
  const factory OwnerStatementSummary({
    required String id,
    required String statementNumber,
    required StatementStatus status,
    StatementPropertyRef? property,
    required String periodStart,
    required String periodEnd,
    @Default(0) int rentCollectedAmount,
    @Default(0) int commissionAmount,
    @Default(0) int expensesAmount,
    @Default(0) int carryForwardAmount,
    required int netPayableAmount,
    String? issuedAt,
    String? sentAt,
    String? settledAt,
  }) = _OwnerStatementSummary;

  factory OwnerStatementSummary.fromJson(Map<String, dynamic> json) =>
      _$OwnerStatementSummaryFromJson(json);
}

extension OwnerStatementSummaryDisplay on OwnerStatementSummary {
  /// `true` tant que le solde n'a pas encore été reversé (relevé émis ou
  /// envoyé, jamais brouillon ni annulé) — un relevé `DRAFT` n'est jamais
  /// visible du bailleur (portail en lecture seule uniquement des relevés
  /// mis à disposition).
  bool get isAwaitingPayout =>
      (status == StatementStatus.issued || status == StatementStatus.sent) &&
      netPayableAmount > 0;
}

/// Solde à percevoir affiché en accueil du portail bailleur : le montant
/// net du relevé le plus récent encore en attente de reversement, sinon 0
/// (aucun reversement n'est possible sur un solde négatif ou nul —
/// arbitrage 5 : il se reporte, il ne s'appelle pas).
int outstandingBalance(List<OwnerStatementSummary> statements) {
  final List<OwnerStatementSummary> sorted = [...statements]
    ..sort((a, b) => b.periodStart.compareTo(a.periodStart));
  for (final OwnerStatementSummary statement in sorted) {
    if (statement.isAwaitingPayout) return statement.netPayableAmount;
  }
  return 0;
}

/// Relevé le plus récent (par début de période), `null` si aucun.
OwnerStatementSummary? mostRecentStatement(
  List<OwnerStatementSummary> statements,
) {
  if (statements.isEmpty) return null;
  final List<OwnerStatementSummary> sorted = [...statements]
    ..sort((a, b) => b.periodStart.compareTo(a.periodStart));
  return sorted.first;
}
