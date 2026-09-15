import 'package:flutter_test/flutter_test.dart';
import 'package:immodesk_mobile/features/landlord_portal/domain/entities/collection_view.dart';
import 'package:immodesk_mobile/features/landlord_portal/domain/entities/payment_method.dart';
import 'package:immodesk_mobile/features/landlord_portal/domain/entities/receipt_summary.dart';

const Map<String, dynamic> _collectionJson = {
  'paymentId': 'payment-1',
  'paymentDate': '2026-08-05',
  'method': 'MOBILE_MONEY',
  'amount': 150000,
  'tenant': {'id': 'tenant-1', 'displayName': 'Alice Ndongo'},
  'unit': {'id': 'unit-1', 'code': 'A01'},
  'invoiceNumber': 'LOY-202608-0001',
};

const Map<String, dynamic> _receiptJson = {
  'id': 'receipt-1',
  'receiptNumber': 'QUI-202608-0001',
  'amount': 150000,
  'receivedAt': '2026-08-05T09:00:00Z',
  'tenant': {'id': 'tenant-1', 'displayName': 'Alice Ndongo'},
  'unit': {'id': 'unit-1', 'code': 'A01'},
  'downloadUrl': 'https://storage.immodesk.app/quittance.pdf?sig=x',
};

void main() {
  test('CollectionView.fromJson lit un encaissement confirmé', () {
    final CollectionView collection = CollectionView.fromJson(_collectionJson);
    expect(collection.paymentId, 'payment-1');
    expect(collection.method, PaymentMethod.mobileMoney);
    expect(collection.amount, 150000);
    expect(collection.amount, isA<int>());
    expect(collection.tenant.displayName, 'Alice Ndongo');
    expect(collection.unit.code, 'A01');
  });

  test('ReceiptSummary.fromJson lit une quittance téléchargeable', () {
    final ReceiptSummary receipt = ReceiptSummary.fromJson(_receiptJson);
    expect(receipt.receiptNumber, 'QUI-202608-0001');
    expect(receipt.amount, 150000);
    expect(receipt.tenant.displayName, 'Alice Ndongo');
    expect(receipt.downloadUrl, contains('quittance.pdf'));
  });
}
