import 'package:flutter/material.dart';

import '../controllers/momo_aggregator_state.dart';

/// Écran d'attente pendant l'initiation agrégateur : compte à rebours
/// avant la prochaine interrogation du statut (toutes les 3 secondes,
/// `docs/api/phase4-contract.md`). Le montant n'est jamais confirmé sur la
/// seule foi d'un webhook : cette interrogation active est la seule source
/// de vérité affichée à l'écran.
class MomoAggregatorWaitingView extends StatelessWidget {
  const MomoAggregatorWaitingView({super.key, required this.state});

  final MomoAggregatorState state;

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(24),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            const CircularProgressIndicator(),
            const SizedBox(height: 24),
            const Text(
              'En attente de confirmation du paiement…',
              key: ValueKey('momo-aggregator-waiting-message'),
              textAlign: TextAlign.center,
            ),
            const SizedBox(height: 8),
            Text(
              'Nouvelle vérification dans ${state.secondsUntilNextCheck} s',
              key: const ValueKey('momo-aggregator-countdown'),
              style: Theme.of(context).textTheme.bodySmall,
            ),
          ],
        ),
      ),
    );
  }
}
