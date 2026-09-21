import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../../shared/widgets/empty_state.dart';
import '../../domain/entities/referral.dart';
import '../controllers/referrals_list_controller.dart';

/// Liste des filleuls du partenaire, avec leur statut de qualification
/// (`GET /v1/referral-partners/me/referrals`).
class ReferralsListScreen extends ConsumerWidget {
  const ReferralsListScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final AsyncValue<ReferralsListState> stateAsync = ref.watch(
      referralsListControllerProvider,
    );

    return Scaffold(
      appBar: AppBar(title: const Text('Mes filleuls')),
      body: stateAsync.when(
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (error, _) => EmptyState(
          icon: Icons.wifi_off_outlined,
          title: 'Connexion requise',
          message: 'Impossible de charger les filleuls : $error',
        ),
        data: (state) => state.items.isEmpty
            ? const EmptyState(
                icon: Icons.groups_outlined,
                title: 'Aucun filleul pour le moment',
                message:
                    'Les organisations que vous parrainez apparaîtront ici.',
              )
            : RefreshIndicator(
                onRefresh: () => ref
                    .read(referralsListControllerProvider.notifier)
                    .refresh(),
                child: ListView.separated(
                  key: const ValueKey('referrals-list'),
                  padding: const EdgeInsets.all(16),
                  itemCount: state.items.length + (state.hasMore ? 1 : 0),
                  separatorBuilder: (_, _) => const SizedBox(height: 8),
                  itemBuilder: (context, index) {
                    if (index >= state.items.length) {
                      return Center(
                        child: TextButton(
                          onPressed: state.isLoadingMore
                              ? null
                              : () => ref
                                    .read(
                                      referralsListControllerProvider.notifier,
                                    )
                                    .loadMore(),
                          child: state.isLoadingMore
                              ? const CircularProgressIndicator()
                              : const Text('Charger plus'),
                        ),
                      );
                    }
                    final Referral referral = state.items[index];
                    return Card(
                      child: ListTile(
                        title: Text(
                          'Organisation ${referral.referredOrganizationId}',
                        ),
                        subtitle: Text('Depuis le ${referral.createdAt}'),
                        trailing: Chip(label: Text(referral.status.label)),
                      ),
                    );
                  },
                ),
              ),
      ),
    );
  }
}
