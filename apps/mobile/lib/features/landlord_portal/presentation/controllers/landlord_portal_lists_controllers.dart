import 'package:riverpod_annotation/riverpod_annotation.dart';

import '../../data/landlord_portal_providers.dart';
import '../../domain/entities/collection_view.dart';
import '../../domain/entities/owner_payout.dart';
import '../../domain/entities/owner_statement_summary.dart';
import '../../domain/entities/receipt_summary.dart';

part 'landlord_portal_lists_controllers.g.dart';

@riverpod
Future<List<OwnerStatementSummary>> landlordStatements(Ref ref) {
  return ref.watch(landlordPortalRepositoryProvider).fetchStatements();
}

@riverpod
Future<List<OwnerPayout>> landlordPayouts(Ref ref) {
  return ref.watch(landlordPortalRepositoryProvider).fetchPayouts();
}

@riverpod
Future<List<CollectionView>> landlordCollections(Ref ref) {
  return ref.watch(landlordPortalRepositoryProvider).fetchCollections();
}

@riverpod
Future<List<ReceiptSummary>> landlordReceipts(Ref ref) {
  return ref.watch(landlordPortalRepositoryProvider).fetchReceipts();
}
