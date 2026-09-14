import 'dart:io';

import 'package:riverpod_annotation/riverpod_annotation.dart';

import '../../../../core/network/api_exception.dart';
import '../../../../core/sync/ulid.dart';
import '../../../documents/data/documents_providers.dart';
import '../../../documents/domain/entities/document_kind.dart';
import '../../data/payments_providers.dart';
import '../../domain/entities/momo_provider.dart';
import '../../domain/entities/momo_transaction.dart';
import '../../domain/entities/payment_instructions.dart';
import 'invoice_context.dart';
import 'momo_declaration_state.dart';

part 'momo_declaration_controller.g.dart';

@riverpod
class MomoDeclarationController extends _$MomoDeclarationController {
  @override
  Future<MomoDeclarationState> build(String invoiceId) async {
    final InvoiceContextResult context = await loadInvoiceContext(
      ref,
      invoiceId,
    );
    if (context.isOffline) {
      return MomoDeclarationState(
        invoice: null,
        receptionNumbers: const [],
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
    return MomoDeclarationState(
      invoice: ctx.invoice,
      organizationId: ctx.organizationId,
      receptionNumbers: instructions.mobileMoneyNumbers,
      clientRef: Ulid.generate(),
      selectedNumber: instructions.mobileMoneyNumbers.isEmpty
          ? null
          : instructions.mobileMoneyNumbers.first,
      amount: ctx.invoice.balanceAmount,
    );
  }

  void selectNumber(MobileMoneyNumber number) {
    final current = state.value;
    if (current == null) return;
    state = AsyncData(current.copyWith(selectedNumber: number));
  }

  void setPayerMsisdn(String value) {
    final current = state.value;
    if (current == null) return;
    state = AsyncData(current.copyWith(payerMsisdn: value, clearError: true));
  }

  void setOperatorReference(String value) {
    final current = state.value;
    if (current == null) return;
    state = AsyncData(
      current.copyWith(
        operatorReference: value.toUpperCase().replaceAll(' ', ''),
        clearError: true,
      ),
    );
  }

  void setAmount(int amount) {
    final current = state.value;
    if (current == null) return;
    state = AsyncData(
      current.copyWith(amount: amount < 0 ? 0 : amount, clearError: true),
    );
  }

  void setProofFilePath(String? path) {
    final current = state.value;
    if (current == null) return;
    state = AsyncData(
      current.copyWith(proofFilePath: path, clearProof: path == null),
    );
  }

  /// Verrouillé dès le premier appui : un double appui pendant l'envoi n'a
  /// aucun effet (un seul appel réseau, même pattern que l'encaissement).
  Future<void> submit() async {
    final current = state.value;
    if (current == null || !current.canSubmit) return;
    state = AsyncData(current.copyWith(isSubmitting: true, clearError: true));

    try {
      final String organizationId = current.organizationId!;
      String? proofDocumentId;
      if (current.proofFilePath != null) {
        proofDocumentId = await _uploadProof(
          organizationId,
          current.proofFilePath!,
        );
      }
      final MobileMoneyNumber number = current.selectedNumber!;
      final MomoTransaction result = await ref
          .read(paymentsRepositoryProvider)
          .declareMobileMoney(
            organizationId: organizationId,
            tenantId: current.invoice!.tenant.id,
            leaseId: current.invoice!.lease.id,
            invoiceId: current.invoice!.id,
            provider: momoProviderToApiValue(number.provider),
            operatorReference: current.operatorReference,
            payerMsisdn: current.payerMsisdn,
            payeeMsisdn: number.msisdn,
            amount: current.amount,
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
      fileName: 'preuve_momo_${Ulid.generate()}.jpg',
      mimeType: 'image/jpeg',
      sizeBytes: sizeBytes,
      kind: DocumentKind.other,
    );
    await repository.putFile(
      uploadUrl: upload.uploadUrl,
      file: file,
      mimeType: 'image/jpeg',
    );
    final document = await repository.registerDocument(
      organizationId: organizationId,
      objectKey: upload.objectKey,
      fileName: 'preuve_momo.jpg',
      mimeType: 'image/jpeg',
      sizeBytes: sizeBytes,
      kind: DocumentKind.other,
    );
    return document.id;
  }
}
