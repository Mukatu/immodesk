import 'package:flutter/material.dart';

/// Étape 1/4 : organisation `INDEPENDENT_MANAGER` (raison sociale, ville,
/// téléphone de contact).
class OnboardingStepOrganization extends StatelessWidget {
  const OnboardingStepOrganization({
    super.key,
    required this.legalName,
    required this.city,
    required this.phone,
  });

  final TextEditingController legalName;
  final TextEditingController city;
  final TextEditingController phone;

  @override
  Widget build(BuildContext context) {
    return ListView(
      padding: const EdgeInsets.all(24),
      children: [
        Text(
          'Votre activité',
          style: Theme.of(context).textTheme.headlineSmall,
        ),
        const SizedBox(height: 8),
        const Text(
          'Créons votre organisation de gestionnaire indépendant. '
          'Cette étape prend moins d\'une minute.',
        ),
        const SizedBox(height: 24),
        TextFormField(
          key: const ValueKey('onboarding-org-name-field'),
          controller: legalName,
          decoration: const InputDecoration(labelText: 'Nom de votre activité'),
        ),
        const SizedBox(height: 16),
        TextFormField(
          key: const ValueKey('onboarding-org-city-field'),
          controller: city,
          decoration: const InputDecoration(labelText: 'Ville'),
        ),
        const SizedBox(height: 16),
        TextFormField(
          key: const ValueKey('onboarding-org-phone-field'),
          controller: phone,
          keyboardType: TextInputType.phone,
          decoration: const InputDecoration(
            labelText: 'Téléphone de contact',
            hintText: '+242 06 XXX XX XX',
          ),
        ),
      ],
    );
  }
}
