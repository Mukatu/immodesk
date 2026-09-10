import 'package:riverpod_annotation/riverpod_annotation.dart';

import '../../../../core/format/text_normalize.dart';
import '../../../organizations/presentation/controllers/selected_organization_controller.dart';
import '../../data/portfolio_providers.dart';
import '../../domain/entities/tenant.dart';

part 'tenants_list_controller.g.dart';

class TenantsListState {
  const TenantsListState({
    this.allTenants = const [],
    this.isFromCache = false,
    this.cachedAt,
    this.query = '',
  });

  final List<Tenant> allTenants;
  final bool isFromCache;
  final DateTime? cachedAt;
  final String query;

  /// Filtrage local (nom ou téléphone), insensible aux accents/casse,
  /// sans aucun appel réseau : fonctionne aussi bien en ligne qu'à partir
  /// de la dernière copie mise en cache.
  List<Tenant> get filteredTenants {
    if (query.trim().isEmpty) return allTenants;
    final String normalizedQuery = normalizeSearchText(query);
    return allTenants.where((tenant) {
      final String haystack = normalizeSearchText(
        '${tenant.displayName} ${tenant.primaryPhone} ${tenant.whatsappPhone ?? ''}',
      );
      return haystack.contains(normalizedQuery);
    }).toList();
  }

  TenantsListState copyWith({String? query}) {
    return TenantsListState(
      allTenants: allTenants,
      isFromCache: isFromCache,
      cachedAt: cachedAt,
      query: query ?? this.query,
    );
  }
}

/// Liste des locataires avec recherche locale par nom ou téléphone.
@riverpod
class TenantsListController extends _$TenantsListController {
  @override
  Future<TenantsListState> build() async {
    final String? organizationId = ref
        .watch(selectedOrganizationControllerProvider)
        .value;
    if (organizationId == null) return const TenantsListState();

    final result = await ref
        .watch(portfolioRepositoryProvider)
        .fetchTenants(organizationId);
    return TenantsListState(
      allTenants: result.data,
      isFromCache: result.isFromCache,
      cachedAt: result.cachedAt,
    );
  }

  void updateQuery(String query) {
    final TenantsListState? current = state.value;
    if (current == null) return;
    state = AsyncData<TenantsListState>(current.copyWith(query: query));
  }

  Future<void> refresh() async {
    ref.invalidateSelf();
    await future;
  }
}
