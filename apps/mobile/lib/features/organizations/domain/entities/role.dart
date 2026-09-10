import 'package:json_annotation/json_annotation.dart';

/// Rôle d'un membre au sein d'une organisation (référentiel commun §Cibles).
enum Role {
  @JsonValue('OWNER')
  owner,
  @JsonValue('MANAGER')
  manager,
  @JsonValue('COLLECTOR')
  collector,
  @JsonValue('ACCOUNTANT')
  accountant,
  @JsonValue('VIEWER')
  viewer,
}

extension RoleLabel on Role {
  String get label => switch (this) {
        Role.owner => 'Propriétaire',
        Role.manager => 'Gestionnaire',
        Role.collector => 'Démarcheur',
        Role.accountant => 'Comptable',
        Role.viewer => 'Lecture seule',
      };
}
