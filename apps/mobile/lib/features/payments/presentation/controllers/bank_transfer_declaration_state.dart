import '../../../collection/domain/entities/invoice_summary.dart';
import '../../domain/entities/payment_instructions.dart';
import '../../domain/entities/transfer_declaration_result.dart';

/// État de l'écran de déclaration de virement (`docs/api/phase4-contract.md`,
/// section « Virement déclaré »). La référence de virement est pré-remplie
/// avec le numéro de facture (`transferReference` des instructions de
/// paiement) et reste modifiable ; la preuve est obligatoire.
class BankTransferDeclarationState {
  const BankTransferDeclarationState({
    required this.invoice,
    this.organizationId,
    required this.bankAccounts,
    required this.clientRef,
    this.selectedAccount,
    this.amount = 0,
    this.transferDate = '',
    this.transferReference = '',
    this.payerName = '',
    this.payerBankName = '',
    this.payerAccountNumber = '',
    this.proofFilePath,
    this.isSubmitting = false,
    this.errorMessage,
    this.result,
    this.isOfflineBlocked = false,
  });

  final InvoiceSummary? invoice;
  final String? organizationId;
  final List<BankAccountSummary> bankAccounts;
  final String clientRef;
  final BankAccountSummary? selectedAccount;
  final int amount;
  final String transferDate;
  final String transferReference;
  final String payerName;
  final String payerBankName;
  final String payerAccountNumber;
  final String? proofFilePath;
  final bool isSubmitting;
  final String? errorMessage;
  final TransferDeclarationResult? result;
  final bool isOfflineBlocked;

  bool get canSubmit =>
      !isSubmitting &&
      !isOfflineBlocked &&
      selectedAccount != null &&
      amount > 0 &&
      transferDate.isNotEmpty &&
      payerName.isNotEmpty &&
      proofFilePath != null;

  BankTransferDeclarationState copyWith({
    BankAccountSummary? selectedAccount,
    int? amount,
    String? transferDate,
    String? transferReference,
    String? payerName,
    String? payerBankName,
    String? payerAccountNumber,
    String? proofFilePath,
    bool clearProof = false,
    bool? isSubmitting,
    String? errorMessage,
    bool clearError = false,
    TransferDeclarationResult? result,
  }) {
    return BankTransferDeclarationState(
      invoice: invoice,
      organizationId: organizationId,
      bankAccounts: bankAccounts,
      clientRef: clientRef,
      selectedAccount: selectedAccount ?? this.selectedAccount,
      amount: amount ?? this.amount,
      transferDate: transferDate ?? this.transferDate,
      transferReference: transferReference ?? this.transferReference,
      payerName: payerName ?? this.payerName,
      payerBankName: payerBankName ?? this.payerBankName,
      payerAccountNumber: payerAccountNumber ?? this.payerAccountNumber,
      proofFilePath: clearProof ? null : (proofFilePath ?? this.proofFilePath),
      isSubmitting: isSubmitting ?? this.isSubmitting,
      errorMessage: clearError ? null : (errorMessage ?? this.errorMessage),
      result: result ?? this.result,
    );
  }
}
