import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../../core/router/route_paths.dart';
import '../../../../shared/widgets/empty_state.dart';
import '../../../../shared/widgets/money_xaf_text.dart';
import '../../domain/entities/cash_receipt_summary.dart';
import '../../domain/entities/collector_balance.dart';
import '../controllers/ma_caisse_controller.dart';

/// « Ma caisse » : encours détenu, plafond d'organisation avec alerte, et
/// liste des reçus non remis (ancienneté du plus ancien au plus récent).
class MaCaisseScreen extends ConsumerWidget {
  const MaCaisseScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final AsyncValue<MaCaisseState> stateAsync = ref.watch(
      maCaisseControllerProvider,
    );

    return Scaffold(
      appBar: AppBar(
        title: const Text('Ma caisse'),
        actions: [
          IconButton(
            key: const ValueKey('open-remittances-button'),
            icon: const Icon(Icons.receipt_long_outlined),
            tooltip: 'Mes remises',
            onPressed: () => context.push(RoutePaths.cashRemittances),
          ),
        ],
      ),
      body: stateAsync.when(
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (error, _) => Center(child: Text('Erreur : $error')),
        data: (state) {
          return RefreshIndicator(
            onRefresh: () =>
                ref.read(maCaisseControllerProvider.notifier).refresh(),
            child: Column(
              children: [
                if (state.balance != null)
                  _BalanceHeader(balance: state.balance!),
                Expanded(
                  child: state.unremittedReceipts.isEmpty
                      ? ListView(
                          children: const [
                            EmptyState(
                              title: 'Aucun reçu en attente',
                              message: 'Tous vos reçus ont été remis.',
                            ),
                          ],
                        )
                      : ListView.separated(
                          key: const ValueKey('ma-caisse-receipts-list'),
                          padding: const EdgeInsets.all(16),
                          itemCount: state.unremittedReceipts.length,
                          separatorBuilder: (_, _) => const SizedBox(height: 8),
                          itemBuilder: (context, index) => _ReceiptTile(
                            receipt: state.unremittedReceipts[index],
                          ),
                        ),
                ),
              ],
            ),
          );
        },
      ),
      floatingActionButton: FloatingActionButton.extended(
        key: const ValueKey('new-remittance-button'),
        onPressed: () => context.push(RoutePaths.cashRemittanceNew),
        icon: const Icon(Icons.local_atm_outlined),
        label: const Text('Nouvelle remise'),
      ),
    );
  }
}

class _BalanceHeader extends StatelessWidget {
  const _BalanceHeader({required this.balance});

  final CollectorBalance balance;

  @override
  Widget build(BuildContext context) {
    final bool overCap = balance.overCap;
    return Container(
      key: const ValueKey('ma-caisse-balance'),
      width: double.infinity,
      padding: const EdgeInsets.all(16),
      color: overCap
          ? Theme.of(context).colorScheme.errorContainer
          : Theme.of(context).colorScheme.surfaceContainerHighest,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text('Encours détenu', style: Theme.of(context).textTheme.bodySmall),
          MoneyXafText(
            balance.heldAmount,
            style: Theme.of(context).textTheme.headlineSmall,
          ),
          const SizedBox(height: 4),
          Row(
            children: [
              const Text('Plafond : '),
              MoneyXafText(
                balance.capAmount,
                style: const TextStyle(fontSize: 14),
              ),
            ],
          ),
          if (overCap)
            Padding(
              padding: const EdgeInsets.only(top: 8),
              child: Row(
                children: [
                  Icon(
                    Icons.warning_amber_outlined,
                    color: Theme.of(context).colorScheme.error,
                    size: 18,
                  ),
                  const SizedBox(width: 4),
                  Expanded(
                    child: Text(
                      'Plafond dépassé : pensez à remettre vos reçus.',
                      style: TextStyle(
                        color: Theme.of(context).colorScheme.error,
                      ),
                    ),
                  ),
                ],
              ),
            ),
        ],
      ),
    );
  }
}

class _ReceiptTile extends StatelessWidget {
  const _ReceiptTile({required this.receipt});

  final CashReceiptSummary receipt;

  String _ageLabel() {
    final DateTime? received = DateTime.tryParse(receipt.receivedAt);
    if (received == null) return '';
    final int days = DateTime.now().difference(received).inDays;
    if (days <= 0) return "aujourd'hui";
    if (days == 1) return 'hier';
    return 'il y a $days jours';
  }

  @override
  Widget build(BuildContext context) {
    return Card(
      child: ListTile(
        key: ValueKey('cash-receipt-tile-${receipt.id}'),
        title: Text(receipt.receiptNumber),
        subtitle: Text('${receipt.tenant.displayName} · ${_ageLabel()}'),
        trailing: MoneyXafText(receipt.amount),
      ),
    );
  }
}
