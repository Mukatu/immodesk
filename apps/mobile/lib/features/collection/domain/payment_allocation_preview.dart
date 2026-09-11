import 'entities/invoice_summary.dart';

/// Ligne d'imputation prévisionnelle sur une facture.
class AllocationPreviewLine {
  const AllocationPreviewLine({
    required this.invoiceId,
    required this.invoiceNumber,
    required this.amountAllocated,
    required this.remainingBalance,
  });

  final String invoiceId;
  final String? invoiceNumber;
  final int amountAllocated;
  final int remainingBalance;
}

/// Aperçu complet de l'imputation d'un montant encaissé sur les factures
/// sélectionnées.
class AllocationPreview {
  const AllocationPreview({
    required this.lines,
    required this.allocatedAmount,
    required this.creditAmount,
  });

  final List<AllocationPreviewLine> lines;

  /// Somme effectivement imputée sur des factures.
  final int allocatedAmount;

  /// Reliquat non imputé (montant saisi supérieur aux soldes sélectionnés),
  /// affiché à titre informatif : côté serveur il devient un crédit
  /// locataire (`tenant_credits`), jamais envoyé comme allocation.
  final int creditAmount;
}

/// Calcule l'aperçu d'imputation d'un montant encaissé sur des factures,
/// selon la règle figée du contrat de phase 3 : la plus ancienne facture
/// non soldée du locataire d'abord (`dueDate` croissante).
AllocationPreview previewAllocation({
  required List<InvoiceSummary> invoices,
  required int amountXaf,
}) {
  final List<InvoiceSummary> sorted = [...invoices]
    ..sort((a, b) => a.dueDate.compareTo(b.dueDate));

  int remaining = amountXaf;
  final List<AllocationPreviewLine> lines = [];
  for (final InvoiceSummary invoice in sorted) {
    if (remaining <= 0) break;
    final int allocated = remaining < invoice.balanceAmount
        ? remaining
        : invoice.balanceAmount;
    if (allocated <= 0) continue;
    lines.add(
      AllocationPreviewLine(
        invoiceId: invoice.id,
        invoiceNumber: invoice.invoiceNumber,
        amountAllocated: allocated,
        remainingBalance: invoice.balanceAmount - allocated,
      ),
    );
    remaining -= allocated;
  }

  return AllocationPreview(
    lines: lines,
    allocatedAmount: amountXaf - remaining,
    creditAmount: remaining,
  );
}
