import 'package:riverpod_annotation/riverpod_annotation.dart';

import '../../../organizations/presentation/controllers/selected_organization_controller.dart';
import '../../data/cash_providers.dart';
import '../../domain/entities/remittance_summary.dart';

part 'remittance_list_controller.g.dart';

class RemittanceListState {
  const RemittanceListState({this.items = const []});

  final List<RemittanceSummary> items;
}

/// Suivi des remises du démarcheur : statut et écart constaté par
/// l'agence (`varianceAmount`, renseigné après vérification).
@riverpod
class RemittanceListController extends _$RemittanceListController {
  @override
  Future<RemittanceListState> build() async {
    final String? organizationId = ref
        .watch(selectedOrganizationControllerProvider)
        .value;
    if (organizationId == null) return const RemittanceListState();

    final List<RemittanceSummary> items = await ref
        .watch(cashRepositoryProvider)
        .fetchMyRemittances(organizationId);
    return RemittanceListState(items: items);
  }

  Future<void> refresh() async {
    ref.invalidateSelf();
    await future;
  }
}
