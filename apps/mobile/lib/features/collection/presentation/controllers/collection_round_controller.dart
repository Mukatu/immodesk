import 'package:riverpod_annotation/riverpod_annotation.dart';

import '../../../organizations/presentation/controllers/selected_organization_controller.dart';
import '../../data/collection_providers.dart';
import '../../domain/collection_round.dart';

part 'collection_round_controller.g.dart';

class CollectionRoundState {
  const CollectionRoundState({
    this.groups = const [],
    this.isFromCache = false,
    this.cachedAt,
  });

  final List<CollectionRoundGroup> groups;
  final bool isFromCache;
  final DateTime? cachedAt;

  int get totalDueAmount =>
      groups.fold<int>(0, (sum, group) => sum + group.totalDueAmount);

  int get lateCount =>
      groups.fold<int>(0, (sum, group) => sum + group.lateCount);

  int get invoicesCount =>
      groups.fold<int>(0, (sum, group) => sum + group.invoices.length);
}

/// Tournée du démarcheur : factures dues des lots qui lui sont affectés,
/// regroupées par immeuble. Toujours en ligne en phase 3 (voir
/// `CollectionRepositoryImpl` ; le cache local ne sert qu'à la lecture
/// hors ligne, jamais à l'encaissement).
@riverpod
class CollectionRoundController extends _$CollectionRoundController {
  @override
  Future<CollectionRoundState> build() async {
    final String? organizationId = ref
        .watch(selectedOrganizationControllerProvider)
        .value;
    if (organizationId == null) return const CollectionRoundState();

    final result = await ref
        .watch(collectionRepositoryProvider)
        .fetchDueInvoices(organizationId);
    return CollectionRoundState(
      groups: groupDueInvoicesByProperty(result.data),
      isFromCache: result.isFromCache,
      cachedAt: result.cachedAt,
    );
  }

  Future<void> refresh() async {
    ref.invalidateSelf();
    await future;
  }
}
