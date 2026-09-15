import 'package:flutter_test/flutter_test.dart';
import 'package:immodesk_mobile/features/landlord_portal/domain/entities/owner_statement_line.dart';
import 'package:immodesk_mobile/features/landlord_portal/domain/entities/owner_statement_summary.dart';
import 'package:immodesk_mobile/features/landlord_portal/domain/entities/statement_status.dart';

const Map<String, dynamic> _statementJson = {
  'id': 'stmt-1',
  'statementNumber': 'REL-202608-0001',
  'status': 'ISSUED',
  'property': {'id': 'prop-1', 'name': 'Résidence Malonga'},
  'periodStart': '2026-08-01',
  'periodEnd': '2026-08-31',
  'rentCollectedAmount': 500000,
  'commissionAmount': 50000,
  'expensesAmount': 60000,
  'carryForwardAmount': 0,
  'netPayableAmount': 390000,
  'issuedAt': '2026-09-05T10:00:00Z',
};

const Map<String, dynamic> _lineJson = {
  'id': 'line-1',
  'lineType': 'COMMISSION',
  'label': 'Commission de gérance',
  'amount': 50000,
  'isDebit': true,
  'position': 2,
};

void main() {
  group('OwnerStatementSummary', () {
    test('fromJson lit le contrat de phase 7', () {
      final OwnerStatementSummary statement = OwnerStatementSummary.fromJson(
        _statementJson,
      );
      expect(statement.statementNumber, 'REL-202608-0001');
      expect(statement.status, StatementStatus.issued);
      expect(statement.property?.name, 'Résidence Malonga');
      expect(statement.netPayableAmount, 390000);
      expect(statement.netPayableAmount, isA<int>());
    });

    test('property est nul pour un relevé consolidé (arbitrage 1)', () {
      final Map<String, dynamic> json = {..._statementJson}..remove('property');
      final OwnerStatementSummary statement = OwnerStatementSummary.fromJson(
        json,
      );
      expect(statement.property, isNull);
    });

    test('isAwaitingPayout vrai pour ISSUED/SENT à solde positif', () {
      final OwnerStatementSummary issued = OwnerStatementSummary.fromJson(
        _statementJson,
      );
      expect(issued.isAwaitingPayout, isTrue);

      final OwnerStatementSummary draft = OwnerStatementSummary.fromJson({
        ..._statementJson,
        'status': 'DRAFT',
      });
      expect(draft.isAwaitingPayout, isFalse);

      final OwnerStatementSummary paid = OwnerStatementSummary.fromJson({
        ..._statementJson,
        'status': 'PAID',
      });
      expect(paid.isAwaitingPayout, isFalse);

      final OwnerStatementSummary negative = OwnerStatementSummary.fromJson({
        ..._statementJson,
        'netPayableAmount': -20000,
      });
      expect(negative.isAwaitingPayout, isFalse);
    });
  });

  group('outstandingBalance (solde affiché en accueil bailleur)', () {
    test('retourne le montant du relevé en attente le plus récent', () {
      final List<OwnerStatementSummary> statements = [
        OwnerStatementSummary.fromJson({
          ..._statementJson,
          'id': 'old',
          'periodStart': '2026-07-01',
          'status': 'PAID',
        }),
        OwnerStatementSummary.fromJson(_statementJson), // 2026-08, ISSUED
      ];
      expect(outstandingBalance(statements), 390000);
    });

    test('retourne 0 si aucun relevé en attente (arbitrage 5 : report, pas '
        'd\'appel de fonds)', () {
      final List<OwnerStatementSummary> statements = [
        OwnerStatementSummary.fromJson({..._statementJson, 'status': 'PAID'}),
      ];
      expect(outstandingBalance(statements), 0);
    });

    test('retourne 0 sur une liste vide', () {
      expect(outstandingBalance(const []), 0);
    });
  });

  group('mostRecentStatement', () {
    test('retourne le relevé de période la plus récente', () {
      final OwnerStatementSummary older = OwnerStatementSummary.fromJson({
        ..._statementJson,
        'id': 'older',
        'periodStart': '2026-06-01',
      });
      final OwnerStatementSummary newer = OwnerStatementSummary.fromJson({
        ..._statementJson,
        'id': 'newer',
        'periodStart': '2026-08-01',
      });
      expect(mostRecentStatement([older, newer])?.id, 'newer');
    });

    test('retourne null sur une liste vide', () {
      expect(mostRecentStatement(const []), isNull);
    });
  });

  group('OwnerStatementLine', () {
    test('fromJson lit le type et le sens du débit', () {
      final OwnerStatementLine line = OwnerStatementLine.fromJson(_lineJson);
      expect(line.lineType, OwnerStatementLineType.commission);
      expect(line.amount, 50000);
      expect(line.amount, isA<int>());
      expect(line.isDebit, isTrue);
    });

    test(
      'amount est toujours positif, isDebit porte le sens (arbitrage 2)',
      () {
        final OwnerStatementLine debit = OwnerStatementLine.fromJson(_lineJson);
        expect(debit.signedAmount, -50000);

        final OwnerStatementLine credit = OwnerStatementLine.fromJson({
          ..._lineJson,
          'lineType': 'RENT_COLLECTED',
          'isDebit': false,
          'amount': 200000,
        });
        expect(credit.signedAmount, 200000);
      },
    );
  });
}
