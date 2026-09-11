import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../../core/router/route_paths.dart';
import '../../../../shared/widgets/money_xaf_text.dart';
import '../../domain/entities/invoice_summary.dart';
import '../../domain/payment_allocation_preview.dart';
import '../controllers/encaissement_controller.dart';
import '../widgets/allocation_preview_list.dart';
import '../widgets/proof_capture_section.dart';

/// Écran d'encaissement : locataire et bail pré-remplis depuis une facture
/// de la tournée, sélection des factures à solder, montant en XAF,
/// signature tactile (ou photo du reçu papier), validation verrouillée dès
/// le premier appui (`clientRef` conservé pour toute nouvelle tentative).
class EncaissementScreen extends ConsumerStatefulWidget {
  const EncaissementScreen({super.key, required this.invoiceId});

  final String invoiceId;

  @override
  ConsumerState<EncaissementScreen> createState() => _EncaissementScreenState();
}

class _EncaissementScreenState extends ConsumerState<EncaissementScreen> {
  final TextEditingController _amountController = TextEditingController();
  bool _amountInitialized = false;

  @override
  void dispose() {
    _amountController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final provider = encaissementControllerProvider(widget.invoiceId);
    final stateAsync = ref.watch(provider);

    ref.listen(provider, (previous, next) {
      final result = next.value?.result;
      if (result != null && previous?.value?.result == null) {
        context.pushReplacement(
          RoutePaths.collectionConfirmation,
          extra: result,
        );
      }
    });

    return Scaffold(
      appBar: AppBar(title: const Text('Encaissement')),
      body: stateAsync.when(
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (error, _) => Center(child: Text('Erreur : $error')),
        data: (state) {
          if (state.isOfflineBlocked) {
            return Center(
              child: Padding(
                padding: const EdgeInsets.all(24),
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Icon(
                      Icons.cloud_off_outlined,
                      size: 48,
                      color: Theme.of(context).colorScheme.outline,
                    ),
                    const SizedBox(height: 16),
                    Text(
                      EncaissementState.offlineMessage,
                      key: const ValueKey('encaissement-offline-message'),
                      textAlign: TextAlign.center,
                    ),
                  ],
                ),
              ),
            );
          }
          if (!_amountInitialized) {
            _amountController.text = state.amount.toString();
            _amountInitialized = true;
          }
          final notifier = ref.read(provider.notifier);
          final AllocationPreview preview = previewAllocation(
            invoices: state.selectedInvoices,
            amountXaf: state.amount,
          );

          return ListView(
            key: const ValueKey('encaissement-form'),
            padding: const EdgeInsets.all(16),
            children: [
              _TenantHeader(invoice: state.primaryInvoice),
              const SizedBox(height: 16),
              Text(
                'Factures à solder',
                style: Theme.of(context).textTheme.titleSmall,
              ),
              for (final invoice in state.leaseInvoices)
                CheckboxListTile(
                  key: ValueKey('invoice-checkbox-${invoice.id}'),
                  value: state.selectedInvoiceIds.contains(invoice.id),
                  onChanged: (_) => notifier.toggleInvoice(invoice.id),
                  title: Text(invoice.invoiceNumber ?? invoice.id),
                  subtitle: Text('Échéance le ${invoice.dueDate}'),
                  secondary: MoneyXafText(invoice.balanceAmount),
                ),
              const SizedBox(height: 16),
              TextFormField(
                key: const ValueKey('amount-field'),
                controller: _amountController,
                keyboardType: TextInputType.number,
                decoration: const InputDecoration(
                  labelText: 'Montant encaissé (FCFA)',
                ),
                onChanged: (value) =>
                    notifier.setAmount(int.tryParse(value) ?? 0),
              ),
              const SizedBox(height: 16),
              AllocationPreviewList(preview: preview),
              const SizedBox(height: 16),
              ProofCaptureSection(
                onSignatureCaptured: notifier.setSignature,
                onPaperPhotoCaptured: notifier.setPaperReceiptPhoto,
              ),
              if (state.errorMessage != null) ...[
                const SizedBox(height: 8),
                Text(
                  state.errorMessage!,
                  key: const ValueKey('encaissement-error'),
                  style: TextStyle(color: Theme.of(context).colorScheme.error),
                ),
              ],
              const SizedBox(height: 24),
              FilledButton(
                key: const ValueKey('submit-encaissement-button'),
                onPressed:
                    state.isSubmitting || state.amount <= 0 || !state.hasProof
                    ? null
                    : notifier.submit,
                child: state.isSubmitting
                    ? const SizedBox(
                        height: 20,
                        width: 20,
                        child: CircularProgressIndicator(strokeWidth: 2),
                      )
                    : const Text('Valider'),
              ),
            ],
          );
        },
      ),
    );
  }
}

class _TenantHeader extends StatelessWidget {
  const _TenantHeader({required this.invoice});

  final InvoiceSummary invoice;

  @override
  Widget build(BuildContext context) {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(12),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              invoice.tenant.displayName,
              style: Theme.of(context).textTheme.titleMedium,
            ),
            Text('Lot ${invoice.unit.code} · ${invoice.property.name}'),
            if (invoice.lease.reference != null)
              Text('Bail ${invoice.lease.reference}'),
          ],
        ),
      ),
    );
  }
}
