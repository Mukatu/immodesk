import '../../domain/entities/property_lead_result.dart';
import '../../domain/entities/referral.dart';
import '../../domain/entities/referral_partner.dart';
import '../../domain/repositories/referral_repository.dart';
import '../datasources/referral_remote_data_source.dart';

class ReferralRepositoryImpl implements ReferralRepository {
  ReferralRepositoryImpl(this._remote);

  final ReferralRemoteDataSource _remote;

  @override
  Future<ReferralPartner> register({String? displayName}) =>
      _remote.register(displayName);

  @override
  Future<ReferralPartner> fetchMe() => _remote.fetchMe();

  @override
  Future<PropertyLeadResult> registerPropertyLead({
    required String landlordPhone,
    String? note,
    String? channel,
  }) {
    return _remote.registerPropertyLead(<String, dynamic>{
      'landlordPhone': landlordPhone,
      'note': ?(note != null && note.isNotEmpty ? note : null),
      'channel': ?channel,
    });
  }

  @override
  Future<Referral> confirmPropertyLead({
    required String propertyLeadId,
    required String code,
  }) => _remote.confirmPropertyLead(propertyLeadId, code);

  @override
  Future<ReferralsPage> fetchReferrals({String? cursor, int limit = 20}) =>
      _remote.fetchReferrals(cursor: cursor, limit: limit);

  @override
  Future<ReferralCommissionsPage> fetchCommissions({
    String? cursor,
    int limit = 20,
  }) => _remote.fetchCommissions(cursor: cursor, limit: limit);
}
