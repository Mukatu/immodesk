import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../../core/router/route_paths.dart';
import '../../../../shared/widgets/empty_state.dart';
import '../../../../shared/widgets/money_xaf_text.dart';
import '../../../../shared/widgets/offline_data_banner.dart';
import '../../../../shared/widgets/status_badge.dart';
import '../../domain/collection_round.dart';
import '../../domain/entities/invoice_status.dart';
import '../../domain/entities/invoice_summary.dart';
import '../controllers/collection_round_controller.dart';

/// « Ma tournée » : factures dues des lots affectés au démarcheur,
/// regroupées par immeuble, triées par montant dû décroissant.
class CollectionRoundScreen extends ConsumerWidget {
  const CollectionRoundScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final AsyncValue<CollectionRoundState> stateAsync = ref.watch(
      collectionRoundControllerProvider,
    );

    return Scaffold(
      appBar: AppBar(title: const Text('Ma tournée')),
      body: stateAsync.when(
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (error, _) => Center(child: Text('Erreur : $error')),
        data: (state) {
          return RefreshIndicator(
            onRefresh: () =>
                ref.read(collectionRoundControllerProvider.notifier).refresh(),
            child: Column(
              children: [
                if (state.isFromCache)
                  OfflineDataBanner(cachedAt: state.cachedAt),
                _RoundSummaryBar(state: state),
                Expanded(
                  child: state.groups.isEmpty
                      ? ListView(
                          children: const [
                            EmptyState(
                              title: 'Aucune facture due',
                              message:
                                  "Toutes les factures de vos lots sont à jour.",
                            ),
                          ],
                        )
                      : ListView.builder(
                          key: const ValueKey('collection-round-list'),
                          padding: const EdgeInsets.all(16),
                          itemCount: state.groups.length,
                          itemBuilder: (context, index) =>
                              _PropertyGroupCard(group: state.groups[index]),
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

class _RoundSummaryBar extends StatelessWidget {
  const _RoundSummaryBar({required this.state});

  final CollectionRoundState state;

  @override
  Widget build(BuildContext context) {
    return Container(
      key: const ValueKey('collection-round-summary'),
      width: double.infinity,
      padding: const EdgeInsets.all(16),
      color: Theme.of(context).colorScheme.surfaceContainerHighest,
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text('Total dû', style: Theme.of(context).textTheme.bodySmall),
              MoneyXafText(
                state.totalDueAmount,
                style: Theme.of(context).textTheme.titleLarge,
              ),
            ],
          ),
          if (state.lateCount > 0)
            StatusBadge(
              label: '${state.lateCount} en retard',
              tone: StatusBadgeTone.danger,
            ),
        ],
      ),
    );
  }
}

class _PropertyGroupCard extends StatelessWidget {
  const _PropertyGroupCard({required this.group});

  final CollectionRoundGroup group;

  @override
  Widget build(BuildContext context) {
    return Card(
      key: ValueKey('collection-group-${group.property.id}'),
      margin: const EdgeInsets.only(bottom: 8),
      child: ExpansionTile(
        title: Text(group.property.name),
        subtitle: Text('${group.invoices.length} facture(s) due(s)'),
        trailing: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.end,
          children: [
            MoneyXafText(
              group.totalDueAmount,
              style: Theme.of(context).textTheme.bodyMedium,
            ),
            if (group.lateCount > 0)
              Text(
                '${group.lateCount} en retard',
                style: TextStyle(
                  color: Theme.of(context).colorScheme.error,
                  fontSize: 12,
                ),
              ),
          ],
        ),
        children: [
          for (final InvoiceSummary invoice in group.invoices)
            _InvoiceTile(invoice: invoice),
        ],
      ),
    );
  }
}

class _InvoiceTile extends StatelessWidget {
  const _InvoiceTile({required this.invoice});

  final InvoiceSummary invoice;

  @override
  Widget build(BuildContext context) {
    return ListTile(
      key: ValueKey('collection-invoice-${invoice.id}'),
      title: Text('${invoice.tenant.displayName} · Lot ${invoice.unit.code}'),
      subtitle: Text('Échéance le ${invoice.dueDate}'),
      trailing: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        crossAxisAlignment: CrossAxisAlignment.end,
        children: [
          MoneyXafText(
            invoice.balanceAmount,
            style: Theme.of(context).textTheme.bodyMedium,
          ),
          StatusBadge(label: invoice.status.label, tone: invoice.status.tone),
        ],
      ),
      isThreeLine: false,
      onTap: () => context.push(RoutePaths.collectionEncaissement(invoice.id)),
    );
  }
}
