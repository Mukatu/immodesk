import 'package:flutter/material.dart';

/// Étape 2/4 : premier bailleur (`landlords`). `countryCode` détermine si
/// le bailleur réside hors du Congo (`docs/api/phase7-contract.md`).
class OnboardingStepLandlord extends StatelessWidget {
  const OnboardingStepLandlord({
    super.key,
    required this.firstName,
    required this.lastName,
    required this.phone,
    required this.city,
    required this.countryCode,
  });

  final TextEditingController firstName;
  final TextEditingController lastName;
  final TextEditingController phone;
  final TextEditingController city;
  final TextEditingController countryCode;

  @override
  Widget build(BuildContext context) {
    return ListView(
      padding: const EdgeInsets.all(24),
      children: [
        Text(
          'Votre premier bailleur',
          style: Theme.of(context).textTheme.headlineSmall,
        ),
        const SizedBox(height: 8),
        const Text('Le propriétaire pour lequel vous gérez ce bien.'),
        const SizedBox(height: 24),
        TextFormField(
          key: const ValueKey('onboarding-landlord-firstname-field'),
          controller: firstName,
          decoration: const InputDecoration(labelText: 'Prénom'),
        ),
        const SizedBox(height: 16),
        TextFormField(
          key: const ValueKey('onboarding-landlord-lastname-field'),
          controller: lastName,
          decoration: const InputDecoration(labelText: 'Nom'),
        ),
        const SizedBox(height: 16),
        TextFormField(
          key: const ValueKey('onboarding-landlord-phone-field'),
          controller: phone,
          keyboardType: TextInputType.phone,
          decoration: const InputDecoration(
            labelText: 'Téléphone',
            hintText: '+242 06 XXX XX XX',
          ),
        ),
        const SizedBox(height: 16),
        TextFormField(
          key: const ValueKey('onboarding-landlord-city-field'),
          controller: city,
          decoration: const InputDecoration(labelText: 'Ville de résidence'),
        ),
        const SizedBox(height: 16),
        TextFormField(
          key: const ValueKey('onboarding-landlord-country-field'),
          controller: countryCode,
          maxLength: 2,
          textCapitalization: TextCapitalization.characters,
          decoration: const InputDecoration(
            labelText: 'Code pays de résidence (CG si Congo)',
            helperText: 'Ex. CG, FR, US… Détermine le mode de reversement.',
          ),
        ),
      ],
    );
  }
}
