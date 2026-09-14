import 'dart:io';

import 'package:riverpod_annotation/riverpod_annotation.dart';

import '../../../../core/network/api_exception.dart';
import '../../../../core/sync/ulid.dart';
import '../../../documents/data/documents_providers.dart';
import '../../../documents/domain/entities/document_kind.dart';
import '../../data/payments_providers.dart';
import '../../domain/entities/payment_instructions.dart';
import '../../domain/entities/transfer_declaration_result.dart';
import 'bank_transfer_declaration_state.dart';
import 'invoice_context.dart';

part 'bank_transfer_declaration_controller.g.dart';

@riverpod
class BankTransferDeclarationController
    extends _$BankTransferDeclarationController {
  @override
  Future<BankTransferDeclarationState> build(String invoiceId) async {
    final InvoiceContextResult context = await loadInvoiceContext(
      ref,
      invoiceId,
    );
    if (context.isOffline) {
      return BankTransferDeclarationState(
        invoice: null,
        bankAccounts: const [],
        clientRef: Ulid.generate(),
        isOfflineBlocked: true,
      );
    }
    final InvoiceContext ctx = context.context!;
    final PaymentInstructions instructions = await ref
        .watch(paymentsRepositoryProvider)
        .fetchPaymentInstructions(
          organizationId: ctx.organizationId,
          invoiceId: invoiceId,
        );
    return BankTransferDeclarationState(
      invoice: ctx.invoice,
      organizationId: ctx.organizationId,
      bankAccounts: instructions.bankAccounts,
      clientRef: Ulid.generate(),
      selectedAccount: instructions.bankAccounts.isEmpty
          ? null
          : instructions.bankAccounts.first,
      amount: ctx.invoice.balanceAmount,
      // Numéro de facture, copiable, repris tel quel par le rapprochement
      // de la phase 6 (`transferReference` des instructions de paiement).
      transferReference:
          instructions.transferReference ?? ctx.invoice.invoiceNumber ?? '',
    );
  }

  void selectAccount(BankAccountSummary account) {
    final current = state.value;
    if (current == null) return;
    state = AsyncData(current.copyWith(selectedAccount: account));
  }

  void setAmount(int amount) {
    final current = state.value;
    if (current == null) return;
    state = AsyncData(
      current.copyWith(amount: amount < 0 ? 0 : amount, clearError: true),
    );
  }

  void setTransferDate(String isoDate) {
    final current = state.value;
    if (current == null) return;
    state = AsyncData(
      current.copyWith(transferDate: isoDate, clearError: true),
    );
  }

  void setPayerName(String value) {
    final current = state.value;
    if (current == null) return;
    state = AsyncData(current.copyWith(payerName: value, clearError: true));
  }

  void setPayerBankName(String value) {
    final current = state.value;
    if (current == null) return;
    state = AsyncData(current.copyWith(payerBankName: value));
  }

  void setPayerAccountNumber(String value) {
    final current = state.value;
    if (current == null) return;
    state = AsyncData(current.copyWith(payerAccountNumber: value));
  }

  void setProofFilePath(String? path) {
    final current = state.value;
    if (current == null) return;
    state = AsyncData(
      current.copyWith(proofFilePath: path, clearProof: path == null),
    );
  }

  /// Verrouillé dès le premier appui, `clientRef` conservé après un échec.
  Future<void> submit() async {
    final current = state.value;
    if (current == null || !current.canSubmit) return;
    state = AsyncData(current.copyWith(isSubmitting: true, clearError: true));

    try {
      final String organizationId = current.organizationId!;
      final String proofDocumentId = await _uploadProof(
        organizationId,
        current.proofFilePath!,
      );
      final TransferDeclarationResult result = await ref
          .read(paymentsRepositoryProvider)
          .declareBankTransfer(
            organizationId: organizationId,
            tenantId: current.invoice!.tenant.id,
            leaseId: current.invoice!.lease.id,
            invoiceId: current.invoice!.id,
            declaredAmount: current.amount,
            transferDate: current.transferDate,
            transferReference: current.transferReference,
            payerName: current.payerName,
            payerBankName: current.payerBankName.isEmpty
                ? null
                : current.payerBankName,
            payerAccountNumber: current.payerAccountNumber.isEmpty
                ? null
                : current.payerAccountNumber,
            beneficiaryBankAccountId: current.selectedAccount!.id,
            proofDocumentId: proofDocumentId,
            clientRef: current.clientRef,
          );
      state = AsyncData(current.copyWith(isSubmitting: false, result: result));
    } on ApiException catch (e) {
      state = AsyncData(
        current.copyWith(isSubmitting: false, errorMessage: e.message),
      );
    }
  }

  Future<String> _uploadProof(String organizationId, String filePath) async {
    final repository = ref.read(documentsRepositoryProvider);
    final File file = File(filePath);
    final int sizeBytes = await file.length();
    final upload = await repository.requestUploadUrl(
      organizationId: organizationId,
      fileName: 'preuve_virement_${Ulid.generate()}.jpg',
      mimeType: 'image/jpeg',
      sizeBytes: sizeBytes,
      kind: DocumentKind.transferProof,
    );
    await repository.putFile(
      uploadUrl: upload.uploadUrl,
      file: file,
      mimeType: 'image/jpeg',
    );
    final document = await repository.registerDocument(
      organizationId: organizationId,
      objectKey: upload.objectKey,
      fileName: 'preuve_virement.jpg',
      mimeType: 'image/jpeg',
      sizeBytes: sizeBytes,
      kind: DocumentKind.transferProof,
    );
    return document.id;
  }
}
