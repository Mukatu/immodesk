import '../entities/landlord_invitation_result.dart';
import '../entities/mandate_detail.dart';

/// Port d'accès aux mandats de gestion (`docs/api/phase7-contract.md`).
/// Périmètre mobile volontairement restreint à la fiche mandat et à
/// l'invitation du bailleur (la liste/création des mandats reste un écran
/// web, hors périmètre de ce lot mobile).
abstract interface class MandatesRepository {
  Future<MandateDetail> fetchMandateDetail({
    required String organizationId,
    required String mandateId,
  });

  Future<LandlordInvitationResult> sendLandlordInvitation({
    required String organizationId,
    required String mandateId,
  });
}
