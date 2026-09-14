import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../../core/db/app_database.dart';
import '../../../../core/sync/outbox_types.dart';
import '../controllers/outbox_controller.dart';

/// Détail d'un élément de l'outbox : statut, message d'erreur en français,
/// et — pour un conflit — l'explication qu'un mobile ne peut jamais
/// résoudre lui-même (`docs/api/phase5-contract.md`).
class OutboxDetailSheet extends ConsumerStatefulWidget {
  const OutboxDetailSheet({super.key, required this.row});

  final OutboxRow row;

  @override
  ConsumerState<OutboxDetailSheet> createState() => _OutboxDetailSheetState();
}

class _OutboxDetailSheetState extends ConsumerState<OutboxDetailSheet> {
  bool _retrying = false;

  @override
  Widget build(BuildContext context) {
    final OutboxRow row = widget.row;
    final bool isConflict = row.status == OutboxStatus.conflict.dbValue;
    final bool isFailed = row.status == OutboxStatus.failed.dbValue;

    return SafeArea(
      child: Padding(
        padding: const EdgeInsets.all(20),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              row.operation == 'CASH_RECEIPT'
                  ? 'Encaissement en attente'
                  : 'Pièce jointe en attente',
              style: Theme.of(context).textTheme.titleMedium,
            ),
            const SizedBox(height: 4),
            Text('Référence locale : ${row.clientRef}'),
            const SizedBox(height: 12),
            if (row.lastErrorMessage != null) ...[
              Text(
                row.lastErrorMessage!,
                key: const ValueKey('outbox-detail-error-message'),
                style: TextStyle(color: Theme.of(context).colorScheme.error),
              ),
              const SizedBox(height: 8),
            ],
            if (isConflict)
              Text(
                'Ce conflit ne peut être tranché que par un gestionnaire, '
                'depuis le tableau de bord. Il reste visible ici sans '
                'bloquer le reste de votre travail.',
                key: const ValueKey('outbox-detail-conflict-explanation'),
                style: Theme.of(context).textTheme.bodyMedium,
              ),
            if (isFailed) ...[
              const SizedBox(height: 16),
              FilledButton.icon(
                key: const ValueKey('outbox-detail-retry-button'),
                onPressed: _retrying
                    ? null
                    : () async {
                        setState(() => _retrying = true);
                        await ref
                            .read(outboxControllerProvider.notifier)
                            .retry(row.clientRef);
                        if (context.mounted) Navigator.of(context).pop();
                      },
                icon: const Icon(Icons.refresh),
                label: const Text('Nouvelle tentative'),
              ),
            ],
          ],
        ),
      ),
    );
  }
}
