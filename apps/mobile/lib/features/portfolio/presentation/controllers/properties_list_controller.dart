import 'package:riverpod_annotation/riverpod_annotation.dart';

import '../../../organizations/presentation/controllers/selected_organization_controller.dart';
import '../../data/portfolio_providers.dart';
import '../../domain/entities/property_summary.dart';

part 'properties_list_controller.g.dart';

class PropertiesListState {
  const PropertiesListState({
    this.items = const [],
    this.isFromCache = false,
    this.cachedAt,
  });

  final List<PropertySummary> items;
  final bool isFromCache;
  final DateTime? cachedAt;
}

/// Liste des immeubles avec taux d'occupation. Tente un rafraîchissement
/// réseau à l'ouverture, avec repli automatique sur le cache local Drift
/// en cas d'échec (voir `PortfolioRepositoryImpl`).
@riverpod
class PropertiesListController extends _$PropertiesListController {
  @override
  Future<PropertiesListState> build() async {
    final String? organizationId = ref
        .watch(selectedOrganizationControllerProvider)
        .value;
    if (organizationId == null) return const PropertiesListState();

    final result = await ref
        .watch(portfolioRepositoryProvider)
        .fetchProperties(organizationId);
    return PropertiesListState(
      items: result.data,
      isFromCache: result.isFromCache,
      cachedAt: result.cachedAt,
    );
  }

  Future<void> refresh() async {
    ref.invalidateSelf();
    await future;
  }
}
