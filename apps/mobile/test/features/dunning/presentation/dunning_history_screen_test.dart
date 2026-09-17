import 'package:dio/dio.dart';
import 'package:drift/native.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:immodesk_mobile/core/db/app_database.dart';
import 'package:immodesk_mobile/core/network/dio_provider.dart';
import 'package:immodesk_mobile/features/dunning/presentation/screens/dunning_history_screen.dart';
import 'package:immodesk_mobile/features/organizations/presentation/controllers/selected_organization_controller.dart';
import 'package:mocktail/mocktail.dart';

class _MockDio extends Mock implements Dio {}

class _FakeSelectedOrganizationController
    extends SelectedOrganizationController {
  @override
  Future<String?> build() async => 'org-1';
}

void main() {
  late _MockDio mockDio;
  late AppDatabase database;

  setUp(() {
    mockDio = _MockDio();
    database = AppDatabase.forTesting(NativeDatabase.memory());
  });

  tearDown(() => database.close());

  Widget buildApp({String? invoiceId}) {
    return ProviderScope(
      overrides: [
        dioProvider.overrideWithValue(mockDio),
        appDatabaseProvider.overrideWithValue(database),
        selectedOrganizationControllerProvider.overrideWith(
          _FakeSelectedOrganizationController.new,
        ),
      ],
      child: MaterialApp(
        home: DunningHistoryScreen(tenantId: 'tenant-1', invoiceId: invoiceId),
      ),
    );
  }

  // Simule le filtrage côté serveur documenté par
  // `docs/api/phase9-contract.md` : `GET /v1/dunning-runs?tenantId=` ne
  // renvoie que les relances du locataire demandé.
  void stubRuns(List<Map<String, dynamic>> items) {
    when(
      () => mockDio.get<dynamic>(
        '/dunning-runs',
        queryParameters: any(named: 'queryParameters'),
        options: any(named: 'options'),
      ),
    ).thenAnswer((invocation) async {
      final Map<String, dynamic> query =
          invocation.namedArguments[#queryParameters] as Map<String, dynamic>;
      final String? tenantId = query['tenantId'] as String?;
      final List<Map<String, dynamic>> filtered = tenantId == null
          ? items
          : items.where((item) {
              final tenant = item['tenant'] as Map<String, dynamic>;
              return tenant['id'] == tenantId;
            }).toList();
      return Response<dynamic>(
        requestOptions: RequestOptions(path: '/dunning-runs'),
        statusCode: 200,
        data: <String, dynamic>{
          'items': filtered,
          'pageInfo': {'nextCursor': null},
        },
      );
    });
  }

  testWidgets(
    'affiche les relances du locataire triées de la plus récente à la plus '
    'ancienne, en excluant celles des autres locataires',
    (tester) async {
      stubRuns([
        {
          'id': 'run-old',
          'ruleId': 'rule-1',
          'ruleName': 'Rappel à échéance',
          'stepOrder': 1,
          'status': 'SENT',
          'runDate': '2026-01-05',
          'scheduledAt': '2026-01-05T08:00:00.000Z',
          'executedAt': '2026-01-05T08:03:00.000Z',
          'daysOverdue': 1,
          'balanceAmount': 60000,
          'channel': 'WHATSAPP',
          'tenant': {'id': 'tenant-1', 'displayName': 'Alice Ndongo'},
        },
        {
          'id': 'run-recent',
          'ruleId': 'rule-2',
          'ruleName': 'Deuxième rappel',
          'stepOrder': 2,
          'status': 'SENT',
          'runDate': '2026-01-15',
          'scheduledAt': '2026-01-15T08:00:00.000Z',
          'executedAt': '2026-01-15T08:03:00.000Z',
          'daysOverdue': 11,
          'balanceAmount': 60000,
          'channel': 'SMS',
          'tenant': {'id': 'tenant-1', 'displayName': 'Alice Ndongo'},
        },
        {
          'id': 'run-other-tenant',
          'ruleId': 'rule-1',
          'ruleName': 'Rappel à échéance',
          'stepOrder': 1,
          'status': 'SENT',
          'runDate': '2026-01-16',
          'scheduledAt': '2026-01-16T08:00:00.000Z',
          'executedAt': '2026-01-16T08:00:00.000Z',
          'daysOverdue': 1,
          'balanceAmount': 30000,
          'channel': 'SMS',
          'tenant': {'id': 'tenant-2', 'displayName': 'Marc Ossalé'},
        },
      ]);

      await tester.pumpWidget(buildApp());
      await tester.pump();
      await tester.pump();

      final Finder list = find.byKey(const ValueKey('dunning-history-list'));
      expect(list, findsOneWidget);
      expect(
        find.byKey(const ValueKey('dunning-run-run-recent')),
        findsOneWidget,
      );
      expect(find.byKey(const ValueKey('dunning-run-run-old')), findsOneWidget);
      expect(
        find.byKey(const ValueKey('dunning-run-run-other-tenant')),
        findsNothing,
      );

      final double recentY = tester
          .getTopLeft(find.byKey(const ValueKey('dunning-run-run-recent')))
          .dy;
      final double oldY = tester
          .getTopLeft(find.byKey(const ValueKey('dunning-run-run-old')))
          .dy;
      expect(recentY, lessThan(oldY));
      expect(find.text('Palier 2 — Deuxième rappel'), findsOneWidget);
    },
  );

  testWidgets('affiche en français le motif d\'une relance ignorée, le message '
      'd\'erreur d\'une relance échouée et le doublement vers le garant', (
    tester,
  ) async {
    stubRuns([
      {
        'id': 'run-skipped',
        'ruleId': 'rule-3',
        'ruleName': 'Mise en demeure',
        'stepOrder': 3,
        'status': 'SKIPPED',
        'runDate': '2026-01-20',
        'scheduledAt': '2026-01-20T08:00:00.000Z',
        'executedAt': null,
        'daysOverdue': 20,
        'balanceAmount': 60000,
        'channel': 'EMAIL',
        'tenant': {'id': 'tenant-1', 'displayName': 'Alice Ndongo'},
        'guarantorNotified': true,
        'skipReason': 'Facture déjà relancée aujourd\'hui.',
      },
      {
        'id': 'run-failed',
        'ruleId': 'rule-1',
        'ruleName': 'Rappel à échéance',
        'stepOrder': 1,
        'status': 'FAILED',
        'runDate': '2026-01-05',
        'scheduledAt': '2026-01-05T08:00:00.000Z',
        'executedAt': '2026-01-05T08:00:05.000Z',
        'daysOverdue': 1,
        'balanceAmount': 60000,
        'channel': 'EMAIL',
        'tenant': {'id': 'tenant-1', 'displayName': 'Alice Ndongo'},
        'errorMessage': 'Adresse e-mail invalide.',
      },
    ]);

    await tester.pumpWidget(buildApp());
    await tester.pump();
    await tester.pump();

    expect(
      find.text('Motif : Facture déjà relancée aujourd\'hui.'),
      findsOneWidget,
    );
    expect(find.text('Erreur : Adresse e-mail invalide.'), findsOneWidget);
    expect(find.byKey(const ValueKey('dunning-guarantor-row')), findsOneWidget);
    expect(find.text('Également envoyée au garant'), findsOneWidget);
  });

  testWidgets('affiche un état vide sans relance envoyée', (tester) async {
    stubRuns(const []);

    await tester.pumpWidget(buildApp());
    await tester.pump();
    await tester.pump();

    expect(find.text('Aucune relance envoyée'), findsOneWidget);
  });
}
