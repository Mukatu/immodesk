import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../../core/router/route_paths.dart';
import '../../../../shared/widgets/empty_state.dart';
import '../../../../shared/widgets/status_badge.dart';
import '../../domain/entities/organization_membership.dart';
import '../../domain/entities/role.dart';
import '../controllers/organizations_controller.dart';
import '../controllers/selected_organization_controller.dart';

/// Sélection de l'organisation courante, pour les utilisateurs membres de
/// plusieurs organisations.
class OrganizationSelectScreen extends ConsumerWidget {
  const OrganizationSelectScreen({super.key});

  static const String path = RoutePaths.organizationSelect;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final AsyncValue<List<OrganizationMembership>> membershipsAsync = ref
        .watch(organizationsControllerProvider);

    return Scaffold(
      appBar: AppBar(title: const Text('Choisir une organisation')),
      body: membershipsAsync.when(
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (error, _) => Center(child: Text('Erreur : $error')),
        data: (memberships) {
          if (memberships.isEmpty) {
            return EmptyState(
              title: 'Aucune organisation',
              message: 'Créez votre première organisation pour commencer.',
              icon: Icons.apartment_outlined,
              action: FilledButton(
                onPressed: () => context.push(RoutePaths.organizationCreate),
                child: const Text('Créer une organisation'),
              ),
            );
          }
          return ListView.separated(
            padding: const EdgeInsets.all(16),
            itemCount: memberships.length,
            separatorBuilder: (_, _) => const SizedBox(height: 8),
            itemBuilder: (context, index) {
              final OrganizationMembership membership = memberships[index];
              return Card(
                child: ListTile(
                  key: ValueKey('organization-${membership.organization.id}'),
                  title: Text(membership.organization.legalName),
                  subtitle: Text(membership.organization.city),
                  trailing: StatusBadge(label: membership.role.label),
                  onTap: () => _select(context, ref, membership),
                ),
              );
            },
          );
        },
      ),
      floatingActionButton: FloatingActionButton.extended(
        onPressed: () => context.push(RoutePaths.organizationCreate),
        icon: const Icon(Icons.add),
        label: const Text('Nouvelle organisation'),
      ),
    );
  }

  Future<void> _select(
    BuildContext context,
    WidgetRef ref,
    OrganizationMembership membership,
  ) async {
    await ref
        .read(selectedOrganizationControllerProvider.notifier)
        .select(membership.organization.id);
    if (context.mounted) context.go(RoutePaths.home);
  }
}
