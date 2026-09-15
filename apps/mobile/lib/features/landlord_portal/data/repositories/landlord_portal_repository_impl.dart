import '../../domain/entities/collection_view.dart';
import '../../domain/entities/owner_payout.dart';
import '../../domain/entities/owner_statement_summary.dart';
import '../../domain/entities/portal_profile.dart';
import '../../domain/entities/receipt_summary.dart';
import '../../domain/repositories/landlord_portal_repository.dart';
import '../datasources/landlord_portal_remote_data_source.dart';

class LandlordPortalRepositoryImpl implements LandlordPortalRepository {
  LandlordPortalRepositoryImpl(this._remote);

  final LandlordPortalRemoteDataSource _remote;

  @override
  Future<PortalProfile> fetchMe() => _remote.fetchMe();

  @override
  Future<List<OwnerStatementSummary>> fetchStatements() =>
      _remote.fetchStatements();

  @override
  Future<String> fetchStatementPdfUrl(String statementId) =>
      _remote.fetchStatementPdfUrl(statementId);

  @override
  Future<List<OwnerPayout>> fetchPayouts() => _remote.fetchPayouts();

  @override
  Future<List<CollectionView>> fetchCollections() => _remote.fetchCollections();

  @override
  Future<List<ReceiptSummary>> fetchReceipts() => _remote.fetchReceipts();
}
