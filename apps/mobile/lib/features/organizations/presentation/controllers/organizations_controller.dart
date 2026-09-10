import 'package:riverpod_annotation/riverpod_annotation.dart';

import '../../../auth/presentation/controllers/auth_session_controller.dart';
import '../../domain/entities/organization_membership.dart';

part 'organizations_controller.g.dart';

/// Liste des organisations de l'utilisateur courant (dérivée de la
/// session applicative, elle-même alimentée par `GET /v1/me`).
@riverpod
class OrganizationsController extends _$OrganizationsController {
  @override
  Future<List<OrganizationMembership>> build() async {
    final session = await ref.watch(authSessionControllerProvider.future);
    return session.organizations;
  }

  Future<void> refresh() async {
    await ref.read(authSessionControllerProvider.notifier).refreshOrganizations();
    final organizations =
        ref.read(authSessionControllerProvider).value?.organizations ??
        const <OrganizationMembership>[];
    state = AsyncData<List<OrganizationMembership>>(organizations);
  }
}
