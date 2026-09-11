import 'package:riverpod_annotation/riverpod_annotation.dart';

import '../../../organizations/presentation/controllers/selected_organization_controller.dart';
import '../../data/leases_providers.dart';
import '../../domain/entities/lease_detail.dart';

part 'lease_detail_controller.g.dart';

class LeaseDetailState {
  const LeaseDetailState({
    required this.detail,
    this.isFromCache = false,
    this.cachedAt,
  });

  final LeaseDetail detail;
  final bool isFromCache;
  final DateTime? cachedAt;
}

/// Détail complet d'un bail (fiche bail), accessible depuis la liste des
/// baux ou depuis les fiches lot/locataire.
@riverpod
class LeaseDetailController extends _$LeaseDetailController {
  @override
  Future<LeaseDetailState> build(String leaseId) async {
    final String organizationId =
        ref.watch(selectedOrganizationControllerProvider).value ?? '';
    final result = await ref
        .watch(leasesRepositoryProvider)
        .fetchLeaseDetail(organizationId, leaseId);
    return LeaseDetailState(
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
