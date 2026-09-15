import '../../domain/entities/landlord_invitation_result.dart';
import '../../domain/entities/mandate_detail.dart';
import '../../domain/repositories/mandates_repository.dart';
import '../datasources/mandates_remote_data_source.dart';

class MandatesRepositoryImpl implements MandatesRepository {
  MandatesRepositoryImpl(this._remote);

  final MandatesRemoteDataSource _remote;

  @override
  Future<MandateDetail> fetchMandateDetail({
    required String organizationId,
    required String mandateId,
  }) => _remote.fetchMandateDetail(organizationId, mandateId);

  @override
  Future<LandlordInvitationResult> sendLandlordInvitation({
    required String organizationId,
    required String mandateId,
  }) => _remote.sendLandlordInvitation(organizationId, mandateId);
}
