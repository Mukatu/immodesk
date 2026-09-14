import 'package:riverpod_annotation/riverpod_annotation.dart';

import '../../../collection/domain/entities/invoice_summary.dart';
import '../../data/payments_providers.dart';
import '../../domain/entities/payment_instructions.dart';
import '../../domain/payments_offline_message.dart';
import 'invoice_context.dart';

part 'payment_method_choice_controller.g.dart';

/// État de l'écran de choix du mode de paiement, ouvert depuis une facture
/// de la tournée (`docs/04_plan_de_phases.md` §4.6).
class PaymentMethodChoiceState {
  const PaymentMethodChoiceState({
    required this.invoice,
    required this.instructions,
    this.isOfflineBlocked = false,
  });

  final InvoiceSummary? invoice;
  final PaymentInstructions? instructions;
  final bool isOfflineBlocked;

  bool get canDeclareMobileMoney =>
      instructions?.mobileMoneyNumbers.isNotEmpty ?? false;
  bool get canDeclareBankTransfer =>
      instructions?.bankAccounts.isNotEmpty ?? false;
  bool get canUseAggregator => instructions?.aggregatorAvailable ?? false;
}

/// Un contrôleur par facture (`invoiceId`), comme `EncaissementController`.
@riverpod
class PaymentMethodChoiceController extends _$PaymentMethodChoiceController {
  @override
  Future<PaymentMethodChoiceState> build(String invoiceId) async {
    final InvoiceContextResult context = await loadInvoiceContext(
      ref,
      invoiceId,
    );
    if (context.isOffline) {
      return const PaymentMethodChoiceState(
        invoice: null,
        instructions: null,
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
    return PaymentMethodChoiceState(
      invoice: ctx.invoice,
      instructions: instructions,
    );
  }
}

/// Message hors ligne partagé par tous les écrans de paiement de la phase 4.
const String paymentMethodChoiceOfflineMessage = PaymentsOfflineMessage.text;
