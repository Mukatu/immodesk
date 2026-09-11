import 'package:riverpod_annotation/riverpod_annotation.dart';

import '../../../auth/presentation/controllers/auth_session_controller.dart';
import '../../../organizations/presentation/controllers/selected_organization_controller.dart';
import '../../data/cash_providers.dart';
import '../../domain/cash_balance.dart';
import '../../domain/entities/cash_receipt_summary.dart';
import '../../domain/entities/collector_balance.dart';

part 'ma_caisse_controller.g.dart';

class MaCaisseState {
  const MaCaisseState({this.balance, this.unremittedReceipts = const []});

  final CollectorBalance? balance;
  final List<CashReceiptSummary> unremittedReceipts;
}

/// « Ma caisse » : encours détenu par le démarcheur courant (calculé côté
/// serveur, `GET /cash/collectors/{userId}/balance`) et liste de ses reçus
/// non remis, triés du plus ancien au plus récent.
@riverpod
class MaCaisseController extends _$MaCaisseController {
  @override
  Future<MaCaisseState> build() async {
    final String? organizationId = ref
        .watch(selectedOrganizationControllerProvider)
        .value;
    final String? userId = ref
        .watch(authSessionControllerProvider)
        .value
        ?.user
        ?.id;
    if (organizationId == null || userId == null) {
      return const MaCaisseState();
    }

    final repository = ref.watch(cashRepositoryProvider);
    final CollectorBalance balance = await repository.fetchCollectorBalance(
      organizationId: organizationId,
      userId: userId,
    );
    final List<CashReceiptSummary> receipts = await repository
        .fetchMyCashReceipts(organizationId);

    return MaCaisseState(
      balance: balance,
      unremittedReceipts: unremittedReceiptsOldestFirst(receipts),
    );
  }

  Future<void> refresh() async {
    ref.invalidateSelf();
    await future;
  }
}
