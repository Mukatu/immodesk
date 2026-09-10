import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../../core/router/route_paths.dart';
import '../../../../shared/widgets/empty_state.dart';
import '../../../../shared/widgets/offline_data_banner.dart';
import '../../domain/entities/tenant.dart';
import '../controllers/tenants_list_controller.dart';

/// Liste des locataires avec recherche locale par nom ou téléphone
/// (lecture seule).
class TenantsListScreen extends ConsumerWidget {
  const TenantsListScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final AsyncValue<TenantsListState> stateAsync = ref.watch(
      tenantsListControllerProvider,
    );

    return Scaffold(
      appBar: AppBar(title: const Text('Locataires')),
      body: Column(
        children: [
          Padding(
            padding: const EdgeInsets.all(16),
            child: TextField(
              key: const ValueKey('tenant-search-field'),
              decoration: const InputDecoration(
                labelText: 'Rechercher (nom ou téléphone)',
                prefixIcon: Icon(Icons.search),
                border: OutlineInputBorder(),
              ),
              onChanged: (value) => ref
                  .read(tenantsListControllerProvider.notifier)
                  .updateQuery(value),
            ),
          ),
          Expanded(
            child: stateAsync.when(
              loading: () => const Center(child: CircularProgressIndicator()),
              error: (error, _) => Center(child: Text('Erreur : $error')),
              data: (state) {
                final List<Tenant> filtered = state.filteredTenants;
                return RefreshIndicator(
                  onRefresh: () => ref
                      .read(tenantsListControllerProvider.notifier)
                      .refresh(),
                  child: Column(
                    children: [
                      if (state.isFromCache)
                        OfflineDataBanner(cachedAt: state.cachedAt),
                      Expanded(
                        child: filtered.isEmpty
                            ? ListView(
                                children: const [
                                  EmptyState(
                                    title: 'Aucun locataire',
                                    message: 'Modifiez votre recherche.',
                                  ),
                                ],
                              )
                            : ListView.separated(
                                key: const ValueKey('tenants-list'),
                                padding: const EdgeInsets.all(16),
                                itemCount: filtered.length,
                                separatorBuilder: (_, _) =>
                                    const SizedBox(height: 4),
                                itemBuilder: (context, index) {
                                  final Tenant tenant = filtered[index];
                                  return Card(
                                    child: ListTile(
                                      key: ValueKey('tenant-card-${tenant.id}'),
                                      title: Text(tenant.displayName),
                                      subtitle: Text(tenant.primaryPhone),
                                      onTap: () => context.push(
                                        RoutePaths.tenantDetail(tenant.id),
                                      ),
                                    ),
                                  );
                                },
                              ),
                      ),
                    ],
                  ),
                );
              },
            ),
          ),
        ],
      ),
    );
  }
}
