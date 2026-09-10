import 'package:riverpod_annotation/riverpod_annotation.dart';

import '../../../organizations/presentation/controllers/selected_organization_controller.dart';
import '../../data/portfolio_providers.dart';
import '../../domain/entities/property_detail.dart';

part 'property_detail_controller.g.dart';

class PropertyDetailState {
  const PropertyDetailState({
    required this.detail,
    this.isFromCache = false,
    this.cachedAt,
  });

  final PropertyDetail detail;
  final bool isFromCache;
  final DateTime? cachedAt;
}

/// Détail d'un immeuble (lots + statuts), avec repli hors ligne.
@riverpod
class PropertyDetailController extends _$PropertyDetailController {
  @override
  Future<PropertyDetailState> build(String propertyId) async {
    final String organizationId =
        ref.watch(selectedOrganizationControllerProvider).value ?? '';
    final result = await ref
        .watch(portfolioRepositoryProvider)
        .fetchPropertyDetail(organizationId, propertyId);
    return PropertyDetailState(
      detail: result.data,
      isFromCache: result.isFromCache,
      cachedAt: result.cachedAt,
    );
  }

  Future<void> refresh() async {
    ref.invalidateSelf();
    await future;
  }
}
