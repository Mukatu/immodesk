import 'package:flutter_test/flutter_test.dart';
import 'package:immodesk_mobile/features/payments/domain/entities/momo_quote.dart';

void main() {
  group('momoQuoteDisplayTotal', () {
    test('feeBearer TENANT : le total débité inclut les frais', () {
      const quote = MomoQuote(
        amount: 50000,
        feeAmount: 1500,
        totalDebited: 51500,
        netReceived: 50000,
        feeBearer: MomoFeeBearer.tenant,
      );
      expect(momoQuoteDisplayTotal(quote), 51500);
      expect(quote.totalDebited, quote.amount + quote.feeAmount);
    });

    test("feeBearer ORGANIZATION : le total débité est le montant, "
        'les frais restent informatifs', () {
      const quote = MomoQuote(
        amount: 50000,
        feeAmount: 1500,
        totalDebited: 50000,
        netReceived: 48500,
        feeBearer: MomoFeeBearer.organization,
      );
      expect(momoQuoteDisplayTotal(quote), 50000);
      expect(quote.netReceived, quote.amount - quote.feeAmount);
    });

    test('sérialisation JSON conforme au contrat de phase 4', () {
      final quote = MomoQuote.fromJson(const {
        'amount': 50000,
        'feeAmount': 1500,
        'totalDebited': 51500,
        'netReceived': 50000,
        'feeBearer': 'TENANT',
      });
      expect(quote.feeBearer, MomoFeeBearer.tenant);
      expect(momoQuoteDisplayTotal(quote), 51500);
    });
  });
}
