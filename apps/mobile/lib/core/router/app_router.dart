import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../features/auth/presentation/screens/otp_verification_screen.dart';
import '../../features/auth/presentation/screens/phone_entry_screen.dart';
import '../../features/auth/presentation/screens/splash_screen.dart';
import '../../features/diagnostics/presentation/screens/diagnostics_screen.dart';
import '../../features/home/presentation/screens/home_screen.dart';
import '../../features/more/presentation/screens/more_screen.dart';
import '../../features/organizations/presentation/screens/organization_create_screen.dart';
import '../../features/organizations/presentation/screens/organization_select_screen.dart';
import '../../features/portfolio/presentation/screens/properties_list_screen.dart';
import '../../features/portfolio/presentation/screens/property_detail_screen.dart';
import '../../features/portfolio/presentation/screens/tenant_detail_screen.dart';
import '../../features/portfolio/presentation/screens/tenants_list_screen.dart';
import '../../features/portfolio/presentation/screens/unit_detail_screen.dart';
import '../../shared/widgets/app_bottom_nav_shell.dart';
import 'route_paths.dart';

/// Navigation `go_router`. La logique de redirection (connecté / bon
/// organisme sélectionné) est portée par [SplashScreen] et par les
/// actions explicites de chaque écran, afin de rester prévisible et
/// testable sans dépendre d'un état global asynchrone dans `redirect`.
///
/// Les onglets bas (Accueil / Immeubles / Locataires / Plus) sont portés
/// par un `StatefulShellRoute` : chaque branche garde sa propre pile de
/// navigation (voir `AppBottomNavShell`).
final Provider<GoRouter> appRouterProvider = Provider<GoRouter>((ref) {
  return GoRouter(
    initialLocation: RoutePaths.splash,
    routes: [
      GoRoute(
        path: RoutePaths.splash,
        builder: (context, state) => const SplashScreen(),
      ),
      GoRoute(
        path: RoutePaths.loginPhone,
        builder: (context, state) => const PhoneEntryScreen(),
      ),
      GoRoute(
        path: RoutePaths.loginOtp,
        builder: (context, state) => const OtpVerificationScreen(),
      ),
      GoRoute(
        path: RoutePaths.organizationSelect,
        builder: (context, state) => const OrganizationSelectScreen(),
      ),
      GoRoute(
        path: RoutePaths.organizationCreate,
        builder: (context, state) => const OrganizationCreateScreen(),
      ),
      GoRoute(
        path: RoutePaths.diagnostics,
        builder: (context, state) => const DiagnosticsScreen(),
      ),
      StatefulShellRoute.indexedStack(
        builder: (context, state, navigationShell) =>
            AppBottomNavShell(navigationShell: navigationShell),
        branches: [
          StatefulShellBranch(
            routes: [
              GoRoute(
                path: RoutePaths.home,
                builder: (context, state) => const HomeScreen(),
              ),
            ],
          ),
          StatefulShellBranch(
            routes: [
              GoRoute(
                path: RoutePaths.properties,
                builder: (context, state) => const PropertiesListScreen(),
                routes: [
                  GoRoute(
                    path: ':id',
                    builder: (context, state) => PropertyDetailScreen(
                      propertyId: state.pathParameters['id']!,
                    ),
                  ),
                ],
              ),
              GoRoute(
                path: RoutePaths.unitDetailPattern,
                builder: (context, state) =>
                    UnitDetailScreen(unitId: state.pathParameters['id']!),
              ),
            ],
          ),
          StatefulShellBranch(
            routes: [
              GoRoute(
                path: RoutePaths.tenants,
                builder: (context, state) => const TenantsListScreen(),
                routes: [
                  GoRoute(
                    path: ':id',
                    builder: (context, state) => TenantDetailScreen(
                      tenantId: state.pathParameters['id']!,
                    ),
                  ),
                ],
              ),
            ],
          ),
          StatefulShellBranch(
            routes: [
              GoRoute(
                path: RoutePaths.more,
                builder: (context, state) => const MoreScreen(),
              ),
            ],
          ),
        ],
      ),
    ],
  );
});
