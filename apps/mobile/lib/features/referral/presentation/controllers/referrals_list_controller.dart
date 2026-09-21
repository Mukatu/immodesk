import 'package:riverpod_annotation/riverpod_annotation.dart';

import '../../data/referral_providers.dart';
import '../../domain/entities/referral.dart';
import '../../domain/repositories/referral_repository.dart';

part 'referrals_list_controller.g.dart';

/// Liste des filleuls du partenaire (`GET
/// /v1/referral-partners/me/referrals`), avec pagination par curseur.
class ReferralsListState {
  const ReferralsListState({
    this.items = const [],
    this.nextCursor,
    this.isLoadingMore = false,
  });

  final List<Referral> items;
  final String? nextCursor;
  final bool isLoadingMore;

  bool get hasMore => nextCursor != null;
}

@riverpod
class ReferralsListController extends _$ReferralsListController {
  @override
  Future<ReferralsListState> build() async {
    final ReferralsPage page = await ref
        .watch(referralRepositoryProvider)
        .fetchReferrals();
    return ReferralsListState(items: page.items, nextCursor: page.nextCursor);
  }

  Future<void> loadMore() async {
    final ReferralsListState? current = state.value;
    if (current == null || !current.hasMore || current.isLoadingMore) return;
    state = AsyncData(
      ReferralsListState(
        items: current.items,
        nextCursor: current.nextCursor,
        isLoadingMore: true,
      ),
    );
    final ReferralsPage page = await ref
        .read(referralRepositoryProvider)
        .fetchReferrals(cursor: current.nextCursor);
    state = AsyncData(
      ReferralsListState(
        items: [...current.items, ...page.items],
        nextCursor: page.nextCursor,
      ),
    );
  }

  Future<void> refresh() async {
    ref.invalidateSelf();
    await future;
  }
}
