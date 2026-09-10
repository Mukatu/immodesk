import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../../core/router/route_paths.dart';
import '../../../../shared/widgets/money_xaf_text.dart';
import '../../../../shared/widgets/offline_data_banner.dart';
import '../../../../shared/widgets/status_badge.dart';
import '../../domain/entities/occupancy.dart';
import '../../domain/entities/property_detail.dart';
import '../../domain/entities/unit.dart';
import '../../domain/entities/unit_status.dart';
import '../controllers/property_detail_controller.dart';

/// Détail d'un immeuble : informations générales et liste des lots avec
/// leur statut (lecture seule).
class PropertyDetailScreen extends ConsumerWidget {
  const PropertyDetailScreen({super.key, required this.propertyId});

  final String propertyId;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final AsyncValue<PropertyDetailState> stateAsync = ref.watch(
      propertyDetailControllerProvider(propertyId),
    );

    return Scaffold(
      appBar: AppBar(title: const Text('Immeuble')),
      body: stateAsync.when(
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (error, _) => Center(child: Text('Erreur : $error')),
        data: (state) {
          final PropertyDetail detail = state.detail;
          return RefreshIndicator(
            onRefresh: () => ref
                .read(propertyDetailControllerProvider(propertyId).notifier)
                .refresh(),
            child: ListView(
              key: const ValueKey('property-detail-list'),
              children: [
                if (state.isFromCache)
                  OfflineDataBanner(cachedAt: state.cachedAt),
                Padding(
                  padding: const EdgeInsets.all(16),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        detail.name,
                        style: Theme.of(context).textTheme.headlineSmall,
                      ),
                      const SizedBox(height: 4),
                      Text('${detail.district}, ${detail.city}'),
                      const SizedBox(height: 4),
                      Text('Bailleur : ${detail.landlord.displayName}'),
                      const SizedBox(height: 8),
                      Text(
                        '${detail.occupancy.summaryLabel} (${detail.occupancy.percentLabel})',
                        style: Theme.of(context).textTheme.bodyMedium,
                      ),
                      const SizedBox(height: 16),
                      Text(
                        'Lots',
                        style: Theme.of(context).textTheme.titleMedium,
                      ),
                    ],
                  ),
                ),
                for (final Unit unit in detail.units) _UnitRow(unit: unit),
              ],
            ),
          );
        },
      ),
    );
  }
}

class _UnitRow extends StatelessWidget {
  const _UnitRow({required this.unit});

  final Unit unit;

  @override
  Widget build(BuildContext context) {
    return ListTile(
      key: ValueKey('unit-row-${unit.id}'),
      title: Text(unit.label?.isNotEmpty == true ? unit.label! : unit.code),
      subtitle: MoneyXafText(unit.baseRentAmount),
      trailing: StatusBadge(label: unit.status.label, tone: unit.status.tone),
      onTap: () => context.push(RoutePaths.unitDetail(unit.id)),
    );
  }
}
