import '../../../collection/domain/entities/invoice_summary.dart';
import '../../domain/entities/momo_transaction.dart';
import '../../domain/entities/payment_instructions.dart';

/// État de l'écran de déclaration Mobile Money (mode déclaré, livré en
/// priorité — `docs/api/phase4-contract.md`). Le `clientRef` est conservé
/// entre deux tentatives, comme pour l'encaissement en espèces.
class MomoDeclarationState {
  const MomoDeclarationState({
    required this.invoice,
    this.organizationId,
    required this.receptionNumbers,
    required this.clientRef,
    this.selectedNumber,
    this.payerMsisdn = '',
    this.operatorReference = '',
    this.amount = 0,
    this.proofFilePath,
    this.isSubmitting = false,
    this.errorMessage,
    this.result,
    this.isOfflineBlocked = false,
  });

  final InvoiceSummary? invoice;
  final String? organizationId;
  final List<MobileMoneyNumber> receptionNumbers;
  final String clientRef;
  final MobileMoneyNumber? selectedNumber;
  final String payerMsisdn;
  final String operatorReference;
  final int amount;
  final String? proofFilePath;
  final bool isSubmitting;
  final String? errorMessage;
  final MomoTransaction? result;
  final bool isOfflineBlocked;

  bool get canSubmit =>
      !isSubmitting &&
      !isOfflineBlocked &&
      selectedNumber != null &&
      payerMsisdn.isNotEmpty &&
      operatorReference.isNotEmpty &&
      amount > 0;

  MomoDeclarationState copyWith({
    MobileMoneyNumber? selectedNumber,
    String? payerMsisdn,
    String? operatorReference,
    int? amount,
    String? proofFilePath,
    bool clearProof = false,
    bool? isSubmitting,
    String? errorMessage,
    bool clearError = false,
    MomoTransaction? result,
  }) {
    return MomoDeclarationState(
      invoice: invoice,
      organizationId: organizationId,
      receptionNumbers: receptionNumbers,
      clientRef: clientRef,
      selectedNumber: selectedNumber ?? this.selectedNumber,
      payerMsisdn: payerMsisdn ?? this.payerMsisdn,
      operatorReference: operatorReference ?? this.operatorReference,
      amount: amount ?? this.amount,
      proofFilePath: clearProof ? null : (proofFilePath ?? this.proofFilePath),
      isSubmitting: isSubmitting ?? this.isSubmitting,
      errorMessage: clearError ? null : (errorMessage ?? this.errorMessage),
      result: result ?? this.result,
    );
  }
}
