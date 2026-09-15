import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../../core/network/api_exception.dart';
import '../../../../shared/widgets/empty_state.dart';
import '../../../../shared/widgets/money_xaf_text.dart';
import '../../../../shared/widgets/status_badge.dart';
import '../../domain/entities/owner_statement_summary.dart';
import '../../domain/entities/statement_status.dart';
import '../controllers/landlord_portal_lists_controllers.dart';
import '../controllers/statement_pdf_delivery_controller.dart';

/// Liste des relevés de gérance du bailleur, avec téléchargement du PDF et
/// partage (`GET /v1/portal/statements`, lecture seule).
class LandlordStatementsScreen extends ConsumerWidget {
  const LandlordStatementsScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final statementsAsync = ref.watch(landlordStatementsProvider);

    return Scaffold(
      appBar: AppBar(title: const Text('Mes relevés de gérance')),
      body: statementsAsync.when(
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (error, _) => Center(
          child: Text(
            error is ApiException ? error.message : 'Une erreur est survenue.',
          ),
        ),
        data: (statements) {
          if (statements.isEmpty) {
            return const EmptyState(
              title: 'Aucun relevé',
              message: 'Vos relevés de gérance apparaîtront ici.',
            );
          }
          return RefreshIndicator(
            onRefresh: () async {
              ref.invalidate(landlordStatementsProvider);
              await ref.read(landlordStatementsProvider.future);
            },
            child: ListView.separated(
              key: const ValueKey('landlord-statements-list'),
              padding: const EdgeInsets.all(16),
              itemCount: statements.length,
              separatorBuilder: (_, _) => const SizedBox(height: 8),
              itemBuilder: (context, index) =>
                  _StatementCard(statement: statements[index]),
            ),
          );
        },
      ),
    );
  }
}

class _StatementCard extends ConsumerWidget {
  const _StatementCard({required this.statement});

  final OwnerStatementSummary statement;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final StatementPdfState pdfState = ref.watch(
      statementPdfDeliveryControllerProvider(statement.id),
    );
    final bool isBusy =
        pdfState.status == StatementPdfStatus.downloading ||
        pdfState.status == StatementPdfStatus.sharing;

    return Card(
      key: ValueKey('landlord-statement-${statement.id}'),
      child: Padding(
        padding: const EdgeInsets.all(12),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Expanded(child: Text(statement.statementNumber)),
                StatusBadge(
                  label: statement.status.label,
                  tone: statement.status.tone,
                ),
              ],
            ),
            Text('${statement.periodStart} → ${statement.periodEnd}'),
            MoneyXafText(statement.netPayableAmount),
            if (pdfState.status == StatementPdfStatus.error)
              Text(
                pdfState.errorMessage ?? 'Une erreur est survenue.',
                style: TextStyle(color: Theme.of(context).colorScheme.error),
              ),
            Align(
              alignment: Alignment.centerRight,
              child: TextButton.icon(
                key: ValueKey('landlord-statement-share-${statement.id}'),
                onPressed: isBusy
                    ? null
                    : () => ref
                          .read(
                            statementPdfDeliveryControllerProvider(
                              statement.id,
                            ).notifier,
                          )
                          .downloadAndShare(),
                icon: const Icon(Icons.share_outlined),
                label: const Text('Télécharger / partager'),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
