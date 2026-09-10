import 'package:freezed_annotation/freezed_annotation.dart';

part 'organization.freezed.dart';
part 'organization.g.dart';

/// Type d'organisation (tenant SaaS) — référentiel commun §Cibles et
/// §Démarcheurs et gestionnaires informels.
enum OrganizationType {
  @JsonValue('AGENCY')
  agency,
  @JsonValue('INDEPENDENT_LANDLORD')
  independentLandlord,
  @JsonValue('INDEPENDENT_MANAGER')
  independentManager,
}

extension OrganizationTypeLabel on OrganizationType {
  String get label => switch (this) {
        OrganizationType.agency => 'Agence immobilière',
        OrganizationType.independentLandlord => 'Bailleur indépendant',
        OrganizationType.independentManager => 'Gestionnaire indépendant',
      };

  /// Valeur attendue par l'API (`POST /v1/organizations`).
  String get apiValue => switch (this) {
        OrganizationType.agency => 'AGENCY',
        OrganizationType.independentLandlord => 'INDEPENDENT_LANDLORD',
        OrganizationType.independentManager => 'INDEPENDENT_MANAGER',
      };
}

enum OrganizationStatus {
  @JsonValue('ACTIVE')
  active,
  @JsonValue('SUSPENDED')
  suspended,
}

@freezed
abstract class Organization with _$Organization {
  const factory Organization({
    required String id,
    required OrganizationType type,
    required String legalName,
    String? tradeName,
    required String slug,
    required String city,
    String? district,
    required String contactPhone,
    String? contactEmail,
    String? logoUrl,
    required OrganizationStatus status,
    required DateTime createdAt,
  }) = _Organization;

  factory Organization.fromJson(Map<String, dynamic> json) =>
      _$OrganizationFromJson(json);
}
