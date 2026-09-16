import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../../core/router/route_paths.dart';
import '../../../../core/sync/outbox_watch.dart';
import '../../../auth/presentation/controllers/auth_session_controller.dart';
import '../../../organizations/presentation/controllers/current_role_controller.dart';
import '../../../organizations/presentation/controllers/selected_organization_controller.dart';

/// Onglet « Plus » : accès au diagnostic et à la déconnexion.
///
/// Mode démarcheur restreint (épic 5.D) : la liste complète des baux de
/// l'organisation est masquée à un `COLLECTOR` (qui ne voit que sa
/// tournée, ses reçus et sa caisse).
class MoreScreen extends ConsumerWidget {
  const MoreScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final String? organizationId = ref
        .watch(selectedOrganizationControllerProvider)
        .value;
    final OutboxCounts counts = organizationId == null
        ? const OutboxCounts()
        : OutboxCounts.fromRows(
            ref.watch(outboxWatchProvider(organizationId)).value ?? const [],
          );
    final bool isCollector = ref.watch(isCollectorModeProvider).value ?? false;

    return Scaffold(
      appBar: AppBar(title: const Text('Plus')),
      body: ListView(
        children: [
          if (!isCollector) ...[
            ListTile(
              key: const ValueKey('more-leases-tile'),
              leading: const Icon(Icons.description_outlined),
              title: const Text('Baux'),
              onTap: () => context.push(RoutePaths.leases),
            ),
            const Divider(height: 1),
          ],
          ListTile(
            key: const ValueKey('more-collection-tile'),
            leading: const Icon(Icons.route_outlined),
            title: const Text('Ma tournée'),
            onTap: () => context.push(RoutePaths.collectionRound),
          ),
          const Divider(height: 1),
          ListTile(
            key: const ValueKey('more-cash-tile'),
            leading: const Icon(Icons.savings_outlined),
            title: const Text('Ma caisse'),
            onTap: () => context.push(RoutePaths.cashHome),
          ),
          const Divider(height: 1),
          ListTile(
            key: const ValueKey('more-inspections-tile'),
            leading: const Icon(Icons.fact_check_outlined),
            title: const Text('États des lieux'),
            onTap: () => context.push(RoutePaths.inspectionLotPicker),
          ),
          const Divider(height: 1),
          ListTile(
            key: const ValueKey('more-meters-tile'),
            leading: const Icon(Icons.speed_outlined),
            title: const Text('Relever un compteur'),
            onTap: () => context.push(RoutePaths.meterLotPicker),
          ),
          const Divider(height: 1),
          ListTile(
            key: const ValueKey('more-maintenance-tile'),
            leading: const Icon(Icons.build_outlined),
            title: const Text('Mes demandes de maintenance'),
            onTap: () => context.push(RoutePaths.maintenanceList),
          ),
          const Divider(height: 1),
          ListTile(
            key: const ValueKey('more-outbox-tile'),
            leading: Badge(
              key: const ValueKey('outbox-badge'),
              isLabelVisible: counts.waiting > 0,
              label: Text('${counts.waiting}'),
              backgroundColor: counts.needsAttention > 0
                  ? Theme.of(context).colorScheme.error
                  : null,
              child: const Icon(Icons.sync_outlined),
            ),
            title: const Text('File d\'attente (Outbox)'),
            subtitle: counts.needsAttention > 0
                ? Text('${counts.needsAttention} élément(s) à examiner')
                : null,
            onTap: () => context.push(RoutePaths.outbox),
          ),
          const Divider(height: 1),
          ListTile(
            key: const ValueKey('more-diagnostics-tile'),
            leading: const Icon(Icons.wifi_tethering_outlined),
            title: const Text('À propos / diagnostic'),
            onTap: () => context.push(RoutePaths.diagnostics),
          ),
          const Divider(height: 1),
          ListTile(
            key: const ValueKey('more-logout-tile'),
            leading: const Icon(Icons.logout_outlined),
            title: const Text('Déconnexion'),
            onTap: () async {
              await ref.read(authSessionControllerProvider.notifier).logout();
              if (context.mounted) context.go(RoutePaths.loginPhone);
            },
          ),
        ],
      ),
    );
  }
}
