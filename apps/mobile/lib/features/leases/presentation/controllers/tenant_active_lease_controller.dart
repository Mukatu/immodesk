import 'package:riverpod_annotation/riverpod_annotation.dart';

import '../../../organizations/presentation/controllers/selected_organization_controller.dart';
import '../../data/leases_providers.dart';
import '../../domain/entities/lease_detail.dart';

part 'tenant_active_lease_controller.g.dart';

class TenantActiveLeaseState {
  const TenantActiveLeaseState({
    this.lease,
    this.isFromCache = false,
    this.cachedAt,
  });

  /// `null` si aucun bail actif n'est rattaché à ce locataire.
  final LeaseDetail? lease;
  final bool isFromCache;
  final DateTime? cachedAt;
}

/// Bail actif (`ACTIVE` ou `NOTICE_GIVEN`) dont ce locataire est le
/// locataire principal, affiché dans sa fiche (`TenantDetailScreen`).
@riverpod
class TenantActiveLeaseController extends _$TenantActiveLeaseController {
  @override
  Future<TenantActiveLeaseState> build(String tenantId) async {
    final String organizationId =
        ref.watch(selectedOrganizationControllerProvider).value ?? '';
    final result = await ref
        .watch(leasesRepositoryProvider)
        .fetchActiveLeaseForTenant(organizationId, tenantId);
    return TenantActiveLeaseState(
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
