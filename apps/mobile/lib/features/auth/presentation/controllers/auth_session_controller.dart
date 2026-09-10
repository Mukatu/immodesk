import 'package:riverpod_annotation/riverpod_annotation.dart';

import '../../../../core/network/api_exception.dart';
import '../../../../core/network/dio_provider.dart';
import '../../../organizations/domain/entities/organization_membership.dart';
import '../../../organizations/presentation/controllers/selected_organization_controller.dart';
import '../../data/auth_providers.dart';
import '../../domain/entities/app_user.dart';

part 'auth_session_controller.g.dart';

class AuthSessionState {
  const AuthSessionState({
    this.isAuthenticated = false,
    this.user,
    this.organizations = const <OrganizationMembership>[],
  });

  final bool isAuthenticated;
  final AppUser? user;
  final List<OrganizationMembership> organizations;

  AuthSessionState copyWith({
    bool? isAuthenticated,
    AppUser? user,
    List<OrganizationMembership>? organizations,
  }) {
    return AuthSessionState(
      isAuthenticated: isAuthenticated ?? this.isAuthenticated,
      user: user ?? this.user,
      organizations: organizations ?? this.organizations,
    );
  }
}

/// Session applicative : utilisateur courant et organisations dont il est
/// membre. Tente une restauration silencieuse au démarrage à partir du
/// jeton de rafraîchissement stocké dans `flutter_secure_storage` (la
/// requête `/me` échoue en 401 sans jeton d'accès en mémoire, ce qui
/// déclenche naturellement le rafraîchissement automatique de
/// `AuthInterceptor`).
@Riverpod(keepAlive: true)
class AuthSessionController extends _$AuthSessionController {
  @override
  Future<AuthSessionState> build() async {
    ref.listen(sessionExpiredStreamProvider, (previous, next) {
      state = const AsyncData<AuthSessionState>(AuthSessionState());
    });

    final tokenStore = ref.watch(authTokenStoreProvider);
    final String? refreshToken = await tokenStore.readRefreshToken();
    if (refreshToken == null) {
      return const AuthSessionState();
    }

    try {
      final me = await ref.read(authRepositoryProvider).fetchMe();
      return AuthSessionState(
        isAuthenticated: true,
        user: me.user,
        organizations: me.organizations,
      );
    } on ApiException {
      await tokenStore.clear();
      return const AuthSessionState();
    }
  }

  Future<void> setSession(
    AppUser user,
    List<OrganizationMembership> organizations,
  ) async {
    state = AsyncData<AuthSessionState>(
      AuthSessionState(
        isAuthenticated: true,
        user: user,
        organizations: organizations,
      ),
    );
  }

  Future<void> refreshOrganizations() async {
    final AuthSessionState? current = state.value;
    if (current == null || !current.isAuthenticated) return;
    try {
      final me = await ref.read(authRepositoryProvider).fetchMe();
      state = AsyncData<AuthSessionState>(
        current.copyWith(organizations: me.organizations, user: me.user),
      );
    } on ApiException {
      // Hors ligne ou API indisponible : on conserve les donnees locales.
    }
  }

  Future<void> logout() async {
    await ref.read(authRepositoryProvider).logout();
    await ref.read(selectedOrganizationControllerProvider.notifier).clear();
    state = const AsyncData<AuthSessionState>(AuthSessionState());
  }
}
