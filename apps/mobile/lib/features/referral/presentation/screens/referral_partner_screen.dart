import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../../core/router/route_paths.dart';
import '../../../../shared/widgets/empty_state.dart';
import '../../domain/entities/referral_partner.dart';
import '../controllers/referral_partner_controller.dart';

/// Écran « Devenir partenaire » (`docs/api/phase10-contract.md`, § Apport
/// d'affaires), accessible à tout utilisateur authentifié depuis l'onglet
/// « Plus ». Affiche le formulaire d'inscription tant qu'aucun compte
/// partenaire n'existe, puis le code de parrainage et les raccourcis vers
/// les filleuls et les commissions une fois inscrit.
class ReferralPartnerScreen extends ConsumerStatefulWidget {
  const ReferralPartnerScreen({super.key});

  @override
  ConsumerState<ReferralPartnerScreen> createState() =>
      _ReferralPartnerScreenState();
}

class _ReferralPartnerScreenState extends ConsumerState<ReferralPartnerScreen> {
  final TextEditingController _nameController = TextEditingController();

  @override
  void dispose() {
    _nameController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final AsyncValue<ReferralPartnerState> stateAsync = ref.watch(
      referralPartnerControllerProvider,
    );

    return Scaffold(
      appBar: AppBar(title: const Text('Apport d\'affaires')),
      body: stateAsync.when(
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (error, _) => EmptyState(
          icon: Icons.wifi_off_outlined,
          title: 'Connexion requise',
          message: 'Impossible de charger le profil partenaire : $error',
        ),
        data: (state) => state.partner == null
            ? _RegistrationForm(nameController: _nameController, state: state)
            : _PartnerProfile(partner: state.partner!),
      ),
    );
  }
}

class _RegistrationForm extends ConsumerWidget {
  const _RegistrationForm({required this.nameController, required this.state});

  final TextEditingController nameController;
  final ReferralPartnerState state;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    return SafeArea(
      child: Padding(
        padding: const EdgeInsets.all(24),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            const Text(
              'Devenez apporteur d\'affaires Immodesk et percevez une '
              'commission sur les agences que vous orientez.',
            ),
            const SizedBox(height: 16),
            TextField(
              key: const ValueKey('referral-display-name-field'),
              controller: nameController,
              decoration: const InputDecoration(
                labelText: 'Nom à afficher (facultatif)',
              ),
            ),
            const SizedBox(height: 16),
            if (state.errorMessage != null) ...[
              Text(
                state.errorMessage!,
                style: TextStyle(color: Theme.of(context).colorScheme.error),
              ),
              const SizedBox(height: 8),
            ],
            FilledButton(
              key: const ValueKey('referral-register-button'),
              onPressed: state.isRegistering
                  ? null
                  : () => ref
                        .read(referralPartnerControllerProvider.notifier)
                        .register(
                          displayName: nameController.text.trim().isEmpty
                              ? null
                              : nameController.text.trim(),
                        ),
              child: state.isRegistering
                  ? const SizedBox(
                      height: 20,
                      width: 20,
                      child: CircularProgressIndicator(strokeWidth: 2),
                    )
                  : const Text('Devenir partenaire'),
            ),
          ],
        ),
      ),
    );
  }
}

class _PartnerProfile extends StatelessWidget {
  const _PartnerProfile({required this.partner});

  final ReferralPartner partner;

  @override
  Widget build(BuildContext context) {
    return ListView(
      padding: const EdgeInsets.all(16),
      children: [
        Card(
          child: Padding(
            padding: const EdgeInsets.all(16),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  'Mon code de parrainage',
                  style: Theme.of(context).textTheme.titleMedium,
                ),
                const SizedBox(height: 8),
                SelectableText(
                  partner.partnerCode,
                  key: const ValueKey('referral-partner-code'),
                  style: Theme.of(context).textTheme.headlineSmall,
                ),
                const SizedBox(height: 4),
                Text('Statut : ${partner.status.label}'),
              ],
            ),
          ),
        ),
        const SizedBox(height: 16),
        ListTile(
          key: const ValueKey('referral-lead-tile'),
          leading: const Icon(Icons.apartment_outlined),
          title: const Text('Enregistrer un immeuble démarché'),
          onTap: () => context.push(RoutePaths.referralPropertyLead),
        ),
        const Divider(height: 1),
        ListTile(
          key: const ValueKey('referral-referrals-tile'),
          leading: const Icon(Icons.groups_outlined),
          title: const Text('Mes filleuls'),
          onTap: () => context.push(RoutePaths.referralReferrals),
        ),
        const Divider(height: 1),
        ListTile(
          key: const ValueKey('referral-commissions-tile'),
          leading: const Icon(Icons.payments_outlined),
          title: const Text('Mes commissions'),
          onTap: () => context.push(RoutePaths.referralCommissions),
        ),
      ],
    );
  }
}
