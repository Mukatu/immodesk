import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../../core/router/route_paths.dart';
import '../../../../shared/widgets/empty_state.dart';
import '../../../../shared/widgets/offline_data_banner.dart';
import '../../domain/entities/occupancy.dart';
import '../../domain/entities/property_summary.dart';
import '../controllers/properties_list_controller.dart';

/// Liste des immeubles avec taux d'occupation (lecture seule).
class PropertiesListScreen extends ConsumerWidget {
  const PropertiesListScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final AsyncValue<PropertiesListState> stateAsync = ref.watch(
      propertiesListControllerProvider,
    );

    return Scaffold(
      appBar: AppBar(title: const Text('Immeubles')),
      body: stateAsync.when(
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (error, _) => Center(child: Text('Erreur : $error')),
        data: (state) {
          return RefreshIndicator(
            onRefresh: () =>
                ref.read(propertiesListControllerProvider.notifier).refresh(),
            child: Column(
              children: [
                if (state.isFromCache)
                  OfflineDataBanner(cachedAt: state.cachedAt),
                Expanded(
                  child: state.items.isEmpty
                      ? ListView(
                          children: const [
                            EmptyState(
                              title: 'Aucun immeuble',
                              message:
                                  'Le portefeuille est vide pour le moment.',
                            ),
                          ],
                        )
                      : ListView.separated(
                          key: const ValueKey('properties-list'),
                          padding: const EdgeInsets.all(16),
                          itemCount: state.items.length,
                          separatorBuilder: (_, _) => const SizedBox(height: 8),
                          itemBuilder: (context, index) =>
                              _PropertyCard(property: state.items[index]),
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

class _PropertyCard extends StatelessWidget {
  const _PropertyCard({required this.property});

  final PropertySummary property;

  @override
  Widget build(BuildContext context) {
    return Card(
      child: ListTile(
        key: ValueKey('property-card-${property.id}'),
        title: Text(property.name),
        subtitle: Text('${property.district}, ${property.city}'),
        trailing: Text(
          property.occupancy.summaryLabel,
          style: Theme.of(context).textTheme.bodySmall,
        ),
        onTap: () => context.push(RoutePaths.propertyDetail(property.id)),
      ),
    );
  }
}
