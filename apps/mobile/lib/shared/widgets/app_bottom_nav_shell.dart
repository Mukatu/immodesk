import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../core/sync/sync_providers.dart';
import '../../features/documents/data/outbox_connectivity_watcher.dart';
import '../../features/organizations/presentation/controllers/current_role_controller.dart';

class _TabSpec {
  const _TabSpec(this.branchIndex, this.icon, this.selectedIcon, this.label);
  final int branchIndex;
  final IconData icon;
  final IconData selectedIcon;
  final String label;
}

const List<_TabSpec> _allTabs = [
  _TabSpec(0, Icons.home_outlined, Icons.home, 'Accueil'),
  _TabSpec(1, Icons.apartment_outlined, Icons.apartment, 'Immeubles'),
  _TabSpec(2, Icons.people_outline, Icons.people, 'Locataires'),
  _TabSpec(3, Icons.more_horiz_outlined, Icons.more_horiz, 'Plus'),
];

/// Coquille de navigation par onglets bas.
///
/// Mode démarcheur restreint (`docs/04_plan_de_phases.md` §5.3, épic 5.D) :
/// un `COLLECTOR` ne voit que « Accueil » et « Plus » (qui donne accès à
/// sa tournée, ses reçus et sa caisse) — les onglets Immeubles/Locataires,
/// qui parcourent tout le portefeuille de l'organisation, lui sont
/// masqués. Les autres rôles gardent les quatre onglets, la feature
/// `portfolio` restant en lecture seule pour tous.
///
/// Active aussi, une seule fois pour toute l'application, le rejeu de
/// l'outbox des photos dès le retour du réseau.
class AppBottomNavShell extends ConsumerWidget {
  const AppBottomNavShell({super.key, required this.navigationShell});

  final StatefulNavigationShell navigationShell;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    ref.watch(outboxConnectivityWatcherProvider);
    ref.watch(syncCoordinatorProvider);
    final bool isCollector = ref.watch(isCollectorModeProvider).value ?? false;
    final List<_TabSpec> tabs = isCollector
        ? _allTabs
              .where((t) => t.branchIndex == 0 || t.branchIndex == 3)
              .toList()
        : _allTabs;
    final int selected = tabs.indexWhere(
      (t) => t.branchIndex == navigationShell.currentIndex,
    );

    // Sécurité : un COLLECTOR arrivé sur un onglet masqué (lien profond,
    // ancien état restauré) est ramené à l'accueil.
    if (isCollector && selected == -1) {
      WidgetsBinding.instance.addPostFrameCallback((_) {
        if (context.mounted) navigationShell.goBranch(0);
      });
    }

    return Scaffold(
      body: navigationShell,
      bottomNavigationBar: NavigationBar(
        key: const ValueKey('app-bottom-nav'),
        selectedIndex: selected < 0 ? 0 : selected,
        onDestinationSelected: (index) => navigationShell.goBranch(
          tabs[index].branchIndex,
          initialLocation:
              tabs[index].branchIndex == navigationShell.currentIndex,
        ),
        destinations: [
          for (final _TabSpec tab in tabs)
            NavigationDestination(
              icon: Icon(tab.icon),
              selectedIcon: Icon(tab.selectedIcon),
              label: tab.label,
            ),
        ],
      ),
    );
  }
}
