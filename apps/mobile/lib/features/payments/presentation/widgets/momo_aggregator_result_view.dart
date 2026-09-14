import 'package:flutter/material.dart';

import '../../../../shared/widgets/money_xaf_text.dart';
import '../controllers/momo_aggregator_controller.dart';
import '../controllers/momo_aggregator_state.dart';

/// Résultat de l'initiation agrégateur : succès avec quittance (envoyée par
/// WhatsApp côté serveur), échec avec motif lisible, ou expiration avec
/// proposition de nouvelle tentative (`docs/04_plan_de_phases.md` §4.6).
class MomoAggregatorResultView extends StatelessWidget {
  const MomoAggregatorResultView({
    super.key,
    required this.state,
    required this.notifier,
  });

  final MomoAggregatorState state;
  final MomoAggregatorController notifier;

  @override
  Widget build(BuildContext context) {
    return switch (state.phase) {
      MomoAggregatorPhase.success => _buildSuccess(context),
      MomoAggregatorPhase.expired => _buildExpired(context),
      _ => _buildFailure(context),
    };
  }

  Widget _buildSuccess(BuildContext context) {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(24),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            const Icon(Icons.check_circle, color: Colors.green, size: 56),
            const SizedBox(height: 16),
            const Text(
              'Paiement confirmé',
              key: ValueKey('momo-aggregator-success-title'),
              style: TextStyle(fontWeight: FontWeight.bold),
            ),
            const SizedBox(height: 8),
            MoneyXafText(state.transaction?.amount ?? state.amount),
            const SizedBox(height: 8),
            const Text(
              "La quittance a été envoyée au locataire.",
              textAlign: TextAlign.center,
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildFailure(BuildContext context) {
    final String reason =
        state.transaction?.failureMessage ??
        state.transaction?.rejectionReason ??
        'Le paiement a échoué.';
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(24),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(
              Icons.error_outline,
              color: Theme.of(context).colorScheme.error,
              size: 56,
            ),
            const SizedBox(height: 16),
            const Text(
              'Paiement refusé',
              key: ValueKey('momo-aggregator-failure-title'),
              style: TextStyle(fontWeight: FontWeight.bold),
            ),
            const SizedBox(height: 8),
            Text(
              reason,
              key: const ValueKey('momo-aggregator-failure-reason'),
              textAlign: TextAlign.center,
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildExpired(BuildContext context) {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(24),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(
              Icons.timer_off_outlined,
              color: Theme.of(context).colorScheme.outline,
              size: 56,
            ),
            const SizedBox(height: 16),
            const Text(
              'Le paiement a expiré sans réponse.',
              key: ValueKey('momo-aggregator-expired-title'),
              textAlign: TextAlign.center,
            ),
            const SizedBox(height: 16),
            FilledButton(
              key: const ValueKey('momo-aggregator-retry-button'),
              onPressed: notifier.retryWithNewClientRef,
              child: const Text('Réessayer'),
            ),
          ],
        ),
      ),
    );
  }
}
