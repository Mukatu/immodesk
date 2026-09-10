import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../../core/router/route_paths.dart';
import '../../../organizations/presentation/controllers/selected_organization_controller.dart';
import '../controllers/auth_session_controller.dart';

/// Écran de démarrage : restaure la session locale puis redirige vers le
/// bon écran (connexion, sélection d'organisation ou accueil). La
/// redirection lit l'état d'authentification local, jamais le réseau
/// directement, afin qu'une ouverture hors ligne aboutisse toujours à un
/// écran utilisable.
class SplashScreen extends ConsumerStatefulWidget {
  const SplashScreen({super.key});

  static const String path = RoutePaths.splash;

  @override
  ConsumerState<SplashScreen> createState() => _SplashScreenState();
}

class _SplashScreenState extends ConsumerState<SplashScreen> {
  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) => _bootstrap());
  }

  Future<void> _bootstrap() async {
    final session = await ref.read(authSessionControllerProvider.future);
    if (!mounted) return;

    if (!session.isAuthenticated) {
      context.go(RoutePaths.loginPhone);
      return;
    }

    final String? selectedOrgId = await ref.read(
      selectedOrganizationControllerProvider.future,
    );
    if (!mounted) return;

    final bool hasValidSelection =
        selectedOrgId != null &&
        session.organizations.any(
          (m) => m.organization.id == selectedOrgId,
        );

    context.go(
      hasValidSelection ? RoutePaths.home : RoutePaths.organizationSelect,
    );
  }

  @override
  Widget build(BuildContext context) {
    return const Scaffold(
      body: Center(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(Icons.home_work_outlined, size: 64),
            SizedBox(height: 16),
            Text('Immodesk', style: TextStyle(fontSize: 22)),
            SizedBox(height: 24),
            CircularProgressIndicator(),
          ],
        ),
      ),
    );
  }
}
