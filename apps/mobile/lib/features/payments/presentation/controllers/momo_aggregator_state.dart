import '../../../collection/domain/entities/invoice_summary.dart';
import '../../domain/entities/momo_provider.dart';
import '../../domain/entities/momo_quote.dart';
import '../../domain/entities/momo_transaction.dart';

/// Étapes de l'écran de paiement Mobile Money par agrégateur
/// (`docs/04_plan_de_phases.md` §4.6) : saisie du numéro payeur, devis
/// affiché avant validation, attente avec interrogation périodique, puis
/// résultat (succès, échec ou expiration).
enum MomoAggregatorPhase { input, quoted, waiting, success, failure, expired }

/// État partagé par les trois écrans de l'agrégateur (numéro/devis,
/// attente, résultat) via un seul contrôleur par facture.
class MomoAggregatorState {
  const MomoAggregatorState({
    required this.invoice,
    this.organizationId,
    this.payerMsisdn = '',
    this.detectedOperator,
    this.amount = 0,
    this.quote,
    this.transaction,
    this.phase = MomoAggregatorPhase.input,
    this.secondsUntilNextCheck = 0,
    this.clientRef = '',
    this.isBusy = false,
    this.errorMessage,
    this.isOfflineBlocked = false,
  });

  final InvoiceSummary? invoice;
  final String? organizationId;
  final String payerMsisdn;
  final MomoProvider? detectedOperator;
  final int amount;
  final MomoQuote? quote;
  final MomoTransaction? transaction;
  final MomoAggregatorPhase phase;
  final int secondsUntilNextCheck;
  final String clientRef;
  final bool isBusy;
  final String? errorMessage;
  final bool isOfflineBlocked;

  bool get canRequestQuote => !isBusy && !isOfflineBlocked && amount > 0;
  bool get canConfirm =>
      !isBusy &&
      !isOfflineBlocked &&
      quote != null &&
      detectedOperator != null &&
      payerMsisdn.isNotEmpty;

  MomoAggregatorState copyWith({
    String? payerMsisdn,
    MomoProvider? detectedOperator,
    bool clearDetectedOperator = false,
    int? amount,
    MomoQuote? quote,
    bool clearQuote = false,
    MomoTransaction? transaction,
    bool clearTransaction = false,
    MomoAggregatorPhase? phase,
    int? secondsUntilNextCheck,
    String? clientRef,
    bool? isBusy,
    String? errorMessage,
    bool clearError = false,
  }) {
    return MomoAggregatorState(
      invoice: invoice,
      organizationId: organizationId,
      payerMsisdn: payerMsisdn ?? this.payerMsisdn,
      detectedOperator: clearDetectedOperator
          ? null
          : (detectedOperator ?? this.detectedOperator),
      amount: amount ?? this.amount,
      quote: clearQuote ? null : (quote ?? this.quote),
      transaction: clearTransaction ? null : (transaction ?? this.transaction),
      phase: phase ?? this.phase,
      secondsUntilNextCheck:
          secondsUntilNextCheck ?? this.secondsUntilNextCheck,
      clientRef: clientRef ?? this.clientRef,
      isBusy: isBusy ?? this.isBusy,
      errorMessage: clearError ? null : (errorMessage ?? this.errorMessage),
      isOfflineBlocked: isOfflineBlocked,
    );
  }
}

/// Association `MomoStatus` (serveur) → [MomoAggregatorPhase] (écran).
MomoAggregatorPhase phaseForTransaction(MomoTransaction transaction) {
  switch (transaction.status.name) {
    case 'succeeded':
      return MomoAggregatorPhase.success;
    case 'failed':
    case 'rejected':
    case 'cancelled':
    case 'refunded':
      return MomoAggregatorPhase.failure;
    case 'expired':
      return MomoAggregatorPhase.expired;
    default:
      return MomoAggregatorPhase.waiting;
  }
}
