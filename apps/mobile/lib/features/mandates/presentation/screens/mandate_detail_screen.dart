import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../../core/network/api_exception.dart';
import '../../../../shared/widgets/status_badge.dart';
import '../../domain/entities/mandate_detail.dart';
import '../../domain/entities/mandate_status.dart';
import '../controllers/landlord_invitation_controller.dart';
import '../controllers/mandate_detail_controller.dart';

/// Fiche mandat : statut, commission, et invitation du bailleur au portail
/// en lecture seule par WhatsApp (`docs/04_plan_de_phases.md` §7.6, épic
/// « Espace gestionnaire indépendant et portail bailleur »).
class MandateDetailScreen extends ConsumerWidget {
  const MandateDetailScreen({super.key, required this.mandateId});

  final String mandateId;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final AsyncValue<MandateDetail> mandateAsync = ref.watch(
      mandateDetailControllerProvider(mandateId),
    );

    return Scaffold(
      appBar: AppBar(title: const Text('Mandat de gestion')),
      body: mandateAsync.when(
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (error, _) => Center(
          child: Text(
            error is ApiException ? error.message : 'Une erreur est survenue.',
          ),
        ),
        data: (mandate) => _MandateBody(mandate: mandate, mandateId: mandateId),
      ),
    );
  }
}

class _MandateBody extends ConsumerWidget {
  const _MandateBody({required this.mandate, required this.mandateId});

  final MandateDetail mandate;
  final String mandateId;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final AsyncValue<void> invitationState = ref.watch(
      landlordInvitationControllerProvider(mandateId),
    );

    ref.listen<AsyncValue<void>>(
      landlordInvitationControllerProvider(mandateId),
      (previous, next) {
        next.whenOrNull(
          error: (error, _) {
            final String message = error is ApiException
                ? error.message
                : 'Une erreur est survenue.';
            ScaffoldMessenger.of(
              context,
            ).showSnackBar(SnackBar(content: Text(message)));
          },
        );
      },
    );

    final bool activated = mandate.landlordPortal.activated;
    final bool invited = mandate.landlordPortal.invited;
    final String invitationLabel = activated
        ? 'Activée'
        : (invited ? 'Envoyée' : 'Non invité');

    return ListView(
      padding: const EdgeInsets.all(16),
      children: [
        Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            Expanded(
              child: Text(
                mandate.reference,
                style: Theme.of(context).textTheme.titleLarge,
              ),
            ),
            StatusBadge(label: mandate.status.label, tone: mandate.status.tone),
          ],
        ),
        const SizedBox(height: 8),
        Text('Bailleur : ${mandate.landlord.displayName}'),
        Text('Commission : ${mandate.commissionLabel}'),
        const SizedBox(height: 24),
        Card(
          child: Padding(
            padding: const EdgeInsets.all(16),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  'Accès portail bailleur',
                  style: Theme.of(context).textTheme.titleMedium,
                ),
                const SizedBox(height: 8),
                StatusBadge(
                  key: const ValueKey('landlord-invitation-status'),
                  label: invitationLabel,
                  tone: activated
                      ? StatusBadgeTone.success
                      : (invited
                            ? StatusBadgeTone.info
                            : StatusBadgeTone.neutral),
                ),
                const SizedBox(height: 12),
                FilledButton.icon(
                  key: const ValueKey('invite-landlord-button'),
                  onPressed: activated || invitationState.isLoading
                      ? null
                      : () => ref
                            .read(
                              landlordInvitationControllerProvider(
                                mandateId,
                              ).notifier,
                            )
                            .send(),
                  icon: const Icon(Icons.chat_outlined),
                  label: Text(
                    invitationState.isLoading
                        ? 'Envoi en cours…'
                        : (invited
                              ? 'Renvoyer l\'invitation par WhatsApp'
                              : 'Inviter le bailleur par WhatsApp'),
                  ),
                ),
              ],
            ),
          ),
        ),
      ],
    );
  }
}
