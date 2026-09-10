import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../features/documents/data/outbox_connectivity_watcher.dart';

/// Coquille de navigation par onglets bas : Accueil / Immeubles /
/// Locataires / Plus. Tous les rôles (y compris COLLECTOR) accèdent aux
/// quatre onglets : toute la feature `portfolio` est en lecture seule.
///
/// Active aussi, une seule fois pour toute l'application, le rejeu de
/// l'outbox des photos dès le retour du réseau.
class AppBottomNavShell extends ConsumerWidget {
  const AppBottomNavShell({super.key, required this.navigationShell});

  final StatefulNavigationShell navigationShell;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    ref.watch(outboxConnectivityWatcherProvider);
    return Scaffold(
      body: navigationShell,
      bottomNavigationBar: NavigationBar(
        key: const ValueKey('app-bottom-nav'),
        selectedIndex: navigationShell.currentIndex,
        onDestinationSelected: (index) => navigationShell.goBranch(
          index,
          initialLocation: index == navigationShell.currentIndex,
        ),
        destinations: const [
          NavigationDestination(
            icon: Icon(Icons.home_outlined),
            selectedIcon: Icon(Icons.home),
            label: 'Accueil',
          ),
          NavigationDestination(
            icon: Icon(Icons.apartment_outlined),
            selectedIcon: Icon(Icons.apartment),
            label: 'Immeubles',
          ),
          NavigationDestination(
            icon: Icon(Icons.people_outline),
            selectedIcon: Icon(Icons.people),
            label: 'Locataires',
          ),
          NavigationDestination(
            icon: Icon(Icons.more_horiz_outlined),
            selectedIcon: Icon(Icons.more_horiz),
            label: 'Plus',
          ),
        ],
      ),
    );
  }
}
