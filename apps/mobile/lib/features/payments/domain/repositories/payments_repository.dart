import '../entities/momo_quote.dart';
import '../entities/momo_transaction.dart';
import '../entities/payment_instructions.dart';
import '../entities/transfer_declaration_result.dart';

/// Port d'accès aux modes de paiement de la phase 4 : instructions de
/// paiement d'une facture, déclarations Mobile Money et virement,
/// agrégateur Mobile Money (devis, initiation, suivi de statut).
/// `docs/api/phase4-contract.md`, section « Arbitrages » : une déclaration
/// ne crée jamais de paiement côté mobile, seule la validation (web,
/// gestionnaire) le fait.
abstract interface class PaymentsRepository {
  Future<PaymentInstructions> fetchPaymentInstructions({
    required String organizationId,
    required String invoiceId,
  });

  /// `POST /v1/payments/mobile-money/declarations`. Idempotent par
  /// `clientRef`.
  Future<MomoTransaction> declareMobileMoney({
    required String organizationId,
    required String tenantId,
    String? leaseId,
    String? invoiceId,
    required String provider,
    required String operatorReference,
    required String payerMsisdn,
    required String payeeMsisdn,
    required int amount,
    String? proofDocumentId,
    required String clientRef,
  });

  /// `POST /v1/bank-transfer-declarations`. Idempotent par `clientRef`.
  Future<TransferDeclarationResult> declareBankTransfer({
    required String organizationId,
    required String tenantId,
    String? leaseId,
    String? invoiceId,
    required int declaredAmount,
    required String transferDate,
    String? transferReference,
    required String payerName,
    String? payerBankName,
    String? payerAccountNumber,
    required String beneficiaryBankAccountId,
    required String proofDocumentId,
    required String clientRef,
  });

  /// `POST /v1/payments/mobile-money/quote`, affiché avant validation de
  /// l'initiation agrégateur.
  Future<MomoQuote> quoteMobileMoney({
    required String organizationId,
    String? invoiceId,
    required int amount,
  });

  /// `POST /v1/payments/mobile-money/initiate`. Réponse `202` : la
  /// transaction reste `INITIATED`/`PENDING` jusqu'au webhook puis à la
  /// re-interrogation serveur (jamais confirmée côté mobile).
  Future<MomoTransaction> initiateMobileMoney({
    required String organizationId,
    String? invoiceId,
    required String tenantId,
    required int amount,
    required String payerMsisdn,
    required String clientRef,
  });

  /// `GET /v1/payments/mobile-money/transactions/{id}`, interrogé toutes
  /// les 3 secondes par l'écran d'attente agrégateur.
  Future<MomoTransaction> fetchMomoTransaction({
    required String organizationId,
    required String transactionId,
  });
}
