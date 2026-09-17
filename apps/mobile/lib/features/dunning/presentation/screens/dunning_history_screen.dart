import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../../shared/widgets/empty_state.dart';
import '../../../../shared/widgets/offline_data_banner.dart';
import '../controllers/dunning_history_controller.dart';
import 'dunning_run_card.dart';

/// Historique en lecture seule des relances déjà envoyées à un locataire
/// (`docs/api/phase9-contract.md`), utile au démarcheur en visite terrain.
/// Aucune configuration de règle : cet écran ne fait que consulter.
class DunningHistoryScreen extends ConsumerWidget {
  const DunningHistoryScreen({
    super.key,
    required this.tenantId,
    this.invoiceId,
  });

  final String tenantId;
  final String? invoiceId;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final AsyncValue<DunningHistoryState> stateAsync = ref.watch(
      dunningHistoryControllerProvider(tenantId, invoiceId),
    );

    return Scaffold(
      appBar: AppBar(title: const Text('Relances envoyées')),
      body: stateAsync.when(
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (error, _) => EmptyState(
          icon: Icons.wifi_off_outlined,
          title: 'Connexion requise',
          message: 'Impossible de charger les relances : $error',
        ),
        data: (state) {
          return RefreshIndicator(
            onRefresh: () => ref
                .read(
                  dunningHistoryControllerProvider(
                    tenantId,
                    invoiceId,
                  ).notifier,
                )
                .refresh(),
            child: Column(
              children: [
                if (state.isFromCache)
                  OfflineDataBanner(cachedAt: state.cachedAt),
                Expanded(
                  child: state.runs.isEmpty
                      ? ListView(
                          children: const [
                            EmptyState(
                              icon: Icons.notifications_none_outlined,
                              title: 'Aucune relance envoyée',
                              message:
                                  "Ce locataire n'a reçu aucune relance pour "
                                  "l'instant.",
                            ),
                          ],
                        )
                      : ListView.separated(
                          key: const ValueKey('dunning-history-list'),
                          padding: const EdgeInsets.all(16),
                          itemCount: state.runs.length,
                          separatorBuilder: (_, _) => const SizedBox(height: 8),
                          itemBuilder: (context, index) =>
                              DunningRunCard(run: state.runs[index]),
                        ),
                ),
              ],
            ),
          );
        },
      ),
    );
  }
}
