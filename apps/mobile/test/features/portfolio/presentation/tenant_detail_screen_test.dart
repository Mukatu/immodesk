import 'package:dio/dio.dart';
import 'package:drift/native.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:immodesk_mobile/core/db/app_database.dart';
import 'package:immodesk_mobile/core/launcher/url_launcher_service.dart';
import 'package:immodesk_mobile/core/network/dio_provider.dart';
import 'package:immodesk_mobile/features/organizations/presentation/controllers/selected_organization_controller.dart';
import 'package:immodesk_mobile/features/portfolio/presentation/screens/tenant_detail_screen.dart';
import 'package:mocktail/mocktail.dart';

class _MockDio extends Mock implements Dio {}

class _FakeSelectedOrganizationController
    extends SelectedOrganizationController {
  @override
  Future<String?> build() async => 'org-1';
}

class _RecordingUrlLauncherService extends UrlLauncherService {
  const _RecordingUrlLauncherService(this.calls);

  final List<String> calls;

  @override
  Future<bool> call(String e164Phone) async {
    calls.add('call:$e164Phone');
    return true;
  }

  @override
  Future<bool> openWhatsapp(String e164Phone) async {
    calls.add('whatsapp:$e164Phone');
    return true;
  }
}

const Map<String, dynamic> _tenantsResponse = {
  'items': [
    {
      'id': 'tenant-1',
      'displayName': 'Alice Ndongo',
      'primaryPhone': '+242066000002',
      'whatsappPhone': '+242066000002',
      'email': null,
      'city': 'Brazzaville',
    },
  ],
  'pageInfo': {'nextCursor': null, 'hasNextPage': false, 'limit': 100},
};

void main() {
  late _MockDio mockDio;
  late AppDatabase database;
  late List<String> launcherCalls;

  setUp(() {
    mockDio = _MockDio();
    database = AppDatabase.forTesting(NativeDatabase.memory());
    launcherCalls = [];
    when(
      () => mockDio.get<dynamic>(
        '/tenants',
        queryParameters: any(named: 'queryParameters'),
        options: any(named: 'options'),
      ),
    ).thenAnswer(
      (_) async => Response<dynamic>(
        requestOptions: RequestOptions(path: '/tenants'),
        statusCode: 200,
        data: _tenantsResponse,
      ),
    );
  });

  tearDown(() => database.close());

  Widget buildApp() {
    return ProviderScope(
      overrides: [
        dioProvider.overrideWithValue(mockDio),
        appDatabaseProvider.overrideWithValue(database),
        selectedOrganizationControllerProvider.overrideWith(
          _FakeSelectedOrganizationController.new,
        ),
        urlLauncherServiceProvider.overrideWithValue(
          _RecordingUrlLauncherService(launcherCalls),
        ),
      ],
      child: const MaterialApp(home: TenantDetailScreen(tenantId: 'tenant-1')),
    );
  }

  testWidgets('affiche le nom, le numéro et les boutons Appeler / WhatsApp', (
    tester,
  ) async {
    await tester.pumpWidget(buildApp());
    await tester.pump();
    await tester.pump();

    expect(find.text('Alice Ndongo'), findsOneWidget);
    expect(find.byKey(const ValueKey('call-button')), findsOneWidget);
    expect(find.byKey(const ValueKey('whatsapp-button')), findsOneWidget);

    await tester.tap(find.byKey(const ValueKey('call-button')));
    await tester.tap(find.byKey(const ValueKey('whatsapp-button')));
    await tester.pump();

    expect(launcherCalls, ['call:+242066000002', 'whatsapp:+242066000002']);
  });
}
