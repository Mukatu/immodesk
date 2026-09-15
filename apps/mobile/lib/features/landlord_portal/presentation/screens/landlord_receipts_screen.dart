import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../../core/network/api_exception.dart';
import '../../../../shared/widgets/empty_state.dart';
import '../../../../shared/widgets/money_xaf_text.dart';
import '../../domain/entities/receipt_summary.dart';
import '../controllers/landlord_portal_lists_controllers.dart';
import '../controllers/receipt_pdf_delivery_controller.dart';
import '../controllers/statement_pdf_delivery_controller.dart';

/// Liste des quittances liées aux baux des biens du bailleur, avec
/// téléchargement (`GET /v1/portal/receipts`, lecture seule).
class LandlordReceiptsScreen extends ConsumerWidget {
  const LandlordReceiptsScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final receiptsAsync = ref.watch(landlordReceiptsProvider);

    return Scaffold(
      appBar: AppBar(title: const Text('Mes quittances')),
      body: receiptsAsync.when(
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (error, _) => Center(
          child: Text(
            error is ApiException ? error.message : 'Une erreur est survenue.',
          ),
        ),
        data: (receipts) {
          if (receipts.isEmpty) {
            return const EmptyState(
              title: 'Aucune quittance',
              message: 'Les quittances de vos locataires apparaîtront ici.',
            );
          }
          return ListView.separated(
            key: const ValueKey('landlord-receipts-list'),
            padding: const EdgeInsets.all(16),
            itemCount: receipts.length,
            separatorBuilder: (_, _) => const SizedBox(height: 8),
            itemBuilder: (context, index) =>
                _ReceiptTile(receipt: receipts[index]),
          );
        },
      ),
    );
  }
}

class _ReceiptTile extends ConsumerWidget {
  const _ReceiptTile({required this.receipt});

  final ReceiptSummary receipt;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final StatementPdfState state = ref.watch(
      receiptPdfDeliveryControllerProvider(receipt.id),
    );
    final bool isBusy =
        state.status == StatementPdfStatus.downloading ||
        state.status == StatementPdfStatus.sharing;

    return Card(
      key: ValueKey('landlord-receipt-${receipt.id}'),
      child: ListTile(
        title: Text(receipt.receiptNumber),
        subtitle: Text('${receipt.tenant.displayName} · ${receipt.unit.code}'),
        trailing: MoneyXafText(receipt.amount),
        onTap: isBusy
            ? null
            : () => ref
                  .read(
                    receiptPdfDeliveryControllerProvider(receipt.id).notifier,
                  )
                  .downloadAndShare(receipt.downloadUrl),
      ),
    );
  }
}
