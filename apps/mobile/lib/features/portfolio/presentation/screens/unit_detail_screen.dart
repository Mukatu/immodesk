import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../../core/router/route_paths.dart';
import '../../../../shared/widgets/money_xaf_text.dart';
import '../../../../shared/widgets/offline_data_banner.dart';
import '../../../../shared/widgets/status_badge.dart';
import '../../../documents/presentation/widgets/unit_photos_gallery.dart';
import '../../../leases/domain/entities/lease_detail.dart';
import '../../../leases/domain/entities/lease_status.dart';
import '../../../leases/presentation/controllers/unit_active_lease_controller.dart';
import '../../domain/entities/unit.dart';
import '../../domain/entities/unit_status.dart';
import '../../domain/entities/unit_type.dart';
import '../controllers/unit_detail_controller.dart';

/// Détail d'un lot : caractéristiques, loyer de référence (XAF) et galerie
/// de photos (lecture seule + prise de photo terrain).
class UnitDetailScreen extends ConsumerWidget {
  const UnitDetailScreen({super.key, required this.unitId});

  final String unitId;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final AsyncValue<UnitDetailState> stateAsync = ref.watch(
      unitDetailControllerProvider(unitId),
    );

    return Scaffold(
      appBar: AppBar(title: const Text('Lot')),
      body: stateAsync.when(
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (error, _) => Center(child: Text('Erreur : $error')),
        data: (state) {
          final Unit unit = state.detail.unit;
          return RefreshIndicator(
            onRefresh: () => ref
                .read(unitDetailControllerProvider(unitId).notifier)
                .refresh(),
            child: ListView(
              key: const ValueKey('unit-detail-list'),
              padding: const EdgeInsets.all(16),
              children: [
                if (state.isFromCache)
                  OfflineDataBanner(cachedAt: state.cachedAt),
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Text(
                      unit.label?.isNotEmpty == true ? unit.label! : unit.code,
                      style: Theme.of(context).textTheme.headlineSmall,
                    ),
                    StatusBadge(
                      label: unit.status.label,
                      tone: unit.status.tone,
                    ),
                  ],
                ),
                const SizedBox(height: 4),
                Text('Immeuble : ${state.detail.property.name}'),
                const SizedBox(height: 16),
                Text(
                  'Loyer de référence',
                  style: Theme.of(context).textTheme.labelMedium,
                ),
                MoneyXafText(
                  unit.baseRentAmount,
                  style: Theme.of(context).textTheme.titleLarge,
                ),
                const SizedBox(height: 16),
                Text(
                  'Caractéristiques',
                  style: Theme.of(context).textTheme.titleMedium,
                ),
                const SizedBox(height: 8),
                if (unit.unitType != null)
                  Text('Type : ${unit.unitType!.label}'),
                if (unit.areaSqm != null) Text('Surface : ${unit.areaSqm} m²'),
                if (unit.roomsCount != null)
                  Text('Pièces : ${unit.roomsCount}'),
                if (unit.bedroomsCount != null)
                  Text('Chambres : ${unit.bedroomsCount}'),
                if (unit.bathroomsCount != null)
                  Text('Salles d\'eau : ${unit.bathroomsCount}'),
                if (unit.isFurnished != null)
                  Text(unit.isFurnished! ? 'Meublé' : 'Non meublé'),
                const SizedBox(height: 24),
                _UnitActiveLeaseSection(unitId: unitId),
                const SizedBox(height: 24),
                UnitPhotosGallery(unitId: unitId),
              ],
            ),
          );
        },
      ),
    );
  }
}

/// Résumé du bail actif rattaché à ce lot (statut, référence, loyer,
/// échéance), avec accès à la fiche complète du bail.
class _UnitActiveLeaseSection extends ConsumerWidget {
  const _UnitActiveLeaseSection({required this.unitId});

  final String unitId;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final AsyncValue<UnitActiveLeaseState> stateAsync = ref.watch(
      unitActiveLeaseControllerProvider(unitId),
    );
    return stateAsync.when(
      loading: () => const SizedBox.shrink(),
      error: (error, _) => Text('Bail : erreur ($error)'),
      data: (state) {
        final LeaseDetail? lease = state.lease;
        return Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text('Bail actif', style: Theme.of(context).textTheme.titleMedium),
            const SizedBox(height: 8),
            if (state.isFromCache) OfflineDataBanner(cachedAt: state.cachedAt),
            if (lease == null)
              const Text('Aucun bail actif pour ce lot.')
            else
              Card(
                key: const ValueKey('unit-active-lease-card'),
                child: ListTile(
                  title: Text(lease.reference ?? lease.id),
                  subtitle: Text(
                    '${lease.tenant.displayName}\n'
                    'Échéance le ${lease.paymentDueDay}',
                  ),
                  isThreeLine: true,
                  trailing: StatusBadge(
                    label: lease.status.label,
                    tone: lease.status.tone,
                  ),
                  onTap: () => context.push(RoutePaths.leaseDetail(lease.id)),
                ),
              ),
          ],
        );
      },
    );
  }
}
