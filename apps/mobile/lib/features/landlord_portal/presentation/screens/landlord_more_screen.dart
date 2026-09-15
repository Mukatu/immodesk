import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../../core/router/route_paths.dart';
import '../../../auth/presentation/controllers/auth_session_controller.dart';

/// Onglet « Plus » de l'espace bailleur : encaissements, quittances,
/// déconnexion. Aucune action d'écriture, conformément au portail en
/// lecture seule (`AGENCY.PORTAL_READ_ONLY`).
class LandlordMoreScreen extends ConsumerWidget {
  const LandlordMoreScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    return Scaffold(
      appBar: AppBar(title: const Text('Plus')),
      body: ListView(
        children: [
          ListTile(
            key: const ValueKey('landlord-more-collections-tile'),
            leading: const Icon(Icons.payments_outlined),
            title: const Text('Mes encaissements'),
            onTap: () => context.push(RoutePaths.landlordCollections),
          ),
          const Divider(height: 1),
          ListTile(
            key: const ValueKey('landlord-more-receipts-tile'),
            leading: const Icon(Icons.receipt_long_outlined),
            title: const Text('Mes quittances'),
            onTap: () => context.push(RoutePaths.landlordReceipts),
          ),
          const Divider(height: 1),
          ListTile(
            key: const ValueKey('landlord-more-logout-tile'),
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
