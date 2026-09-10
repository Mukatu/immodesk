import '../../domain/entities/organization.dart';
import '../../domain/entities/organization_membership.dart';
import '../../domain/repositories/organizations_repository.dart';
import '../datasources/organizations_remote_data_source.dart';

class OrganizationsRepositoryImpl implements OrganizationsRepository {
  OrganizationsRepositoryImpl(this._remote);

  final OrganizationsRemoteDataSource _remote;

  @override
  Future<List<OrganizationMembership>> listMyOrganizations() {
    return _remote.listMine();
  }

  @override
  Future<Organization> createOrganization({
    required OrganizationType type,
    required String legalName,
    String? tradeName,
    required String city,
    String? district,
    required String contactPhone,
    String? contactEmail,
  }) {
    return _remote.create(
      type: type,
      legalName: legalName,
      tradeName: tradeName,
      city: city,
      district: district,
      contactPhone: contactPhone,
      contactEmail: contactEmail,
    );
  }
}
