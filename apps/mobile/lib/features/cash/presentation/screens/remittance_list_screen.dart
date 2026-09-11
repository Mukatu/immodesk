import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../../shared/widgets/empty_state.dart';
import '../../../../shared/widgets/money_xaf_text.dart';
import '../../../../shared/widgets/status_badge.dart';
import '../../domain/entities/remittance_status.dart';
import '../../domain/entities/remittance_summary.dart';
import '../controllers/remittance_list_controller.dart';

/// Suivi des remises : statuts et écart constaté par l'agence lors de la
/// vérification (`varianceAmount = countedAmount - expectedAmount`).
class RemittanceListScreen extends ConsumerWidget {
  const RemittanceListScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final AsyncValue<RemittanceListState> stateAsync = ref.watch(
      remittanceListControllerProvider,
    );

    return Scaffold(
      appBar: AppBar(title: const Text('Mes remises')),
      body: stateAsync.when(
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (error, _) => Center(child: Text('Erreur : $error')),
        data: (state) {
          return RefreshIndicator(
            onRefresh: () =>
                ref.read(remittanceListControllerProvider.notifier).refresh(),
            child: state.items.isEmpty
                ? ListView(
                    children: const [
                      EmptyState(
                        title: 'Aucune remise',
                        message: "Vous n'avez pas encore soumis de remise.",
                      ),
                    ],
                  )
                : ListView.separated(
                    key: const ValueKey('remittances-list'),
                    padding: const EdgeInsets.all(16),
                    itemCount: state.items.length,
                    separatorBuilder: (_, _) => const SizedBox(height: 8),
                    itemBuilder: (context, index) =>
                        _RemittanceTile(remittance: state.items[index]),
                  ),
          );
        },
      ),
    );
  }
}

class _RemittanceTile extends StatelessWidget {
  const _RemittanceTile({required this.remittance});

  final RemittanceSummary remittance;

  @override
  Widget build(BuildContext context) {
    final bool hasVariance =
        remittance.status == RemittanceStatus.verified &&
        remittance.varianceAmount != 0;
    return Card(
      key: ValueKey('remittance-tile-${remittance.id}'),
      child: ListTile(
        title: Text(remittance.reference),
        subtitle: Text('${remittance.receiptsCount} reçu(s)'),
        trailing: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          crossAxisAlignment: CrossAxisAlignment.end,
          children: [
            StatusBadge(
              label: remittance.status.label,
              tone: remittance.status.tone,
            ),
            const SizedBox(height: 4),
            MoneyXafText(remittance.declaredAmount),
            if (hasVariance)
              Text(
                'Écart : ${remittance.varianceAmount > 0 ? '+' : ''}'
                '${remittance.varianceAmount} FCFA',
                style: TextStyle(
                  color: Theme.of(context).colorScheme.error,
                  fontSize: 12,
                ),
              ),
          ],
        ),
      ),
    );
  }
}
