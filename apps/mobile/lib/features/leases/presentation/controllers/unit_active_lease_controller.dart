import 'package:riverpod_annotation/riverpod_annotation.dart';

import '../../../organizations/presentation/controllers/selected_organization_controller.dart';
import '../../data/leases_providers.dart';
import '../../domain/entities/lease_detail.dart';

part 'unit_active_lease_controller.g.dart';

class UnitActiveLeaseState {
  const UnitActiveLeaseState({
    this.lease,
    this.isFromCache = false,
    this.cachedAt,
  });

  /// `null` si aucun bail actif n'est rattaché à ce lot.
  final LeaseDetail? lease;
  final bool isFromCache;
  final DateTime? cachedAt;
}

/// Bail actif (`ACTIVE` ou `NOTICE_GIVEN`) rattaché à un lot, affiché dans
/// la fiche du lot (`UnitDetailScreen`).
@riverpod
class UnitActiveLeaseController extends _$UnitActiveLeaseController {
  @override
  Future<UnitActiveLeaseState> build(String unitId) async {
    final String organizationId =
        ref.watch(selectedOrganizationControllerProvider).value ?? '';
    final result = await ref
        .watch(leasesRepositoryProvider)
        .fetchActiveLeaseForUnit(organizationId, unitId);
    return UnitActiveLeaseState(
      lease: result.data,
      isFromCache: result.isFromCache,
      cachedAt: result.cachedAt,
    );
  }

  Future<void> refresh() async {
    ref.invalidateSelf();
    await future;
  }
}
