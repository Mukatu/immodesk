import 'dart:convert';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/intl.dart';

import '../../../../core/db/app_database.dart';
import '../../../../core/sync/outbox_types.dart';
import '../../../../core/sync/outbox_watch.dart';
import '../../../../shared/widgets/empty_state.dart';
import '../../../../shared/widgets/status_badge.dart';
import '../../../organizations/presentation/controllers/selected_organization_controller.dart';
import '../widgets/outbox_detail_sheet.dart';

/// Écran Outbox (phase 5) : liste des écritures créées hors ligne, avec
/// statut, détail par élément et nouvelle tentative
/// (`docs/api/phase5-contract.md`, `docs/04_plan_de_phases.md` §5.6). La
/// file n'est jamais purgée automatiquement : tout élément `SENT` reste
/// visible dans l'historique.
class OutboxScreen extends ConsumerWidget {
  const OutboxScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final String? organizationId = ref
        .watch(selectedOrganizationControllerProvider)
        .value;

    if (organizationId == null) {
      return Scaffold(
        appBar: AppBar(title: const Text('File d\'attente')),
        body: const EmptyState(
          title: 'Organisation introuvable',
          icon: Icons.sync_problem_outlined,
        ),
      );
    }

    final AsyncValue<List<OutboxRow>> rowsAsync = ref.watch(
      outboxWatchProvider(organizationId),
    );

    return Scaffold(
      appBar: AppBar(title: const Text('File d\'attente')),
      body: rowsAsync.when(
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (error, _) => Center(child: Text('Erreur : $error')),
        data: (rows) {
          if (rows.isEmpty) {
            return const EmptyState(
              title: 'Rien en attente',
              message:
                  'Les encaissements et pièces jointes créés hors ligne '
                  'apparaîtront ici jusqu\'à leur synchronisation.',
              icon: Icons.inbox_outlined,
            );
          }
          final List<OutboxRow> sorted = [...rows]
            ..sort((a, b) => b.createdAt.compareTo(a.createdAt));
          return ListView.separated(
            key: const ValueKey('outbox-list'),
            itemCount: sorted.length,
            separatorBuilder: (_, _) => const Divider(height: 1),
            itemBuilder: (context, index) => _OutboxTile(row: sorted[index]),
          );
        },
      ),
    );
  }
}

class _OutboxTile extends ConsumerWidget {
  const _OutboxTile({required this.row});

  final OutboxRow row;

  Map<String, dynamic> get _payload =>
      jsonDecode(row.payload) as Map<String, dynamic>;

  String get _typeLabel => switch (row.operation) {
    'CASH_RECEIPT' => 'Encaissement espèces',
    'DOCUMENT' => 'Pièce jointe (photo/signature)',
    'INSPECTION_SUBMIT' => 'État des lieux',
    'METER_READING' => 'Relevé de compteur',
    'MAINTENANCE_UPDATE' => 'Mise à jour de maintenance',
    _ => row.operation,
  };

  (String, StatusBadgeTone) get _statusBadge {
    final OutboxStatus status = OutboxStatus.fromDbValue(row.status);
    return switch (status) {
      OutboxStatus.pending => ('En attente', StatusBadgeTone.neutral),
      OutboxStatus.sending => ('En cours d\'envoi', StatusBadgeTone.info),
      OutboxStatus.sent => ('Synchronisé', StatusBadgeTone.success),
      OutboxStatus.failed => ('Échec', StatusBadgeTone.danger),
      OutboxStatus.conflict => ('Conflit', StatusBadgeTone.danger),
    };
  }

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final (String label, StatusBadgeTone tone) = _statusBadge;
    final Object? amount = _payload['amount'];
    final bool isConflict = row.status == OutboxStatus.conflict.dbValue;
    final bool isFailed = row.status == OutboxStatus.failed.dbValue;

    return ListTile(
      key: ValueKey('outbox-item-${row.clientRef}'),
      leading: Icon(
        isConflict
            ? Icons.report_problem_outlined
            : isFailed
            ? Icons.error_outline
            : Icons.receipt_long_outlined,
      ),
      title: Text(
        amount != null ? '$_typeLabel · ${amount.toString()} FCFA' : _typeLabel,
      ),
      subtitle: Text(DateFormat('dd/MM/yyyy à HH:mm').format(row.createdAt)),
      trailing: StatusBadge(label: label, tone: tone),
      onTap: () => _showDetail(context),
    );
  }

  void _showDetail(BuildContext context) {
    showModalBottomSheet<void>(
      context: context,
      builder: (context) => OutboxDetailSheet(row: row),
    );
  }
}
