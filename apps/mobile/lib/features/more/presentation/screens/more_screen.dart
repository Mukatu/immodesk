import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../../core/router/route_paths.dart';
import '../../../auth/presentation/controllers/auth_session_controller.dart';

/// Onglet « Plus » : accès au diagnostic et à la déconnexion.
class MoreScreen extends ConsumerWidget {
  const MoreScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    return Scaffold(
      appBar: AppBar(title: const Text('Plus')),
      body: ListView(
        children: [
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
