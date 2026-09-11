import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../../core/router/route_paths.dart';
import '../../../../shared/widgets/money_xaf_text.dart';
import '../../domain/entities/cash_receipt_result.dart';
import '../controllers/receipt_delivery_controller.dart';

/// Confirmation d'un encaissement : numéro de reçu, montant, partage du
/// PDF (téléchargé via `download-url`) et renvoi WhatsApp/SMS.
class ConfirmationScreen extends ConsumerWidget {
  const ConfirmationScreen({super.key, required this.result});

  final CashReceiptResult result;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final provider = receiptDeliveryControllerProvider(result.id);
    final ReceiptDeliveryState delivery = ref.watch(provider);
    final notifier = ref.read(provider.notifier);

    return Scaffold(
      appBar: AppBar(title: const Text('Reçu enregistré')),
      body: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Icon(
              Icons.check_circle_outline,
              color: Theme.of(context).colorScheme.primary,
              size: 64,
            ),
            const SizedBox(height: 16),
            Text(
              result.receiptNumber,
              key: const ValueKey('confirmation-receipt-number'),
              style: Theme.of(context).textTheme.headlineSmall,
              textAlign: TextAlign.center,
            ),
            const SizedBox(height: 8),
            Center(
              child: MoneyXafText(
                result.amount,
                style: Theme.of(context).textTheme.titleLarge,
              ),
            ),
            const SizedBox(height: 4),
            Text(
              result.tenant.displayName,
              textAlign: TextAlign.center,
              style: Theme.of(context).textTheme.bodyMedium,
            ),
            const SizedBox(height: 24),
            if (delivery.errorMessage != null)
              Padding(
                padding: const EdgeInsets.only(bottom: 8),
                child: Text(
                  delivery.errorMessage!,
                  key: const ValueKey('confirmation-error'),
                  style: TextStyle(color: Theme.of(context).colorScheme.error),
                  textAlign: TextAlign.center,
                ),
              ),
            if (result.documentId != null)
              FilledButton.icon(
                key: const ValueKey('share-receipt-button'),
                onPressed: delivery.status == ReceiptDeliveryStatus.downloading
                    ? null
                    : () => notifier.shareReceiptPdf(result.documentId!),
                icon: const Icon(Icons.share_outlined),
                label: const Text('Partager le reçu (PDF)'),
              ),
            const SizedBox(height: 8),
            OutlinedButton.icon(
              key: const ValueKey('resend-receipt-button'),
              onPressed: delivery.status == ReceiptDeliveryStatus.sending
                  ? null
                  : notifier.resend,
              icon: const Icon(Icons.forward_to_inbox_outlined),
              label: const Text('Renvoyer par WhatsApp / SMS'),
            ),
            const SizedBox(height: 24),
            TextButton(
              key: const ValueKey('back-to-round-button'),
              onPressed: () => context.go(RoutePaths.collectionRound),
              child: const Text('Retour à la tournée'),
            ),
          ],
        ),
      ),
    );
  }
}
