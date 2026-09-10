import 'package:riverpod_annotation/riverpod_annotation.dart';

import '../../../organizations/presentation/controllers/selected_organization_controller.dart';
import '../../data/portfolio_providers.dart';
import '../../domain/entities/unit_detail.dart';

part 'unit_detail_controller.g.dart';

class UnitDetailState {
  const UnitDetailState({
    required this.detail,
    this.isFromCache = false,
    this.cachedAt,
  });

  final UnitDetail detail;
  final bool isFromCache;
  final DateTime? cachedAt;
}

/// Détail d'un lot (caractéristiques, loyer de référence, photos), avec
/// repli hors ligne si ce lot a déjà été consulté en ligne.
@riverpod
class UnitDetailController extends _$UnitDetailController {
  @override
  Future<UnitDetailState> build(String unitId) async {
    final String organizationId =
        ref.watch(selectedOrganizationControllerProvider).value ?? '';
    final result = await ref
        .watch(portfolioRepositoryProvider)
        .fetchUnitDetail(organizationId, unitId);
    return UnitDetailState(
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
