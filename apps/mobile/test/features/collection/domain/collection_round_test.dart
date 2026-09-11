import 'package:flutter_test/flutter_test.dart';
import 'package:immodesk_mobile/features/collection/domain/collection_round.dart';
import 'package:immodesk_mobile/features/collection/domain/entities/invoice_status.dart';
import 'package:immodesk_mobile/features/collection/domain/entities/invoice_summary.dart';

InvoiceSummary _invoice({
  required String id,
  required String propertyId,
  required String propertyName,
  required String dueDate,
  required int balanceAmount,
  InvoiceStatus status = InvoiceStatus.issued,
}) {
  return InvoiceSummary(
    id: id,
    invoiceNumber: 'LOY-202601-$id',
    status: status,
    lease: const InvoiceLeaseRef(id: 'lease-1', reference: 'BAIL-1'),
    tenant: const InvoiceTenantRef(
      id: 'tenant-1',
      displayName: 'Alice Ndongo',
      primaryPhone: '+242066000002',
    ),
    unit: const InvoiceUnitRef(id: 'unit-1', code: 'A01'),
    property: InvoicePropertyRef(id: propertyId, name: propertyName),
    periodStart: '2026-01-01',
    periodEnd: '2026-01-31',
    dueDate: dueDate,
    totalAmount: balanceAmount,
    paidAmount: 0,
    balanceAmount: balanceAmount,
  );
}

void main() {
  group('groupDueInvoicesByProperty', () {
    test('regroupe par immeuble et trie chaque groupe par échéance', () {
      final invoices = [
        _invoice(
          id: '1',
          propertyId: 'prop-1',
          propertyName: 'Résidence Malonga',
          dueDate: '2026-02-05',
          balanceAmount: 50000,
        ),
        _invoice(
          id: '2',
          propertyId: 'prop-1',
          propertyName: 'Résidence Malonga',
          dueDate: '2026-01-05',
          balanceAmount: 60000,
          status: InvoiceStatus.overdue,
        ),
        _invoice(
          id: '3',
          propertyId: 'prop-2',
          propertyName: 'Villa Bacongo',
          dueDate: '2026-01-10',
          balanceAmount: 30000,
        ),
      ];

      final groups = groupDueInvoicesByProperty(invoices);

      expect(groups, hasLength(2));
      // Le groupe avec le plus gros montant dû (prop-1, 110000) vient
      // d'abord.
      expect(groups.first.property.id, 'prop-1');
      expect(groups.first.totalDueAmount, 110000);
      expect(groups.first.lateCount, 1);
      // Au sein du groupe, la facture la plus ancienne d'abord.
      expect(groups.first.invoices.first.id, '2');
      expect(groups.first.invoices.last.id, '1');

      expect(groups.last.property.id, 'prop-2');
      expect(groups.last.totalDueAmount, 30000);
    });

    test('retourne une liste vide sans facture', () {
      expect(groupDueInvoicesByProperty(const []), isEmpty);
    });
  });
}
