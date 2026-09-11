import 'entities/invoice_status.dart';
import 'entities/invoice_summary.dart';

/// Regroupement des factures dues d'un immeuble pour l'écran « Ma tournée ».
class CollectionRoundGroup {
  const CollectionRoundGroup({required this.property, required this.invoices});

  final InvoicePropertyRef property;

  /// Factures triées par échéance croissante (la plus ancienne d'abord).
  final List<InvoiceSummary> invoices;

  /// Montant total dû pour cet immeuble (somme des soldes restants).
  int get totalDueAmount =>
      invoices.fold<int>(0, (sum, invoice) => sum + invoice.balanceAmount);

  /// Nombre de factures en retard (`OVERDUE`) dans ce groupe.
  int get lateCount => invoices
      .where((invoice) => invoice.status == InvoiceStatus.overdue)
      .length;
}

/// Regroupe les factures dues par immeuble, chaque groupe étant trié par
/// échéance croissante et les groupes triés par montant dû décroissant
/// (priorité de tournée : on commence par l'immeuble qui rapporte le plus).
List<CollectionRoundGroup> groupDueInvoicesByProperty(
  List<InvoiceSummary> invoices,
) {
  final Map<String, List<InvoiceSummary>> byPropertyId =
      <String, List<InvoiceSummary>>{};
  for (final InvoiceSummary invoice in invoices) {
    byPropertyId.putIfAbsent(invoice.property.id, () => []).add(invoice);
  }

  final List<CollectionRoundGroup> groups = byPropertyId.values.map((
    List<InvoiceSummary> propertyInvoices,
  ) {
    final List<InvoiceSummary> sorted = [...propertyInvoices]
      ..sort((a, b) => a.dueDate.compareTo(b.dueDate));
    return CollectionRoundGroup(
      property: sorted.first.property,
      invoices: sorted,
    );
  }).toList();

  groups.sort((a, b) => b.totalDueAmount.compareTo(a.totalDueAmount));
  return groups;
}
