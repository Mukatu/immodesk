import 'package:freezed_annotation/freezed_annotation.dart';

import 'momo_provider.dart';

part 'payment_instructions.freezed.dart';
part 'payment_instructions.g.dart';

/// Compte bancaire de réception (`BankAccountSummary` du contrat de phase 4).
@freezed
abstract class BankAccountSummary with _$BankAccountSummary {
  const factory BankAccountSummary({
    required String id,
    required String bankName,
    required String accountHolderName,
    String? accountNumber,
    String? ribKey,
    String? iban,
  }) = _BankAccountSummary;

  factory BankAccountSummary.fromJson(Map<String, dynamic> json) =>
      _$BankAccountSummaryFromJson(json);
}

/// Numéro Mobile Money de réception (bailleur d'abord, sinon organisation).
@freezed
abstract class MobileMoneyNumber with _$MobileMoneyNumber {
  const factory MobileMoneyNumber({
    required String bankAccountId,
    required MomoProvider provider,
    required String msisdn,
    required String holderName,
  }) = _MobileMoneyNumber;

  factory MobileMoneyNumber.fromJson(Map<String, dynamic> json) =>
      _$MobileMoneyNumberFromJson(json);
}

/// Facture ciblée par les instructions de paiement.
@freezed
abstract class PaymentInstructionsInvoiceRef
    with _$PaymentInstructionsInvoiceRef {
  const factory PaymentInstructionsInvoiceRef({
    required String id,
    String? invoiceNumber,
    required int balanceAmount,
  }) = _PaymentInstructionsInvoiceRef;

  factory PaymentInstructionsInvoiceRef.fromJson(Map<String, dynamic> json) =>
      _$PaymentInstructionsInvoiceRefFromJson(json);
}

/// `PaymentInstructions` du contrat de phase 4
/// (`GET /v1/invoices/{id}/payment-instructions`) : référence de virement,
/// comptes de réception (bancaires et Mobile Money) et disponibilité de
/// l'agrégateur (double verrou plateforme + organisation, arbitrage §6).
@freezed
abstract class PaymentInstructions with _$PaymentInstructions {
  const factory PaymentInstructions({
    String? transferReference,
    PaymentInstructionsInvoiceRef? invoice,
    required List<BankAccountSummary> bankAccounts,
    required List<MobileMoneyNumber> mobileMoneyNumbers,
    required bool aggregatorAvailable,
  }) = _PaymentInstructions;

  factory PaymentInstructions.fromJson(Map<String, dynamic> json) =>
      _$PaymentInstructionsFromJson(json);
}
