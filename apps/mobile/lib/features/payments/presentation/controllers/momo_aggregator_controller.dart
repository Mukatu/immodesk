import 'package:riverpod_annotation/riverpod_annotation.dart';

import '../../../../core/network/api_exception.dart';
import '../../../../core/sync/ulid.dart';
import '../../data/payments_providers.dart';
import '../../domain/momo_operator_detection.dart';
import 'invoice_context.dart';
import 'momo_aggregator_state.dart';
import 'momo_polling_coordinator.dart';

part 'momo_aggregator_controller.g.dart';

/// Mobile Money par agrégateur : numéro payeur avec opérateur détecté,
/// devis avant validation, attente avec interrogation périodique du statut,
/// résultat succès/échec/expiration (nouvelle tentative = nouveau
/// `clientRef`).
@riverpod
class MomoAggregatorController extends _$MomoAggregatorController {
  MomoPollingCoordinator? _coordinator;

  @override
  Future<MomoAggregatorState> build(String invoiceId) async {
    ref.onDispose(() => _coordinator?.dispose());

    final InvoiceContextResult context = await loadInvoiceContext(
      ref,
      invoiceId,
    );
    if (context.isOffline) {
      return const MomoAggregatorState(invoice: null, isOfflineBlocked: true);
    }
    final InvoiceContext ctx = context.context!;
    return MomoAggregatorState(
      invoice: ctx.invoice,
      organizationId: ctx.organizationId,
      amount: ctx.invoice.balanceAmount,
      clientRef: Ulid.generate(),
    );
  }

  void setPayerMsisdn(String value) {
    final current = state.value;
    if (current == null) return;
    final operator = detectMomoOperator(value);
    state = AsyncData(
      current.copyWith(
        payerMsisdn: value,
        detectedOperator: operator,
        clearDetectedOperator: operator == null,
        clearError: true,
      ),
    );
  }

  void setAmount(int amount) {
    final current = state.value;
    if (current == null) return;
    state = AsyncData(
      current.copyWith(
        amount: amount < 0 ? 0 : amount,
        clearQuote: true,
        clearError: true,
      ),
    );
  }

  Future<void> requestQuote() async {
    final current = state.value;
    if (current == null || !current.canRequestQuote) return;
    state = AsyncData(current.copyWith(isBusy: true, clearError: true));
    try {
      final quote = await ref
          .read(paymentsRepositoryProvider)
          .quoteMobileMoney(
            organizationId: current.organizationId!,
            invoiceId: current.invoice?.id,
            amount: current.amount,
          );
      state = AsyncData(
        current.copyWith(
          isBusy: false,
          quote: quote,
          phase: MomoAggregatorPhase.quoted,
        ),
      );
    } on ApiException catch (e) {
      state = AsyncData(
        current.copyWith(isBusy: false, errorMessage: e.message),
      );
    }
  }

  /// Verrouillé dès le premier appui : un double appui n'initie qu'une
  /// seule demande de paiement (même `clientRef`).
  Future<void> confirmAndInitiate() async {
    final current = state.value;
    if (current == null || !current.canConfirm) return;
    state = AsyncData(current.copyWith(isBusy: true, clearError: true));
    try {
      final String organizationId = current.organizationId!;
      final transaction = await ref
          .read(paymentsRepositoryProvider)
          .initiateMobileMoney(
            organizationId: organizationId,
            invoiceId: current.invoice?.id,
            tenantId: current.invoice!.tenant.id,
            amount: current.amount,
            payerMsisdn: current.payerMsisdn,
            clientRef: current.clientRef,
          );
      state = AsyncData(
        current.copyWith(
          isBusy: false,
          transaction: transaction,
          phase: MomoAggregatorPhase.waiting,
        ),
      );
      _startPolling(organizationId, transaction.id);
    } on ApiException catch (e) {
      state = AsyncData(
        current.copyWith(isBusy: false, errorMessage: e.message),
      );
    }
  }

  void _startPolling(String organizationId, String transactionId) {
    _coordinator?.dispose();
    _coordinator = MomoPollingCoordinator(
      pollInterval: ref.read(momoPollIntervalProvider),
      fetchStatus: () => ref
          .read(paymentsRepositoryProvider)
          .fetchMomoTransaction(
            organizationId: organizationId,
            transactionId: transactionId,
          ),
      onUpdate: (transaction, phase) {
        final latest = state.value;
        if (latest == null) return;
        state = AsyncData(
          latest.copyWith(transaction: transaction, phase: phase),
        );
      },
      onTick: (seconds) {
        final latest = state.value;
        if (latest == null || latest.phase != MomoAggregatorPhase.waiting) {
          return;
        }
        state = AsyncData(latest.copyWith(secondsUntilNextCheck: seconds));
      },
    )..start();
  }

  /// Nouvelle tentative après expiration : nouveau `clientRef`.
  void retryWithNewClientRef() {
    final current = state.value;
    if (current == null) return;
    _coordinator?.dispose();
    state = AsyncData(
      current.copyWith(
        phase: MomoAggregatorPhase.input,
        clientRef: Ulid.generate(),
        clearQuote: true,
        clearTransaction: true,
        secondsUntilNextCheck: 0,
        clearError: true,
      ),
    );
  }
}
