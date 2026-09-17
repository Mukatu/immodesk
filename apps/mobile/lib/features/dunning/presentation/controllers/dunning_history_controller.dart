import 'package:riverpod_annotation/riverpod_annotation.dart';

import '../../../organizations/presentation/controllers/selected_organization_controller.dart';
import '../../data/dunning_providers.dart';
import '../../domain/entities/dunning_run.dart';

part 'dunning_history_controller.g.dart';

class DunningHistoryState {
  const DunningHistoryState({
    this.runs = const [],
    this.isFromCache = false,
    this.cachedAt,
  });

  final List<DunningRun> runs;
  final bool isFromCache;
  final DateTime? cachedAt;
}

/// Historique des relances envoyées à un locataire (`feature dunning`,
/// phase 9), consultable depuis sa fiche ou depuis une facture de la
/// tournée. Toujours trié du plus récent au plus ancien (voir
/// `DunningRepositoryImpl`).
@riverpod
class DunningHistoryController extends _$DunningHistoryController {
  @override
  Future<DunningHistoryState> build(String tenantId, String? invoiceId) async {
    final String? organizationId = ref
        .watch(selectedOrganizationControllerProvider)
        .value;
    if (organizationId == null) return const DunningHistoryState();

    final result = await ref
        .watch(dunningRepositoryProvider)
        .fetchHistoryForTenant(
          organizationId: organizationId,
          tenantId: tenantId,
          invoiceId: invoiceId,
        );
    return DunningHistoryState(
      runs: result.data,
      isFromCache: result.isFromCache,
      cachedAt: result.cachedAt,
    );
  }

  Future<void> refresh() async {
    ref.invalidateSelf();
    await future;
  }
}
