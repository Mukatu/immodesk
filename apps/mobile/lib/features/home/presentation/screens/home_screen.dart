import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../../core/router/route_paths.dart';
import '../../../../shared/widgets/status_badge.dart';
import '../../../auth/presentation/controllers/auth_session_controller.dart';
import '../../../organizations/domain/entities/organization_membership.dart';
import '../../../organizations/domain/entities/role.dart';
import '../../../organizations/presentation/controllers/selected_organization_controller.dart';

/// Coquille d'accueil : nom de l'organisation courante, rôle de
/// l'utilisateur, menu vers diagnostic et déconnexion.
class HomeScreen extends ConsumerWidget {
  const HomeScreen({super.key});

  static const String path = RoutePaths.home;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final AsyncValue<AuthSessionState> sessionAsync = ref.watch(
      authSessionControllerProvider,
    );
    final AsyncValue<String?> selectedOrgIdAsync = ref.watch(
      selectedOrganizationControllerProvider,
    );

    return sessionAsync.when(
      loading: () =>
          const Scaffold(body: Center(child: CircularProgressIndicator())),
      error: (error, _) =>
          Scaffold(body: Center(child: Text('Erreur : $error'))),
      data: (session) {
        final String? selectedOrgId = selectedOrgIdAsync.value;
        OrganizationMembership? membership;
        for (final OrganizationMembership m in session.organizations) {
          if (m.organization.id == selectedOrgId) {
            membership = m;
            break;
          }
        }

        return Scaffold(
          appBar: AppBar(
            title: Text(membership?.organization.legalName ?? 'Immodesk'),
            actions: [
              PopupMenuButton<String>(
                key: const ValueKey('home-menu-button'),
                onSelected: (value) => _onMenuSelected(context, ref, value),
                itemBuilder: (context) => const [
                  PopupMenuItem<String>(
                    value: 'diagnostics',
                    child: Text('À propos / diagnostic'),
                  ),
                  PopupMenuItem<String>(
                    value: 'switch-org',
                    child: Text("Changer d'organisation"),
                  ),
                  PopupMenuItem<String>(
                    value: 'logout',
                    child: Text('Déconnexion'),
                  ),
                ],
              ),
            ],
          ),
          body: Center(
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                Icon(
                  Icons.home_work_outlined,
                  size: 64,
                  color: Theme.of(context).colorScheme.primary,
                ),
                const SizedBox(height: 16),
                Text(
                  membership?.organization.legalName ??
                      'Aucune organisation sélectionnée',
                  style: Theme.of(context).textTheme.headlineSmall,
                  textAlign: TextAlign.center,
                ),
                if (membership != null) ...[
                  const SizedBox(height: 8),
                  StatusBadge(label: membership.role.label),
                ],
              ],
            ),
          ),
        );
      },
    );
  }

  Future<void> _onMenuSelected(
    BuildContext context,
    WidgetRef ref,
    String value,
  ) async {
    switch (value) {
      case 'diagnostics':
        context.push(RoutePaths.diagnostics);
      case 'switch-org':
        context.push(RoutePaths.organizationSelect);
      case 'logout':
        await ref.read(authSessionControllerProvider.notifier).logout();
        if (context.mounted) context.go(RoutePaths.loginPhone);
    }
  }
}
