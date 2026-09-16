import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:riverpod_annotation/riverpod_annotation.dart';

import '../../../../core/router/route_paths.dart';
import '../../../../shared/widgets/empty_state.dart';
import '../../../organizations/presentation/controllers/selected_organization_controller.dart';
import '../../data/meters_providers.dart';
import '../../domain/entities/meter.dart';
import '../../domain/entities/meter_type.dart';

part 'meter_selection_screen.g.dart';

@riverpod
Future<List<Meter>> unitMeters(Ref ref, String unitId) async {
  final String? organizationId = await ref.watch(
    selectedOrganizationControllerProvider.future,
  );
  if (organizationId == null) return const [];
  return ref
      .watch(metersRepositoryProvider)
      .fetchMeters(organizationId: organizationId, unitId: unitId);
}

/// Sélection du compteur d'un lot avant relevé. Nécessite une connexion
/// (liste des compteurs non mise en cache) ; seul l'envoi du relevé
/// fonctionne ensuite hors ligne (`MeterReadingController`).
class MeterSelectionScreen extends ConsumerWidget {
  const MeterSelectionScreen({super.key, required this.unitId});

  final String unitId;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final AsyncValue<List<Meter>> metersAsync = ref.watch(
      unitMetersProvider(unitId),
    );
    return Scaffold(
      appBar: AppBar(title: const Text('Compteurs du lot')),
      body: metersAsync.when(
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (error, _) => EmptyState(
          icon: Icons.wifi_off_outlined,
          title: 'Connexion requise',
          message: 'Impossible de charger les compteurs : $error',
        ),
        data: (meters) {
          if (meters.isEmpty) {
            return const EmptyState(
              icon: Icons.speed_outlined,
              title: 'Aucun compteur',
              message: 'Ce lot ne porte aucun compteur enregistré.',
            );
          }
          return ListView.separated(
            itemCount: meters.length,
            separatorBuilder: (_, _) => const Divider(height: 1),
            itemBuilder: (context, index) {
              final Meter meter = meters[index];
              return ListTile(
                key: ValueKey('meter-item-${meter.id}'),
                title: Text('${meter.meterType.label} — ${meter.serialNumber}'),
                subtitle: meter.lastReading != null
                    ? Text('Dernier index : ${meter.lastReading!.currentIndex}')
                    : const Text('Aucun relevé précédent'),
                enabled: !meter.isPrepaid,
                trailing: meter.isPrepaid
                    ? const Text('Prépayé (non relevé)')
                    : null,
                onTap: meter.isPrepaid
                    ? null
                    : () => context.push(RoutePaths.meterReading, extra: meter),
              );
            },
          );
        },
      ),
    );
  }
}
