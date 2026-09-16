import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../core/db/app_database.dart';
import '../../features/leases/data/leases_cache_mapper.dart';
import '../../features/leases/domain/entities/lease_status.dart';
import '../../features/leases/domain/entities/lease_summary.dart';
import '../../features/organizations/presentation/controllers/selected_organization_controller.dart';
import 'empty_state.dart';

/// Baux actifs de la tournée mise en cache (`CachedLeases`, préchargée par
/// `GET /v1/sync/pull` — voir `docs/api/phase5-contract.md`) : périmètre du
/// démarcheur, disponible même hors ligne.
final FutureProvider<List<LeaseSummary>> activeCachedLeasesProvider =
    FutureProvider<List<LeaseSummary>>((ref) async {
      final String? organizationId = await ref.watch(
        selectedOrganizationControllerProvider.future,
      );
      if (organizationId == null) return const [];
      final AppDatabase db = ref.watch(appDatabaseProvider);
      final rows = await db.getCachedLeasesForOrganization(organizationId);
      return rows
          .map(LeasesCacheMapper.summaryFromRow)
          .where((l) => l.status.isActive)
          .toList();
    });

/// Sélection d'un lot (via son bail actif) pour une écriture de terrain
/// (état des lieux ou relevé de compteur) : liste issue de la tournée mise
/// en cache du démarcheur, disponible hors ligne. À la sélection, navigue
/// vers [destinationPath] avec le [LeaseSummary] choisi en `extra`.
class LeasePickerScreen extends ConsumerWidget {
  const LeasePickerScreen({
    super.key,
    required this.title,
    required this.destinationPath,
  });

  final String title;
  final String Function(LeaseSummary lease) destinationPath;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final AsyncValue<List<LeaseSummary>> leasesAsync = ref.watch(
      activeCachedLeasesProvider,
    );
    return Scaffold(
      appBar: AppBar(title: Text(title)),
      body: leasesAsync.when(
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (error, _) => EmptyState(
          icon: Icons.error_outline,
          title: 'Impossible de charger la tournée',
          message: '$error',
        ),
        data: (leases) {
          if (leases.isEmpty) {
            return const EmptyState(
              icon: Icons.home_work_outlined,
              title: 'Aucun lot disponible',
              message:
                  'Préchargez votre tournée (diagnostic) pour choisir un lot.',
            );
          }
          return ListView.separated(
            itemCount: leases.length,
            separatorBuilder: (_, _) => const Divider(height: 1),
            itemBuilder: (context, index) {
              final LeaseSummary lease = leases[index];
              return ListTile(
                key: ValueKey('lease-picker-item-${lease.id}'),
                title: Text(lease.unit.label ?? lease.unit.code),
                subtitle: Text(
                  '${lease.property.name} — ${lease.tenant.displayName}',
                ),
                onTap: () => context.push(destinationPath(lease), extra: lease),
              );
            },
          );
        },
      ),
    );
  }
}
