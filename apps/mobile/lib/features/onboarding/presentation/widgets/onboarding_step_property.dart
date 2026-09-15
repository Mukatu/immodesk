import 'package:flutter/material.dart';

/// Étape 3/4 : premier immeuble (`properties`).
class OnboardingStepProperty extends StatelessWidget {
  const OnboardingStepProperty({
    super.key,
    required this.name,
    required this.addressLine,
    required this.district,
    required this.city,
  });

  final TextEditingController name;
  final TextEditingController addressLine;
  final TextEditingController district;
  final TextEditingController city;

  @override
  Widget build(BuildContext context) {
    return ListView(
      padding: const EdgeInsets.all(24),
      children: [
        Text(
          'Son premier bien',
          style: Theme.of(context).textTheme.headlineSmall,
        ),
        const SizedBox(height: 8),
        const Text('L\'immeuble ou la maison que vous allez gérer.'),
        const SizedBox(height: 24),
        TextFormField(
          key: const ValueKey('onboarding-property-name-field'),
          controller: name,
          decoration: const InputDecoration(labelText: 'Nom du bien'),
        ),
        const SizedBox(height: 16),
        TextFormField(
          key: const ValueKey('onboarding-property-address-field'),
          controller: addressLine,
          decoration: const InputDecoration(labelText: 'Adresse'),
        ),
        const SizedBox(height: 16),
        TextFormField(
          key: const ValueKey('onboarding-property-district-field'),
          controller: district,
          decoration: const InputDecoration(labelText: 'Quartier'),
        ),
        const SizedBox(height: 16),
        TextFormField(
          key: const ValueKey('onboarding-property-city-field'),
          controller: city,
          decoration: const InputDecoration(labelText: 'Ville'),
        ),
      ],
    );
  }
}
