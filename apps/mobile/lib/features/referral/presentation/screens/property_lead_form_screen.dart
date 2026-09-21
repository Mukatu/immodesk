import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../controllers/property_lead_controller.dart';

/// Formulaire d'apport d'un bien démarché (`POST
/// /v1/referral-partners/me/properties`) : le partenaire saisit le numéro
/// du bailleur rencontré sur le terrain, un code de confirmation lui est
/// alors envoyé — aucune ligne `referrals` n'existe encore à ce stade.
class PropertyLeadFormScreen extends ConsumerWidget {
  const PropertyLeadFormScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final PropertyLeadFormState state = ref.watch(
      propertyLeadControllerProvider,
    );
    final PropertyLeadController notifier = ref.read(
      propertyLeadControllerProvider.notifier,
    );

    return Scaffold(
      appBar: AppBar(title: const Text('Enregistrer un immeuble')),
      body: SafeArea(
        child: state.result != null
            ? _SuccessView(sentTo: state.result!.confirmationSentTo)
            : Padding(
                padding: const EdgeInsets.all(24),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: [
                    const Text(
                      'Le bailleur recevra un code à usage unique pour '
                      'confirmer votre déclaration.',
                    ),
                    const SizedBox(height: 16),
                    TextField(
                      key: const ValueKey('lead-phone-field'),
                      decoration: const InputDecoration(
                        labelText: 'Numéro du bailleur (+242...)',
                      ),
                      keyboardType: TextInputType.phone,
                      onChanged: notifier.setLandlordPhone,
                    ),
                    const SizedBox(height: 16),
                    TextField(
                      key: const ValueKey('lead-note-field'),
                      decoration: const InputDecoration(
                        labelText: 'Note (facultatif)',
                      ),
                      maxLines: 2,
                      onChanged: notifier.setNote,
                    ),
                    const SizedBox(height: 16),
                    SegmentedButton<String>(
                      segments: const [
                        ButtonSegment(
                          value: 'WHATSAPP',
                          label: Text('WhatsApp'),
                        ),
                        ButtonSegment(value: 'SMS', label: Text('SMS')),
                      ],
                      selected: {state.channel},
                      onSelectionChanged: (values) =>
                          notifier.setChannel(values.first),
                    ),
                    const SizedBox(height: 16),
                    if (state.errorMessage != null) ...[
                      Text(
                        state.errorMessage!,
                        style: TextStyle(
                          color: Theme.of(context).colorScheme.error,
                        ),
                      ),
                      const SizedBox(height: 8),
                    ],
                    FilledButton(
                      key: const ValueKey('lead-submit-button'),
                      onPressed: state.canSubmit ? notifier.submit : null,
                      child: state.isSubmitting
                          ? const SizedBox(
                              height: 20,
                              width: 20,
                              child: CircularProgressIndicator(strokeWidth: 2),
                            )
                          : const Text('Envoyer le code de confirmation'),
                    ),
                  ],
                ),
              ),
      ),
    );
  }
}

class _SuccessView extends StatelessWidget {
  const _SuccessView({required this.sentTo});

  final String sentTo;

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(24),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            const Icon(Icons.check_circle_outline, size: 48),
            const SizedBox(height: 16),
            Text(
              'Code envoyé au $sentTo. Le parrainage sera créé dès que le '
              'bailleur aura confirmé.',
              textAlign: TextAlign.center,
            ),
          ],
        ),
      ),
    );
  }
}
