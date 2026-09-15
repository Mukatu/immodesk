import 'package:freezed_annotation/freezed_annotation.dart';

part 'owner_statement_line.freezed.dart';
part 'owner_statement_line.g.dart';

/// `OwnerStatementLineType` du contrat de phase 7. Aucune ligne n'est
/// négative (`amount` positif) : le sens vient de `isDebit` (arbitrage 2).
enum OwnerStatementLineType {
  @JsonValue('RENT_COLLECTED')
  rentCollected,
  @JsonValue('CHARGE_COLLECTED')
  chargeCollected,
  @JsonValue('COMMISSION')
  commission,
  @JsonValue('EXPENSE')
  expense,
  @JsonValue('VAT')
  vat,
  @JsonValue('DEPOSIT_HELD')
  depositHeld,
  @JsonValue('CARRY_FORWARD')
  carryForward,
  @JsonValue('ADJUSTMENT')
  adjustment,
  @JsonValue('OTHER')
  other,
}

extension OwnerStatementLineTypeLabel on OwnerStatementLineType {
  String get label => switch (this) {
    OwnerStatementLineType.rentCollected => 'Loyer encaissé',
    OwnerStatementLineType.chargeCollected => 'Charges encaissées',
    OwnerStatementLineType.commission => 'Commission de gérance',
    OwnerStatementLineType.expense => 'Dépense',
    OwnerStatementLineType.vat => 'TVA sur commission',
    OwnerStatementLineType.depositHeld => 'Dépôt de garantie détenu',
    OwnerStatementLineType.carryForward => 'Report du solde précédent',
    OwnerStatementLineType.adjustment => 'Régularisation',
    OwnerStatementLineType.other => 'Autre',
  };
}

/// `StatementLine` du contrat de phase 7. `amount` est toujours positif :
/// `isDebit` porte le sens (une commission ou une dépense sont des débits,
/// un loyer encaissé est un crédit).
@freezed
abstract class OwnerStatementLine with _$OwnerStatementLine {
  const factory OwnerStatementLine({
    required String id,
    required OwnerStatementLineType lineType,
    required String label,
    required int amount,
    required bool isDebit,
    @Default(0) int position,
  }) = _OwnerStatementLine;

  factory OwnerStatementLine.fromJson(Map<String, dynamic> json) =>
      _$OwnerStatementLineFromJson(json);
}

extension OwnerStatementLineSigned on OwnerStatementLine {
  /// Montant signé pour affichage (`-` si débit), utile aux totaux locaux.
  int get signedAmount => isDebit ? -amount : amount;
}
