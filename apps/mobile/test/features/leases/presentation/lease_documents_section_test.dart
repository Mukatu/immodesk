import 'dart:io';

import 'package:dio/dio.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:immodesk_mobile/core/connectivity/connectivity_service.dart';
import 'package:immodesk_mobile/core/network/dio_provider.dart';
import 'package:immodesk_mobile/features/leases/data/lease_document_download_service.dart';
import 'package:immodesk_mobile/features/leases/presentation/controllers/lease_document_action_controller.dart';
import 'package:immodesk_mobile/features/leases/presentation/widgets/lease_documents_section.dart';
import 'package:immodesk_mobile/features/organizations/presentation/controllers/selected_organization_controller.dart';
import 'package:mocktail/mocktail.dart';
import 'package:path_provider_platform_interface/path_provider_platform_interface.dart';
import 'package:plugin_platform_interface/plugin_platform_interface.dart';

class _MockDio extends Mock implements Dio {}

/// Le téléchargement (`LeaseDocumentDownloadService.download`) appelle
/// `getTemporaryDirectory()` (`path_provider`), un vrai canal de
/// plateforme : sans cette substitution (même pattern que
/// `unit_photo_capture_offline_test.dart`), l'appel ne se résout jamais
/// sous `pump()` et le test reste bloqué en `downloading`.
class _FakePathProviderPlatform extends PathProviderPlatform
    with MockPlatformInterfaceMixin {
  _FakePathProviderPlatform(this.path);

  final String path;

  @override
  Future<String?> getTemporaryPath() async => path;
}

class _FakeSelectedOrganizationController
    extends SelectedOrganizationController {
  @override
  Future<String?> build() async => 'org-1';
}

class _OnlineConnectivityService extends ConnectivityService {
  const _OnlineConnectivityService();

  @override
  Future<bool> isOffline() async => false;
}

class _OfflineConnectivityService extends ConnectivityService {
  const _OfflineConnectivityService();

  @override
  Future<bool> isOffline() async => true;
}

const Map<String, dynamic> _documentsResponse = {
  'items': [
    {
      'id': 'lease-doc-1',
      'leaseId': 'lease-1',
      'kind': 'CONTRACT',
      'documentId': 'doc-1',
      'version': 1,
      'title': 'Contrat de bail BAIL-2026-00042 v1',
      'isSigned': true,
      'signedAt': '2026-01-02T10:00:00Z',
    },
  ],
};

/// Pompe un nombre borné de frames courtes : les réponses mockées (dio,
/// connectivité) se résolvent en quelques microtâches, mais `pumpAndSettle`
/// n'est pas utilisable ici (un `LinearProgressIndicator` indéterminé ou un
/// appel de plateforme réel — `share_plus`/`open_filex`, non simulé dans ces
/// tests — l'empêcherait de jamais se stabiliser).
Future<void> _pumpTicks(WidgetTester tester, [int count = 6]) async {
  for (int i = 0; i < count; i++) {
    await tester.pump(const Duration(milliseconds: 20));
  }
}

void main() {
  late _MockDio mockDio;
  late _MockDio mockDownloadDio;
  late Directory tempDir;

  setUp(() async {
    mockDio = _MockDio();
    mockDownloadDio = _MockDio();
    tempDir = await Directory.systemTemp.createTemp('immodesk-lease-doc-test');
    PathProviderPlatform.instance = _FakePathProviderPlatform(tempDir.path);

    when(
      () => mockDio.get<dynamic>(
        '/leases/lease-1/documents',
        options: any(named: 'options'),
      ),
    ).thenAnswer(
      (_) async => Response<dynamic>(
        requestOptions: RequestOptions(path: '/leases/lease-1/documents'),
        statusCode: 200,
        data: _documentsResponse,
      ),
    );
    when(
      () => mockDio.get<dynamic>(
        '/documents/doc-1/download-url',
        options: any(named: 'options'),
      ),
    ).thenAnswer(
      (_) async => Response<dynamic>(
        requestOptions: RequestOptions(path: '/documents/doc-1/download-url'),
        statusCode: 200,
        data: {
          'downloadUrl': 'https://storage.immodesk.app/contrat-v1.pdf?sig=x',
          'expiresAt': '2026-09-11T12:10:00Z',
        },
      ),
    );
    when(
      () => mockDownloadDio.download(
        any(),
        any(),
        onReceiveProgress: any(named: 'onReceiveProgress'),
      ),
    ).thenAnswer((invocation) async {
      final void Function(int, int)? onProgress =
          invocation.namedArguments[#onReceiveProgress]
              as void Function(int, int)?;
      onProgress?.call(50, 100);
      onProgress?.call(100, 100);
      final String savePath = invocation.positionalArguments[1] as String;
      File(savePath).writeAsBytesSync(const <int>[]);
      return Response<dynamic>(
        requestOptions: RequestOptions(
          path: invocation.positionalArguments[0] as String,
        ),
        statusCode: 200,
      );
    });
  });

  tearDown(() async {
    if (tempDir.existsSync()) {
      await tempDir.delete(recursive: true);
    }
  });

  Widget buildApp({required bool online}) {
    return ProviderScope(
      overrides: [
        dioProvider.overrideWithValue(mockDio),
        downloadDioProvider.overrideWithValue(mockDownloadDio),
        selectedOrganizationControllerProvider.overrideWith(
          _FakeSelectedOrganizationController.new,
        ),
        connectivityServiceProvider.overrideWithValue(
          online
              ? const _OnlineConnectivityService()
              : const _OfflineConnectivityService(),
        ),
      ],
      child: const MaterialApp(
        home: Scaffold(body: LeaseDocumentsSection(leaseId: 'lease-1')),
      ),
    );
  }

  testWidgets('affiche la liste des versions du document de bail', (
    tester,
  ) async {
    await tester.pumpWidget(buildApp(online: true));
    await _pumpTicks(tester);

    expect(find.byKey(const ValueKey('lease-documents-list')), findsOneWidget);
    expect(find.text('Contrat v1 (signé)'), findsOneWidget);
    expect(find.text('Contrat de bail BAIL-2026-00042 v1'), findsOneWidget);
  });

  testWidgets(
    'partager un document déclenche le téléchargement via dio mocké',
    (tester) async {
      await tester.pumpWidget(buildApp(online: true));
      await _pumpTicks(tester);

      await tester.tap(
        find.byKey(const ValueKey('lease-document-share-lease-doc-1')),
      );
      // Quelques frames courtes : le téléchargement (mocké, y compris le
      // répertoire temporaire simulé) se résout vite, puis
      // `SharePlus.instance.share` est appelé — non mocké ici, il échoue
      // simplement (canal de plateforme absent en test), ce que le
      // contrôleur capture déjà comme une erreur de partage. On ne pompe
      // jamais jusqu'à extinction totale des frames pour ne pas dépendre de
      // ce résultat de plateforme.
      await _pumpTicks(tester, 10);

      verify(
        () => mockDio.get<dynamic>(
          '/documents/doc-1/download-url',
          options: any(named: 'options'),
        ),
      ).called(1);
      verify(
        () => mockDownloadDio.download(
          any(),
          any(),
          onReceiveProgress: any(named: 'onReceiveProgress'),
        ),
      ).called(1);

      final ProviderContainer container = ProviderScope.containerOf(
        tester.element(find.byType(LeaseDocumentsSection)),
      );
      final LeaseDocumentActionState finalState = container.read(
        leaseDocumentActionControllerProvider('lease-doc-1'),
      );
      expect(finalState.status, isNot(LeaseDocumentActionStatus.downloading));
    },
  );

  testWidgets('message hors ligne clair si les documents sont indisponibles', (
    tester,
  ) async {
    await tester.pumpWidget(buildApp(online: false));
    await tester.pump();
    await tester.pump();

    expect(
      find.text('Documents indisponibles hors connexion.'),
      findsOneWidget,
    );
    expect(find.byKey(const ValueKey('lease-documents-list')), findsNothing);
    verifyNever(
      () => mockDio.get<dynamic>(
        '/leases/lease-1/documents',
        options: any(named: 'options'),
      ),
    );
  });
}
