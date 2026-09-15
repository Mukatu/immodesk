import '../entities/collection_view.dart';
import '../entities/owner_payout.dart';
import '../entities/owner_statement_summary.dart';
import '../entities/portal_profile.dart';
import '../entities/receipt_summary.dart';

/// Port d'accès au portail bailleur (`docs/api/phase7-contract.md`,
/// section « Portail bailleur »). Toutes les routes sont en lecture seule
/// et limitées au bailleur authentifié (rôle dérivé `LANDLORD_PORTAL`) :
/// aucune méthode d'écriture n'existe sur ce port, par construction.
abstract interface class LandlordPortalRepository {
  /// `GET /v1/portal/me`. Lance une [ApiException] `403`/`404` si le
  /// compte connecté n'est pas un compte bailleur — utilisé pour détecter
  /// l'espace applicable après connexion.
  Future<PortalProfile> fetchMe();

  Future<List<OwnerStatementSummary>> fetchStatements();

  /// `GET /v1/portal/statements/{id}/pdf` : URL signée de téléchargement.
  Future<String> fetchStatementPdfUrl(String statementId);

  Future<List<OwnerPayout>> fetchPayouts();

  Future<List<CollectionView>> fetchCollections();

  Future<List<ReceiptSummary>> fetchReceipts();
}
