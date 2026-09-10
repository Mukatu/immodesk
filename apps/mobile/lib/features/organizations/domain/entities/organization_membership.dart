import 'package:freezed_annotation/freezed_annotation.dart';

import 'organization.dart';
import 'role.dart';

part 'organization_membership.freezed.dart';
part 'organization_membership.g.dart';

/// Appartenance d'un utilisateur à une organisation, avec son rôle.
@freezed
abstract class OrganizationMembership with _$OrganizationMembership {
  const factory OrganizationMembership({
    required Organization organization,
    required Role role,
    required DateTime joinedAt,
  }) = _OrganizationMembership;

  factory OrganizationMembership.fromJson(Map<String, dynamic> json) =>
      _$OrganizationMembershipFromJson(json);
}
