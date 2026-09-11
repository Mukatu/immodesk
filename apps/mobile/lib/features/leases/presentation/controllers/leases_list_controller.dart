import 'package:riverpod_annotation/riverpod_annotation.dart';

import '../../../organizations/presentation/controllers/selected_organization_controller.dart';
import '../../data/leases_providers.dart';
import '../../domain/entities/lease_status.dart';
import '../../domain/entities/lease_summary.dart';

part 'leases_list_controller.g.dart';

class LeasesListState {
  const LeasesListState({
    this.allLeases = const [],
    this.isFromCache = false,
    this.cachedAt,
    this.statusFilter,
  });

  final List<LeaseSummary> allLeases;
  final bool isFromCache;
  final DateTime? cachedAt;

  /// `null` = tous les statuts.
  final LeaseStatus? statusFilter;

  /// Filtrage local par statut, sans appel réseau supplémentaire :
  /// fonctionne aussi bien en ligne qu'à partir de la dernière copie mise
  /// en cache (même principe que la recherche des locataires).
  List<LeaseSummary> get filteredLeases {
    if (statusFilter == null) return allLeases;
    return allLeases.where((lease) => lease.status == statusFilter).toList();
  }

  LeasesListState copyWith({
    LeaseStatus? statusFilter,
    bool clearFilter = false,
  }) {
    return LeasesListState(
      allLeases: allLeases,
      isFromCache: isFromCache,
      cachedAt: cachedAt,
      statusFilter: clearFilter ? null : (statusFilter ?? this.statusFilter),
    );
  }
}

/// Liste des baux de l'organisation, avec filtre local par statut.
@riverpod
class LeasesListController extends _$LeasesListController {
  @override
  Future<LeasesListState> build() async {
    final String? organizationId = ref
        .watch(selectedOrganizationControllerProvider)
        .value;
    if (organizationId == null) return const LeasesListState();

    final result = await ref
        .watch(leasesRepositoryProvider)
        .fetchLeases(organizationId);
    return LeasesListState(
      allLeases: result.data,
      isFromCache: result.isFromCache,
      cachedAt: result.cachedAt,
    );
  }

  /// `null` réinitialise le filtre (tous les statuts).
  void setStatusFilter(LeaseStatus? status) {
    final LeasesListState? current = state.value;
    if (current == null) return;
    state = AsyncData<LeasesListState>(
      current.copyWith(statusFilter: status, clearFilter: status == null),
    );
  }

  Future<void> refresh() async {
    ref.invalidateSelf();
    await future;
  }
}
