import 'package:flutter_test/flutter_test.dart';
import 'package:immodesk_mobile/features/leases/domain/entities/deposit.dart';
import 'package:immodesk_mobile/features/leases/domain/entities/deposit_status.dart';

Map<String, dynamic> _depositJson({
  required String status,
  required int requiredAmount,
  int collectedAmount = 0,
  int deductedAmount = 0,
  int refundedAmount = 0,
  int heldAmount = 0,
}) => {
  'id': 'deposit-1',
  'leaseId': 'lease-1',
  'tenantId': 'tenant-1',
  'status': status,
  'requiredAmount': requiredAmount,
  'collectedAmount': collectedAmount,
  'deductedAmount': deductedAmount,
  'refundedAmount': refundedAmount,
  'heldAmount': heldAmount,
  'currency': 'XAF',
};

void main() {
  group('Deposit.fromJson', () {
    test('lit les quatre montants en entiers XAF', () {
      final Deposit deposit = Deposit.fromJson(
        _depositJson(
          status: 'HELD',
          requiredAmount: 300000,
          collectedAmount: 300000,
          heldAmount: 300000,
        ),
      );
      expect(deposit.status, DepositStatus.held);
      expect(deposit.requiredAmount, isA<int>());
      expect(deposit.collectedAmount, isA<int>());
      expect(deposit.deductedAmount, isA<int>());
      expect(deposit.refundedAmount, isA<int>());
      expect(deposit.heldAmount, isA<int>());
      expect(deposit.currency, 'XAF');
    });

    test('les montants sont à 0 par défaut si absents', () {
      final Deposit deposit = Deposit.fromJson({
        'id': 'deposit-1',
        'leaseId': 'lease-1',
        'tenantId': 'tenant-1',
        'status': 'PENDING',
        'requiredAmount': 300000,
      });
      expect(deposit.collectedAmount, 0);
      expect(deposit.deductedAmount, 0);
      expect(deposit.refundedAmount, 0);
      expect(deposit.heldAmount, 0);
    });
  });

  group('Calcul du solde du dépôt (DepositBalance)', () {
    test('computedHeldAmount = collecté - retenu - restitué', () {
      final Deposit deposit = Deposit.fromJson(
        _depositJson(
          status: 'PARTIALLY_REFUNDED',
          requiredAmount: 300000,
          collectedAmount: 300000,
          deductedAmount: 50000,
          refundedAmount: 100000,
          heldAmount: 150000,
        ),
      );
      expect(deposit.computedHeldAmount, 150000);
      expect(deposit.computedHeldAmount, deposit.heldAmount);
    });

    test('remainingToCollect ne descend jamais sous 0', () {
      final Deposit partiallyPaid = Deposit.fromJson(
        _depositJson(
          status: 'PARTIALLY_PAID',
          requiredAmount: 300000,
          collectedAmount: 100000,
        ),
      );
      expect(partiallyPaid.remainingToCollect, 200000);

      final Deposit overCollected = Deposit.fromJson(
        _depositJson(
          status: 'HELD',
          requiredAmount: 300000,
          collectedAmount: 320000,
          heldAmount: 320000,
        ),
      );
      expect(overCollected.remainingToCollect, 0);
    });

    test('isFullyCollected reflète le montant requis atteint', () {
      final Deposit pending = Deposit.fromJson(
        _depositJson(status: 'PENDING', requiredAmount: 300000),
      );
      expect(pending.isFullyCollected, isFalse);

      final Deposit held = Deposit.fromJson(
        _depositJson(
          status: 'HELD',
          requiredAmount: 300000,
          collectedAmount: 300000,
          heldAmount: 300000,
        ),
      );
      expect(held.isFullyCollected, isTrue);
    });

    test('un dépôt intégralement restitué a un solde détenu nul', () {
      final Deposit refunded = Deposit.fromJson(
        _depositJson(
          status: 'REFUNDED',
          requiredAmount: 300000,
          collectedAmount: 300000,
          refundedAmount: 300000,
          heldAmount: 0,
        ),
      );
      expect(refunded.computedHeldAmount, 0);
      expect(refunded.status, DepositStatus.refunded);
    });
  });
}
