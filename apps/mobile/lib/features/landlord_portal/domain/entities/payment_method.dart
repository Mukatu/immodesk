import 'package:json_annotation/json_annotation.dart';

/// `PaymentMethod` du reversement (`docs/api/phase7-contract.md`) : CASH,
/// MOBILE_MONEY, BANK_TRANSFER, BANK_CHECK. Pas de valeur « virement
/// international » : un reversement à un bailleur en diaspora est un
/// `BANK_TRANSFER` vers un compte portant IBAN et BIC (arbitrage 6).
enum PaymentMethod {
  @JsonValue('CASH')
  cash,
  @JsonValue('MOBILE_MONEY')
  mobileMoney,
  @JsonValue('BANK_TRANSFER')
  bankTransfer,
  @JsonValue('BANK_CHECK')
  bankCheck,
}

extension PaymentMethodLabel on PaymentMethod {
  String get label => switch (this) {
    PaymentMethod.cash => 'Espèces',
    PaymentMethod.mobileMoney => 'Mobile Money',
    PaymentMethod.bankTransfer => 'Virement bancaire',
    PaymentMethod.bankCheck => 'Chèque',
  };
}
