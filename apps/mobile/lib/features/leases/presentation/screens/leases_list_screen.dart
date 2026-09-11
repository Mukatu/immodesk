import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../../core/router/route_paths.dart';
import '../../../../shared/widgets/empty_state.dart';
import '../../../../shared/widgets/money_xaf_text.dart';
import '../../../../shared/widgets/offline_data_banner.dart';
import '../../../../shared/widgets/status_badge.dart';
import '../../domain/entities/lease_status.dart';
import '../../domain/entities/lease_summary.dart';
import '../controllers/leases_list_controller.dart';

/// Liste des baux de l'organisation, avec filtre local par statut
/// (lecture seule).
class LeasesListScreen extends ConsumerWidget {
  const LeasesListScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final AsyncValue<LeasesListState> stateAsync = ref.watch(
      leasesListControllerProvider,
    );

    return Scaffold(
      appBar: AppBar(title: const Text('Baux')),
      body: stateAsync.when(
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (error, _) => Center(child: Text('Erreur : $error')),
        data: (state) {
          final List<LeaseSummary> filtered = state.filteredLeases;
          return RefreshIndicator(
            onRefresh: () =>
                ref.read(leasesListControllerProvider.notifier).refresh(),
            child: Column(
              children: [
                if (state.isFromCache)
                  OfflineDataBanner(cachedAt: state.cachedAt),
                _StatusFilterBar(current: state.statusFilter),
                Expanded(
                  child: filtered.isEmpty
                      ? ListView(
                          children: const [
                            EmptyState(
                              title: 'Aucun bail',
                              message: 'Aucun bail ne correspond à ce filtre.',
                            ),
                          ],
                        )
                      : ListView.separated(
                          key: const ValueKey('leases-list'),
                          padding: const EdgeInsets.all(16),
                          itemCount: filtered.length,
                          separatorBuilder: (_, _) => const SizedBox(height: 8),
                          itemBuilder: (context, index) =>
                              _LeaseCard(lease: filtered[index]),
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

class _StatusFilterBar extends ConsumerWidget {
  const _StatusFilterBar({required this.current});

  final LeaseStatus? current;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    return SingleChildScrollView(
      scrollDirection: Axis.horizontal,
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
      child: Row(
        children: [
          _FilterChip(
            label: 'Tous',
            selected: current == null,
            onTap: () => ref
                .read(leasesListControllerProvider.notifier)
                .setStatusFilter(null),
          ),
          for (final LeaseStatus status in LeaseStatus.values) ...[
            const SizedBox(width: 8),
            _FilterChip(
              label: status.label,
              selected: current == status,
              onTap: () => ref
                  .read(leasesListControllerProvider.notifier)
                  .setStatusFilter(status),
            ),
          ],
        ],
      ),
    );
  }
}

class _FilterChip extends StatelessWidget {
  const _FilterChip({
    required this.label,
    required this.selected,
    required this.onTap,
  });

  final String label;
  final bool selected;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return ChoiceChip(
      key: ValueKey('lease-status-filter-$label'),
      label: Text(label),
      selected: selected,
      onSelected: (_) => onTap(),
    );
  }
}

class _LeaseCard extends StatelessWidget {
  const _LeaseCard({required this.lease});

  final LeaseSummary lease;

  @override
  Widget build(BuildContext context) {
    return Card(
      child: ListTile(
        key: ValueKey('lease-card-${lease.id}'),
        title: Text(lease.reference ?? lease.id),
        subtitle: Text(
          '${lease.tenant.displayName} · Lot ${lease.unit.code}\n'
          'Échéance le ${lease.paymentDueDay}',
        ),
        isThreeLine: true,
        trailing: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          crossAxisAlignment: CrossAxisAlignment.end,
          children: [
            StatusBadge(label: lease.status.label, tone: lease.status.tone),
            const SizedBox(height: 4),
            MoneyXafText(
              lease.rentAmount + lease.chargesAmount,
              style: Theme.of(context).textTheme.bodySmall,
            ),
          ],
        ),
        onTap: () => context.push(RoutePaths.leaseDetail(lease.id)),
      ),
    );
  }
}
