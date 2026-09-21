import '../entities/property_lead_result.dart';
import '../entities/referral.dart';
import '../entities/referral_commission.dart';
import '../entities/referral_partner.dart';

/// Une page de `GET /v1/referral-partners/me/referrals` ou `.../commissions`
/// (curseur opaque, sur le modèle de `DunningRunsPage`).
class ReferralsPage {
  const ReferralsPage({required this.items, this.nextCursor});

  final List<Referral> items;
  final String? nextCursor;
}

class ReferralCommissionsPage {
  const ReferralCommissionsPage({
    required this.items,
    required this.totals,
    this.nextCursor,
  });

  final List<ReferralCommission> items;
  final ReferralCommissionTotals totals;
  final String? nextCursor;
}

/// Programme d'apport d'affaires (`docs/api/phase10-contract.md`,
/// § Apport d'affaires). Aucune route n'exige `X-Organization-Id` : le
/// partenaire est un rôle dérivé de l'utilisateur authentifié, jamais d'une
/// organisation.
abstract class ReferralRepository {
  Future<ReferralPartner> register({String? displayName});

  Future<ReferralPartner> fetchMe();

  Future<PropertyLeadResult> registerPropertyLead({
    required String landlordPhone,
    String? note,
    String? channel,
  });

  Future<Referral> confirmPropertyLead({
    required String propertyLeadId,
    required String code,
  });

  Future<ReferralsPage> fetchReferrals({String? cursor, int limit = 20});

  Future<ReferralCommissionsPage> fetchCommissions({
    String? cursor,
    int limit = 20,
  });
}
