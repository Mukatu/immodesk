import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../../core/network/api_exception.dart';
import '../../../../shared/widgets/empty_state.dart';
import '../../../../shared/widgets/money_xaf_text.dart';
import '../../../../shared/widgets/status_badge.dart';
import '../../domain/entities/owner_payout.dart';
import '../../domain/entities/payment_method.dart';
import '../../domain/entities/payout_status.dart';
import '../controllers/landlord_portal_lists_controllers.dart';

/// Historique des reversements perçus par le bailleur, avec date, montant
/// net et mode (`GET /v1/portal/payouts`, lecture seule).
class LandlordPayoutsScreen extends ConsumerWidget {
  const LandlordPayoutsScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final payoutsAsync = ref.watch(landlordPayoutsProvider);

    return Scaffold(
      appBar: AppBar(title: const Text('Mes reversements')),
      body: payoutsAsync.when(
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (error, _) => Center(
          child: Text(
            error is ApiException ? error.message : 'Une erreur est survenue.',
          ),
        ),
        data: (payouts) {
          if (payouts.isEmpty) {
            return const EmptyState(
              title: 'Aucun reversement',
              message: 'Vos reversements perçus apparaîtront ici.',
            );
          }
          return RefreshIndicator(
            onRefresh: () async {
              ref.invalidate(landlordPayoutsProvider);
              await ref.read(landlordPayoutsProvider.future);
            },
            child: ListView.separated(
              key: const ValueKey('landlord-payouts-list'),
              padding: const EdgeInsets.all(16),
              itemCount: payouts.length,
              separatorBuilder: (_, _) => const SizedBox(height: 8),
              itemBuilder: (context, index) =>
                  _PayoutCard(payout: payouts[index]),
            ),
          );
        },
      ),
    );
  }
}

class _PayoutCard extends StatelessWidget {
  const _PayoutCard({required this.payout});

  final OwnerPayout payout;

  @override
  Widget build(BuildContext context) {
    return Card(
      key: ValueKey('landlord-payout-${payout.id}'),
      child: ListTile(
        title: Text(payout.reference),
        subtitle: Text(
          '${payout.method.label} · ${payout.paidAt ?? payout.scheduledDate ?? 'date à confirmer'}',
        ),
        trailing: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          crossAxisAlignment: CrossAxisAlignment.end,
          children: [
            MoneyXafText(payout.netAmount),
            StatusBadge(label: payout.status.label, tone: payout.status.tone),
          ],
        ),
      ),
    );
  }
}
