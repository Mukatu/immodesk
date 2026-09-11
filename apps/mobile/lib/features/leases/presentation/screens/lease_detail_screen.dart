import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../../shared/widgets/money_xaf_text.dart';
import '../../../../shared/widgets/offline_data_banner.dart';
import '../../../../shared/widgets/status_badge.dart';
import '../../domain/entities/deposit.dart';
import '../../domain/entities/deposit_status.dart';
import '../../domain/entities/lease_detail.dart';
import '../../domain/entities/lease_party.dart';
import '../../domain/entities/lease_party_role.dart';
import '../../domain/entities/lease_status.dart';
import '../controllers/lease_detail_controller.dart';
import '../widgets/lease_documents_section.dart';

/// Fiche d'un bail : statut, loyer et charges, échéance, dates, parties,
/// dépôt de garantie et documents (contrat généré/signé, téléchargement et
/// partage) — lecture seule.
class LeaseDetailScreen extends ConsumerWidget {
  const LeaseDetailScreen({super.key, required this.leaseId});

  final String leaseId;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final AsyncValue<LeaseDetailState> stateAsync = ref.watch(
      leaseDetailControllerProvider(leaseId),
    );

    return Scaffold(
      appBar: AppBar(title: const Text('Bail')),
      body: stateAsync.when(
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (error, _) => Center(child: Text('Erreur : $error')),
        data: (state) {
          final LeaseDetail lease = state.detail;
          return RefreshIndicator(
            onRefresh: () => ref
                .read(leaseDetailControllerProvider(leaseId).notifier)
                .refresh(),
            child: ListView(
              key: const ValueKey('lease-detail-list'),
              padding: const EdgeInsets.all(16),
              children: [
                if (state.isFromCache)
                  OfflineDataBanner(cachedAt: state.cachedAt),
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Expanded(
                      child: Text(
                        lease.reference ?? lease.id,
                        style: Theme.of(context).textTheme.headlineSmall,
                      ),
                    ),
                    StatusBadge(
                      label: lease.status.label,
                      tone: lease.status.tone,
                    ),
                  ],
                ),
                const SizedBox(height: 4),
                Text('Lot ${lease.unit.code} · ${lease.property.name}'),
                Text(lease.tenant.displayName),
                const SizedBox(height: 16),
                Text(
                  'Loyer et charges',
                  style: Theme.of(context).textTheme.labelMedium,
                ),
                Row(
                  children: [
                    MoneyXafText(
                      lease.rentAmount,
                      style: Theme.of(context).textTheme.titleLarge,
                    ),
                    const SizedBox(width: 8),
                    if (lease.chargesAmount > 0)
                      Text('+ ${lease.chargesAmount} FCFA de charges'),
                  ],
                ),
                Text('Échéance le ${lease.paymentDueDay} de chaque mois'),
                const SizedBox(height: 16),
                Text('Dates', style: Theme.of(context).textTheme.titleMedium),
                Text('Début : ${lease.startDate}'),
                Text('Fin : ${lease.endDate ?? 'Durée indéterminée'}'),
                const SizedBox(height: 16),
                Text(
                  'Parties au bail',
                  style: Theme.of(context).textTheme.titleMedium,
                ),
                if (lease.parties.isEmpty)
                  const Text('Aucune partie renseignée.')
                else
                  for (final LeaseParty party in lease.parties)
                    Text('${party.role.label} : ${party.displayName}'),
                const SizedBox(height: 16),
                _DepositSection(deposit: lease.deposit),
                const SizedBox(height: 16),
                LeaseDocumentsSection(leaseId: leaseId),
              ],
            ),
          );
        },
      ),
    );
  }
}

class _DepositSection extends StatelessWidget {
  const _DepositSection({required this.deposit});

  final Deposit? deposit;

  @override
  Widget build(BuildContext context) {
    final TextTheme textTheme = Theme.of(context).textTheme;
    if (deposit == null) {
      return Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text('Dépôt de garantie', style: textTheme.titleMedium),
          const Text('Aucun dépôt de garantie renseigné.'),
        ],
      );
    }
    final Deposit d = deposit!;
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            Text('Dépôt de garantie', style: textTheme.titleMedium),
            StatusBadge(label: d.status.label, tone: d.status.tone),
          ],
        ),
        _DepositAmountRow(label: 'Requis', amountXaf: d.requiredAmount),
        _DepositAmountRow(label: 'Encaissé', amountXaf: d.collectedAmount),
        _DepositAmountRow(label: 'Retenu', amountXaf: d.deductedAmount),
        _DepositAmountRow(label: 'Restitué', amountXaf: d.refundedAmount),
        _DepositAmountRow(
          label: 'Solde détenu',
          amountXaf: d.heldAmount,
          emphasize: true,
        ),
      ],
    );
  }
}

class _DepositAmountRow extends StatelessWidget {
  const _DepositAmountRow({
    required this.label,
    required this.amountXaf,
    this.emphasize = false,
  });

  final String label;
  final int amountXaf;
  final bool emphasize;

  @override
  Widget build(BuildContext context) {
    final TextTheme textTheme = Theme.of(context).textTheme;
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 2),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Text(label, style: emphasize ? textTheme.bodyLarge : null),
          MoneyXafText(
            amountXaf,
            style: emphasize
                ? textTheme.bodyLarge?.copyWith(fontWeight: FontWeight.bold)
                : textTheme.bodyMedium,
          ),
        ],
      ),
    );
  }
}
