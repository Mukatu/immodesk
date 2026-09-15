import 'package:flutter_test/flutter_test.dart';
import 'package:immodesk_mobile/features/landlord_portal/domain/entities/owner_payout.dart';
import 'package:immodesk_mobile/features/landlord_portal/domain/entities/payment_method.dart';
import 'package:immodesk_mobile/features/landlord_portal/domain/entities/payout_status.dart';

const Map<String, dynamic> _payoutJson = {
  'id': 'payout-1',
  'reference': 'REV-202608-0001',
  'statementId': 'stmt-1',
  'status': 'PAID',
  'method': 'BANK_TRANSFER',
  'amount': 390000,
  'feeAmount': 2000,
  'netAmount': 388000,
  'scheduledDate': '2026-09-10',
  'paidAt': '2026-09-12T09:00:00Z',
};

void main() {
  group('OwnerPayout', () {
    test('fromJson lit le contrat de phase 7', () {
      final OwnerPayout payout = OwnerPayout.fromJson(_payoutJson);
      expect(payout.reference, 'REV-202608-0001');
      expect(payout.status, PayoutStatus.paid);
      expect(payout.method, PaymentMethod.bankTransfer);
      expect(payout.netAmount, 388000);
      expect(payout.netAmount, isA<int>());
    });

    test('feeAmount vaut 0 par défaut si absent', () {
      final Map<String, dynamic> json = {..._payoutJson}..remove('feeAmount');
      final OwnerPayout payout = OwnerPayout.fromJson(json);
      expect(payout.feeAmount, 0);
    });
  });

  group('mostRecentPayout', () {
    test('retourne le reversement le plus récent (paidAt, sinon prévu)', () {
      final OwnerPayout older = OwnerPayout.fromJson({
        ..._payoutJson,
        'id': 'older',
        'paidAt': '2026-07-12T09:00:00Z',
      });
      final OwnerPayout newer = OwnerPayout.fromJson(_payoutJson); // sept.
      expect(mostRecentPayout([older, newer])?.id, 'payout-1');
    });

    test('retient la date planifiée si aucun paiement effectif', () {
      final Map<String, dynamic> json = {..._payoutJson}..remove('paidAt');
      final OwnerPayout pendingOnly = OwnerPayout.fromJson({
        ...json,
        'status': 'PENDING',
        'scheduledDate': '2026-09-10',
      });
      expect(mostRecentPayout([pendingOnly])?.id, 'payout-1');
    });

    test('retourne null sur une liste vide', () {
      expect(mostRecentPayout(const []), isNull);
    });
  });
}
