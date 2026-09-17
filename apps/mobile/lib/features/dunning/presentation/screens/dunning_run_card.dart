import 'package:flutter/material.dart';

import '../../../../shared/widgets/money_xaf_text.dart';
import '../../../../shared/widgets/status_badge.dart';
import '../../domain/entities/dunning_run.dart';
import '../../domain/entities/dunning_step_status.dart';
import '../../domain/entities/notification_channel.dart';
import 'dunning_format.dart';

/// Une ligne d'historique de relance : date d'exécution, palier et son
/// rang, canal utilisé, statut, solde au moment de la relance, jours de
/// retard, pénalité appliquée le cas échéant, motif d'une relance ignorée,
/// message d'erreur d'une relance échouée, et indication d'un doublement
/// vers le garant (`guarantorNotified`).
class DunningRunCard extends StatelessWidget {
  const DunningRunCard({super.key, required this.run});

  final DunningRun run;

  @override
  Widget build(BuildContext context) {
    final ColorScheme scheme = Theme.of(context).colorScheme;
    final String dateLabel = formatDunningDate(
      run.executedAt ?? run.scheduledAt,
    );

    return Card(
      key: ValueKey('dunning-run-${run.id}'),
      child: Padding(
        padding: const EdgeInsets.all(12),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Expanded(
                  child: Text(
                    'Palier ${run.stepOrder} — ${run.ruleName}',
                    style: Theme.of(context).textTheme.titleSmall,
                  ),
                ),
                StatusBadge(label: run.status.label, tone: run.status.tone),
              ],
            ),
            const SizedBox(height: 4),
            Text(dateLabel, style: Theme.of(context).textTheme.bodySmall),
            const SizedBox(height: 8),
            Wrap(
              spacing: 16,
              runSpacing: 4,
              children: [
                Text('Canal : ${run.channel.label}'),
                Text('${run.daysOverdue} jour(s) de retard'),
                MoneyXafText(run.balanceAmount),
              ],
            ),
            if (run.penaltyApplied) ...[
              const SizedBox(height: 6),
              Row(
                key: const ValueKey('dunning-penalty-row'),
                mainAxisSize: MainAxisSize.min,
                children: [
                  Icon(
                    Icons.warning_amber_outlined,
                    size: 16,
                    color: scheme.tertiary,
                  ),
                  const SizedBox(width: 4),
                  const Text('Pénalité appliquée : '),
                  MoneyXafText(run.penaltyAmount),
                ],
              ),
            ],
            if (run.guarantorNotified) ...[
              const SizedBox(height: 6),
              Row(
                key: const ValueKey('dunning-guarantor-row'),
                mainAxisSize: MainAxisSize.min,
                children: [
                  Icon(
                    Icons.groups_outlined,
                    size: 16,
                    color: scheme.secondary,
                  ),
                  const SizedBox(width: 4),
                  const Text('Également envoyée au garant'),
                ],
              ),
            ],
            if (run.status == DunningStepStatus.skipped &&
                run.skipReason != null) ...[
              const SizedBox(height: 6),
              Text(
                'Motif : ${run.skipReason}',
                style: TextStyle(color: scheme.outline),
              ),
            ],
            if (run.status == DunningStepStatus.failed &&
                run.errorMessage != null) ...[
              const SizedBox(height: 6),
              Text(
                'Erreur : ${run.errorMessage}',
                style: TextStyle(color: scheme.error),
              ),
            ],
          ],
        ),
      ),
    );
  }
}
