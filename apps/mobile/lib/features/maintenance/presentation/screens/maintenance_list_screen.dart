import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:riverpod_annotation/riverpod_annotation.dart';

import '../../../../core/router/route_paths.dart';
import '../../../../shared/widgets/empty_state.dart';
import '../../../../shared/widgets/status_badge.dart';
import '../../../auth/presentation/controllers/auth_session_controller.dart';
import '../../../organizations/presentation/controllers/selected_organization_controller.dart';
import '../../data/maintenance_providers.dart';
import '../../domain/entities/maintenance_status.dart';
import '../../domain/entities/maintenance_summary.dart';

part 'maintenance_list_screen.g.dart';

@riverpod
Future<List<MaintenanceSummary>> myMaintenanceRequests(Ref ref) async {
  final String? organizationId = await ref.watch(
    selectedOrganizationControllerProvider.future,
  );
  final AuthSessionState session = await ref.watch(
    authSessionControllerProvider.future,
  );
  final String? userId = session.user?.id;
  if (organizationId == null || userId == null) return const [];
  return ref
      .watch(maintenanceRepositoryProvider)
      .fetchAssigned(organizationId: organizationId, assignedToUserId: userId);
}

/// Demandes de maintenance affectées au démarcheur connecté
/// (`docs/api/phase8-contract.md` : « COLLECTOR : celles qui lui sont
/// affectées »).
class MaintenanceListScreen extends ConsumerWidget {
  const MaintenanceListScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final AsyncValue<List<MaintenanceSummary>> requestsAsync = ref.watch(
      myMaintenanceRequestsProvider,
    );
    return Scaffold(
      appBar: AppBar(title: const Text('Mes demandes de maintenance')),
      body: requestsAsync.when(
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (error, _) => EmptyState(
          icon: Icons.wifi_off_outlined,
          title: 'Connexion requise',
          message: 'Impossible de charger les demandes : $error',
        ),
        data: (requests) {
          if (requests.isEmpty) {
            return const EmptyState(
              icon: Icons.build_outlined,
              title: 'Aucune demande affectée',
              message: 'Aucune demande de maintenance ne vous est affectée.',
            );
          }
          return ListView.separated(
            itemCount: requests.length,
            separatorBuilder: (_, _) => const Divider(height: 1),
            itemBuilder: (context, index) {
              final MaintenanceSummary request = requests[index];
              return ListTile(
                key: ValueKey('maintenance-item-${request.id}'),
                title: Text(request.title),
                subtitle: Text(
                  '${request.reference} — ${request.property.name}',
                ),
                trailing: StatusBadge(
                  label: request.status.label,
                  tone: request.status.tone,
                ),
                onTap: () =>
                    context.push(RoutePaths.maintenanceDetail(request.id)),
              );
            },
          );
        },
      ),
    );
  }
}
