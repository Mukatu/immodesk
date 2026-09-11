import 'package:flutter/material.dart';

import '../../../../shared/widgets/money_xaf_text.dart';
import '../../domain/payment_allocation_preview.dart';

/// Aperçu de l'imputation d'un montant encaissé : une ligne par facture
/// soldée (la plus ancienne d'abord), et un éventuel reliquat affiché à
/// titre informatif (deviendra un crédit locataire côté serveur).
class AllocationPreviewList extends StatelessWidget {
  const AllocationPreviewList({super.key, required this.preview});

  final AllocationPreview preview;

  @override
  Widget build(BuildContext context) {
    if (preview.lines.isEmpty) {
      return const Padding(
        padding: EdgeInsets.symmetric(vertical: 8),
        child: Text('Sélectionnez au moins une facture à solder.'),
      );
    }
    return Card(
      key: const ValueKey('allocation-preview'),
      child: Padding(
        padding: const EdgeInsets.all(12),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              'Imputation prévue',
              style: Theme.of(context).textTheme.titleSmall,
            ),
            const SizedBox(height: 8),
            for (final line in preview.lines)
              Padding(
                padding: const EdgeInsets.symmetric(vertical: 2),
                child: Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Expanded(child: Text(line.invoiceNumber ?? line.invoiceId)),
                    MoneyXafText(line.amountAllocated),
                  ],
                ),
              ),
            if (preview.creditAmount > 0) ...[
              const Divider(),
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  const Text('Reliquat (crédit locataire)'),
                  MoneyXafText(preview.creditAmount),
                ],
              ),
            ],
          ],
        ),
      ),
    );
  }
}
