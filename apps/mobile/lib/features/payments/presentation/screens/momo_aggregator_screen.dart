import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../domain/payments_offline_message.dart';
import '../controllers/momo_aggregator_controller.dart';
import '../controllers/momo_aggregator_state.dart';
import '../widgets/momo_aggregator_input_view.dart';
import '../widgets/momo_aggregator_result_view.dart';
import '../widgets/momo_aggregator_waiting_view.dart';

/// Mobile Money par agrégateur : un seul écran, dont le contenu change
/// selon la phase du contrôleur (saisie/devis, attente, résultat) — voir
/// `docs/04_plan_de_phases.md` §4.6.
class MomoAggregatorScreen extends ConsumerStatefulWidget {
  const MomoAggregatorScreen({super.key, required this.invoiceId});

  final String invoiceId;

  @override
  ConsumerState<MomoAggregatorScreen> createState() =>
      _MomoAggregatorScreenState();
}

class _MomoAggregatorScreenState extends ConsumerState<MomoAggregatorScreen> {
  final TextEditingController _amountController = TextEditingController();
  bool _amountInitialized = false;

  @override
  void dispose() {
    _amountController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final provider = momoAggregatorControllerProvider(widget.invoiceId);
    final stateAsync = ref.watch(provider);

    return Scaffold(
      appBar: AppBar(title: const Text('Mobile Money immédiat')),
      body: stateAsync.when(
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (error, _) => Center(child: Text('Erreur : $error')),
        data: (state) {
          if (state.isOfflineBlocked) {
            return Center(
              child: Padding(
                padding: const EdgeInsets.all(24),
                child: Text(
                  PaymentsOfflineMessage.text,
                  key: const ValueKey('momo-aggregator-offline-message'),
                  textAlign: TextAlign.center,
                ),
              ),
            );
          }
          if (!_amountInitialized) {
            _amountController.text = state.amount.toString();
            _amountInitialized = true;
          }
          final notifier = ref.read(provider.notifier);
          switch (state.phase) {
            case MomoAggregatorPhase.input:
            case MomoAggregatorPhase.quoted:
              return MomoAggregatorInputView(
                state: state,
                notifier: notifier,
                amountController: _amountController,
              );
            case MomoAggregatorPhase.waiting:
              return MomoAggregatorWaitingView(state: state);
            case MomoAggregatorPhase.success:
            case MomoAggregatorPhase.failure:
            case MomoAggregatorPhase.expired:
              return MomoAggregatorResultView(state: state, notifier: notifier);
          }
        },
      ),
    );
  }
}
