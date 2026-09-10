import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

/// Champ de saisie de numéro de téléphone, tolérant, normalisé en +242
/// (voir `core/format/phone_number.dart`).
class PhoneField extends StatelessWidget {
  const PhoneField({
    super.key,
    required this.controller,
    this.errorText,
    this.enabled = true,
    this.onSubmitted,
    this.autofocus = false,
  });

  final TextEditingController controller;
  final String? errorText;
  final bool enabled;
  final ValueChanged<String>? onSubmitted;
  final bool autofocus;

  @override
  Widget build(BuildContext context) {
    return TextField(
      key: const ValueKey('phone-field'),
      controller: controller,
      enabled: enabled,
      autofocus: autofocus,
      keyboardType: TextInputType.phone,
      textInputAction: TextInputAction.done,
      inputFormatters: <TextInputFormatter>[
        FilteringTextInputFormatter.allow(RegExp(r'[0-9+ ]')),
      ],
      onSubmitted: onSubmitted,
      decoration: InputDecoration(
        labelText: 'Numéro de téléphone',
        hintText: '+242 06 XXX XX XX',
        prefixIcon: const Icon(Icons.phone_outlined),
        errorText: errorText,
      ),
    );
  }
}
