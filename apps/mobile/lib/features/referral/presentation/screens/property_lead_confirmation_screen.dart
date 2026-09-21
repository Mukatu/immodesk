import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../../shared/widgets/otp_field.dart';
import '../../../auth/domain/otp_state_machine.dart';
import '../controllers/property_lead_confirmation_controller.dart';

/// Écran PUBLIC atteint par lien (SMS/WhatsApp) envoyé au bailleur pour
/// confirmer l'apport d'affaires déclaré par un partenaire. Aucune
/// connexion requise : ni compte, ni organisation (`docs/api/phase10-
/// contract.md`, § Apport d'affaires).
class PropertyLeadConfirmationScreen extends ConsumerWidget {
  const PropertyLeadConfirmationScreen({
    super.key,
    required this.propertyLeadId,
  });

  final String propertyLeadId;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final PropertyLeadConfirmationState state = ref.watch(
      propertyLeadConfirmationControllerProvider(propertyLeadId),
    );
    final PropertyLeadConfirmationController notifier = ref.read(
      propertyLeadConfirmationControllerProvider(propertyLeadId).notifier,
    );
    final bool isVerifying = state.phase == OtpPhase.verifyingCode;
    final bool isVerified = state.phase == OtpPhase.verified;

    return Scaffold(
      appBar: AppBar(title: const Text('Confirmation Immodesk')),
      body: SafeArea(
        child: Padding(
          padding: const EdgeInsets.all(24),
          child: isVerified
              ? const _ConfirmedView()
              : Column(
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: [
                    const Text(
                      'Un partenaire Immodesk vous a déclaré comme bailleur '
                      'auprès de notre plateforme. Saisissez le code reçu '
                      'par SMS ou WhatsApp pour confirmer.',
                    ),
                    const SizedBox(height: 24),
                    OtpField(
                      enabled: !isVerifying,
                      onChanged: notifier.setCode,
                      onCompleted: (_) => notifier.submit(),
                      errorText: state.errorMessage,
                    ),
                    const SizedBox(height: 24),
                    FilledButton(
                      key: const ValueKey('lead-confirm-button'),
                      onPressed: state.canSubmit ? notifier.submit : null,
                      child: isVerifying
                          ? const SizedBox(
                              height: 20,
                              width: 20,
                              child: CircularProgressIndicator(strokeWidth: 2),
                            )
                          : const Text('Confirmer'),
                    ),
                  ],
                ),
        ),
      ),
    );
  }
}

class _ConfirmedView extends StatelessWidget {
  const _ConfirmedView();

  @override
  Widget build(BuildContext context) {
    return const Center(
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(Icons.check_circle_outline, size: 48),
          SizedBox(height: 16),
          Text('Merci, votre confirmation a bien été prise en compte.'),
        ],
      ),
    );
  }
}
