import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:riverpod_annotation/riverpod_annotation.dart';

import '../../../../core/router/route_paths.dart';
import '../../../../shared/widgets/empty_state.dart';
import '../../../../shared/widgets/status_badge.dart';
import '../../../organizations/presentation/controllers/selected_organization_controller.dart';
import '../../data/maintenance_providers.dart';
import '../../domain/entities/maintenance_detail.dart';
import '../../domain/entities/maintenance_status.dart';

part 'maintenance_detail_screen.g.dart';

@riverpod
Future<MaintenanceDetail> maintenanceDetail(Ref ref, String id) async {
  final String? organizationId = await ref.watch(
    selectedOrganizationControllerProvider.future,
  );
  if (organizationId == null) {
    throw StateError('Organisation introuvable.');
  }
  return ref
      .watch(maintenanceRepositoryProvider)
      .fetchDetail(organizationId: organizationId, id: id);
}

/// Détail d'une demande de maintenance : description, historique complet
/// des mises à jour, et accès à l'ajout d'une nouvelle mise à jour terrain.
class MaintenanceDetailScreen extends ConsumerWidget {
  const MaintenanceDetailScreen({super.key, required this.id});

  final String id;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final AsyncValue<MaintenanceDetail> detailAsync = ref.watch(
      maintenanceDetailProvider(id),
    );
    return Scaffold(
      appBar: AppBar(title: const Text('Demande de maintenance')),
      body: detailAsync.when(
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (error, _) => EmptyState(
          icon: Icons.wifi_off_outlined,
          title: 'Connexion requise',
          message: 'Impossible de charger la demande : $error',
        ),
        data: (detail) => ListView(
          padding: const EdgeInsets.all(16),
          children: [
            Row(
              children: [
                Expanded(
                  child: Text(
                    detail.title,
                    style: Theme.of(context).textTheme.titleLarge,
                  ),
                ),
                StatusBadge(
                  label: detail.status.label,
                  tone: detail.status.tone,
                ),
              ],
            ),
            const SizedBox(height: 4),
            Text(detail.reference),
            const SizedBox(height: 12),
            Text(detail.description),
            if (detail.locationDetail != null) ...[
              const SizedBox(height: 8),
              Text('Localisation : ${detail.locationDetail}'),
            ],
            const SizedBox(height: 16),
            Text('Historique', style: Theme.of(context).textTheme.titleMedium),
            for (final update in detail.updates)
              ListTile(
                key: ValueKey('maintenance-update-${update.id}'),
                title: Text(update.message ?? '(sans commentaire)'),
                subtitle: Text(
                  '${update.authorLabel ?? 'Inconnu'} — '
                  '${update.newStatus?.label ?? 'sans changement de statut'}',
                ),
              ),
            const SizedBox(height: 24),
            FilledButton.icon(
              key: const ValueKey('maintenance-add-update-button'),
              onPressed: () =>
                  context.push(RoutePaths.maintenanceUpdate(detail.id)),
              icon: const Icon(Icons.add_comment_outlined),
              label: const Text('Ajouter une mise à jour'),
            ),
          ],
        ),
      ),
    );
  }
}
