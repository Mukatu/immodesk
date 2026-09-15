import 'package:flutter/material.dart';

/// Étape 4/4 : premier mandat de gestion, commission de 10 % pré-remplie
/// (`RATE_BPS_ON_RENT_COLLECTED`, 1000 bps — référentiel commun, section
/// « Démarcheurs et gestionnaires informels »), modifiable par le
/// gestionnaire avant validation.
class OnboardingStepMandate extends StatelessWidget {
  const OnboardingStepMandate({super.key, required this.commissionPercent});

  final TextEditingController commissionPercent;

  @override
  Widget build(BuildContext context) {
    return ListView(
      padding: const EdgeInsets.all(24),
      children: [
        Text(
          'Le mandat de gestion',
          style: Theme.of(context).textTheme.headlineSmall,
        ),
        const SizedBox(height: 8),
        const Text(
          'La commission par défaut d\'un gestionnaire indépendant est de '
          '10 % du loyer encaissé. Vous pouvez la modifier.',
        ),
        const SizedBox(height: 24),
        TextFormField(
          key: const ValueKey('onboarding-mandate-commission-field'),
          controller: commissionPercent,
          keyboardType: const TextInputType.numberWithOptions(decimal: true),
          decoration: const InputDecoration(
            labelText: 'Commission (%)',
            suffixText: '%',
          ),
        ),
        const SizedBox(height: 16),
        const Text(
          'Le mandat démarre aujourd\'hui, statut brouillon puis activation '
          'immédiate. Vous pourrez inviter le bailleur juste après.',
          style: TextStyle(fontStyle: FontStyle.italic),
        ),
      ],
    );
  }
}
