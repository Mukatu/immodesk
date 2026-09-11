import 'package:flutter_test/flutter_test.dart';
import 'package:immodesk_mobile/features/cash/domain/cash_balance.dart';
import 'package:immodesk_mobile/features/cash/domain/entities/cash_receipt_status.dart';
import 'package:immodesk_mobile/features/cash/domain/entities/cash_receipt_summary.dart';

CashReceiptSummary _receipt({
  required String id,
  required int amount,
  required String receivedAt,
  CashReceiptStatus status = CashReceiptStatus.issued,
}) {
  return CashReceiptSummary(
    id: id,
    receiptNumber: 'CASH-ORG-COL-$id',
    status: status,
    amount: amount,
    receivedAt: receivedAt,
    tenant: const CashReceiptSummaryTenantRef(
      id: 'tenant-1',
      displayName: 'Alice Ndongo',
    ),
    collectorUserId: 'user-1',
    collectorName: 'Jean Collecteur',
  );
}

void main() {
  group('computeHeldAmount', () {
    test('additionne uniquement les reçus ISSUED', () {
      final receipts = [
        _receipt(id: '1', amount: 20000, receivedAt: '2026-09-01T08:00:00Z'),
        _receipt(id: '2', amount: 15000, receivedAt: '2026-09-02T08:00:00Z'),
        _receipt(
          id: '3',
          amount: 99999,
          receivedAt: '2026-08-01T08:00:00Z',
          status: CashReceiptStatus.remitted,
        ),
        _receipt(
          id: '4',
          amount: 5000,
          receivedAt: '2026-09-03T08:00:00Z',
          status: CashReceiptStatus.cancelled,
        ),
      ];

      expect(computeHeldAmount(receipts), 35000);
    });

    test('retourne 0 sans reçu', () {
      expect(computeHeldAmount(const []), 0);
    });
  });

  group('unremittedReceiptsOldestFirst', () {
    test('ne garde que les ISSUED, triés du plus ancien au plus récent', () {
      final receipts = [
        _receipt(
          id: 'recent',
          amount: 1000,
          receivedAt: '2026-09-05T08:00:00Z',
        ),
        _receipt(id: 'old', amount: 2000, receivedAt: '2026-09-01T08:00:00Z'),
        _receipt(
          id: 'remitted',
          amount: 3000,
          receivedAt: '2026-08-01T08:00:00Z',
          status: CashReceiptStatus.remitted,
        ),
      ];

      final result = unremittedReceiptsOldestFirst(receipts);

      expect(result.map((r) => r.id), ['old', 'recent']);
    });
  });

  group('isOverCap', () {
    test('vrai quand l\'encours dépasse le plafond', () {
      expect(isOverCap(heldAmount: 600000, capAmount: 500000), isTrue);
    });

    test('faux quand l\'encours est égal ou inférieur au plafond', () {
      expect(isOverCap(heldAmount: 500000, capAmount: 500000), isFalse);
      expect(isOverCap(heldAmount: 100000, capAmount: 500000), isFalse);
    });
  });
}
