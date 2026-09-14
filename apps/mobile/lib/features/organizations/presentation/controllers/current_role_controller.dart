import 'package:riverpod_annotation/riverpod_annotation.dart';

import '../../domain/entities/organization_membership.dart';
import '../../domain/entities/role.dart';
import 'organizations_controller.dart';
import 'selected_organization_controller.dart';

part 'current_role_controller.g.dart';

/// Rôle de l'utilisateur dans l'organisation courante — dérivé de la liste
/// des appartenances (`GET /v1/me`) et de l'organisation sélectionnée
/// localement. `null` tant que l'un des deux n'est pas encore résolu.
@riverpod
Future<Role?> currentRole(Ref ref) async {
  final String? organizationId = await ref.watch(
    selectedOrganizationControllerProvider.future,
  );
  if (organizationId == null) return null;
  final List<OrganizationMembership> memberships = await ref.watch(
    organizationsControllerProvider.future,
  );
  for (final OrganizationMembership membership in memberships) {
    if (membership.organization.id == organizationId) return membership.role;
  }
  return null;
}

/// Mode démarcheur restreint (`docs/04_plan_de_phases.md` §5.3, épic 5.D) :
/// un `COLLECTOR` ne voit que sa tournée, ses reçus et sa caisse, jamais le
/// portefeuille complet de l'organisation (onglets Immeubles/Locataires,
/// liste de tous les baux).
@riverpod
Future<bool> isCollectorMode(Ref ref) async {
  final Role? role = await ref.watch(currentRoleProvider.future);
  return role == Role.collector;
}
