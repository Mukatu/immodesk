import 'package:flutter_test/flutter_test.dart';
import 'package:immodesk_mobile/features/collection/domain/entities/invoice_status.dart';
import 'package:immodesk_mobile/features/collection/domain/entities/invoice_summary.dart';
import 'package:immodesk_mobile/features/collection/domain/payment_allocation_preview.dart';

InvoiceSummary _invoice({
  required String id,
  required String dueDate,
  required int balanceAmount,
}) {
  return InvoiceSummary(
    id: id,
    invoiceNumber: 'LOY-202601-$id',
    status: InvoiceStatus.issued,
    lease: const InvoiceLeaseRef(id: 'lease-1', reference: 'BAIL-1'),
    tenant: const InvoiceTenantRef(
      id: 'tenant-1',
      displayName: 'Alice Ndongo',
      primaryPhone: '+242066000002',
    ),
    unit: const InvoiceUnitRef(id: 'unit-1', code: 'A01'),
    property: const InvoicePropertyRef(id: 'prop-1', name: 'Résidence Malonga'),
    periodStart: '2026-01-01',
    periodEnd: '2026-01-31',
    dueDate: dueDate,
    totalAmount: balanceAmount,
    paidAmount: 0,
    balanceAmount: balanceAmount,
  );
}

void main() {
  group('previewAllocation', () {
    test('impute la plus ancienne facture d\'abord', () {
      final invoices = [
        _invoice(id: 'recent', dueDate: '2026-03-05', balanceAmount: 40000),
        _invoice(id: 'oldest', dueDate: '2026-01-05', balanceAmount: 30000),
        _invoice(id: 'middle', dueDate: '2026-02-05', balanceAmount: 20000),
      ];

      final preview = previewAllocation(invoices: invoices, amountXaf: 45000);

      expect(preview.lines, hasLength(2));
      expect(preview.lines[0].invoiceId, 'oldest');
      expect(preview.lines[0].amountAllocated, 30000);
      expect(preview.lines[0].remainingBalance, 0);
      expect(preview.lines[1].invoiceId, 'middle');
      expect(preview.lines[1].amountAllocated, 15000);
      expect(preview.lines[1].remainingBalance, 5000);
      expect(preview.allocatedAmount, 45000);
      expect(preview.creditAmount, 0);
    });

    test('place le reliquat en crédit si le montant dépasse les soldes', () {
      final invoices = [
        _invoice(id: 'inv-1', dueDate: '2026-01-05', balanceAmount: 10000),
      ];

      final preview = previewAllocation(invoices: invoices, amountXaf: 15000);

      expect(preview.lines, hasLength(1));
      expect(preview.allocatedAmount, 10000);
      expect(preview.creditAmount, 5000);
    });

    test('ne rien imputer sans facture sélectionnée', () {
      final preview = previewAllocation(invoices: const [], amountXaf: 20000);

      expect(preview.lines, isEmpty);
      expect(preview.allocatedAmount, 0);
      expect(preview.creditAmount, 20000);
    });
  });
}
