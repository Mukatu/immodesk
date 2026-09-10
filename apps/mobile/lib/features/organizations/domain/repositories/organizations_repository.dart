import '../entities/organization.dart';
import '../entities/organization_membership.dart';

abstract interface class OrganizationsRepository {
  Future<List<OrganizationMembership>> listMyOrganizations();

  Future<Organization> createOrganization({
    required OrganizationType type,
    required String legalName,
    String? tradeName,
    required String city,
    String? district,
    required String contactPhone,
    String? contactEmail,
  });
}
