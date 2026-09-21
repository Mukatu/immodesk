import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../../shared/widgets/empty_state.dart';
import '../../../../shared/widgets/money_xaf_text.dart';
import '../../domain/entities/referral_commission.dart';
import '../controllers/commissions_list_controller.dart';

/// Liste des commissions du partenaire, avec les totaux par statut (`GET
/// /v1/referral-partners/me/commissions`).
class CommissionsListScreen extends ConsumerWidget {
  const CommissionsListScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final AsyncValue<CommissionsListState> stateAsync = ref.watch(
      commissionsListControllerProvider,
    );

    return Scaffold(
      appBar: AppBar(title: const Text('Mes commissions')),
      body: stateAsync.when(
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (error, _) => EmptyState(
          icon: Icons.wifi_off_outlined,
          title: 'Connexion requise',
          message: 'Impossible de charger les commissions : $error',
        ),
        data: (state) => RefreshIndicator(
          onRefresh: () =>
              ref.read(commissionsListControllerProvider.notifier).refresh(),
          child: ListView(
            key: const ValueKey('commissions-list'),
            padding: const EdgeInsets.all(16),
            children: [
              _TotalsCard(totals: state.totals),
              const SizedBox(height: 16),
              if (state.items.isEmpty)
                const EmptyState(
                  icon: Icons.payments_outlined,
                  title: 'Aucune commission pour le moment',
                  message: 'Vos commissions apparaîtront ici.',
                )
              else
                ...state.items.map(
                  (ReferralCommission c) => Card(
                    child: ListTile(
                      title: MoneyXafText(
                        int.tryParse(c.commissionAmount) ?? 0,
                      ),
                      subtitle: Text('${c.rateBps / 100} % — ${c.accruedAt}'),
                      trailing: Chip(label: Text(c.status.label)),
                    ),
                  ),
                ),
              if (state.hasMore)
                Center(
                  child: TextButton(
                    onPressed: state.isLoadingMore
                        ? null
                        : () => ref
                              .read(commissionsListControllerProvider.notifier)
                              .loadMore(),
                    child: state.isLoadingMore
                        ? const CircularProgressIndicator()
                        : const Text('Charger plus'),
                  ),
                ),
            ],
          ),
        ),
      ),
    );
  }
}

class _TotalsCard extends StatelessWidget {
  const _TotalsCard({required this.totals});

  final ReferralCommissionTotals totals;

  @override
  Widget build(BuildContext context) {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text('Totaux', style: Theme.of(context).textTheme.titleMedium),
            const SizedBox(height: 8),
            _totalRow('Comptabilisées', totals.accrued),
            _totalRow('Approuvées', totals.approved),
            _totalRow('Versées', totals.paid),
            _totalRow('Contre-passées', totals.reversed),
          ],
        ),
      ),
    );
  }

  Widget _totalRow(String label, String amount) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 2),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [Text(label), MoneyXafText(int.tryParse(amount) ?? 0)],
      ),
    );
  }
}
