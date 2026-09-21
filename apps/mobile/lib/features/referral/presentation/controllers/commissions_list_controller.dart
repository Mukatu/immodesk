import 'package:riverpod_annotation/riverpod_annotation.dart';

import '../../data/referral_providers.dart';
import '../../domain/entities/referral_commission.dart';
import '../../domain/repositories/referral_repository.dart';

part 'commissions_list_controller.g.dart';

/// Liste des commissions du partenaire, avec les totaux par statut (`GET
/// /v1/referral-partners/me/commissions`).
class CommissionsListState {
  const CommissionsListState({
    this.items = const [],
    required this.totals,
    this.nextCursor,
    this.isLoadingMore = false,
  });

  final List<ReferralCommission> items;
  final ReferralCommissionTotals totals;
  final String? nextCursor;
  final bool isLoadingMore;

  bool get hasMore => nextCursor != null;

  static const ReferralCommissionTotals emptyTotals = ReferralCommissionTotals(
    accrued: '0',
    approved: '0',
    paid: '0',
    reversed: '0',
    cancelled: '0',
  );
}

@riverpod
class CommissionsListController extends _$CommissionsListController {
  @override
  Future<CommissionsListState> build() async {
    final ReferralCommissionsPage page = await ref
        .watch(referralRepositoryProvider)
        .fetchCommissions();
    return CommissionsListState(
      items: page.items,
      totals: page.totals,
      nextCursor: page.nextCursor,
    );
  }

  Future<void> loadMore() async {
    final CommissionsListState? current = state.value;
    if (current == null || !current.hasMore || current.isLoadingMore) return;
    state = AsyncData(
      CommissionsListState(
        items: current.items,
        totals: current.totals,
        nextCursor: current.nextCursor,
        isLoadingMore: true,
      ),
    );
    final ReferralCommissionsPage page = await ref
        .read(referralRepositoryProvider)
        .fetchCommissions(cursor: current.nextCursor);
    state = AsyncData(
      CommissionsListState(
        items: [...current.items, ...page.items],
        totals: page.totals,
        nextCursor: page.nextCursor,
      ),
    );
  }

  Future<void> refresh() async {
    ref.invalidateSelf();
    await future;
  }
}
