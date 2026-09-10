import 'dart:convert';
import 'dart:io';

import 'package:dio/dio.dart';
import 'package:drift/native.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:image/image.dart' as img;
import 'package:image_picker/image_picker.dart';
import 'package:immodesk_mobile/core/connectivity/connectivity_service.dart';
import 'package:immodesk_mobile/core/db/app_database.dart';
import 'package:immodesk_mobile/core/media/image_picker_service.dart';
import 'package:immodesk_mobile/core/network/dio_provider.dart';
import 'package:immodesk_mobile/features/documents/presentation/widgets/unit_photos_gallery.dart';
import 'package:immodesk_mobile/features/organizations/presentation/controllers/selected_organization_controller.dart';
import 'package:mocktail/mocktail.dart';
import 'package:path_provider_platform_interface/path_provider_platform_interface.dart';
import 'package:plugin_platform_interface/plugin_platform_interface.dart';

class _MockDio extends Mock implements Dio {}

class _FakeSelectedOrganizationController
    extends SelectedOrganizationController {
  @override
  Future<String?> build() async => 'org-1';
}

class _OfflineConnectivityService extends ConnectivityService {
  const _OfflineConnectivityService();

  @override
  Future<bool> isOffline() async => true;
}

class _FakeImagePickerService extends ImagePickerService {
  _FakeImagePickerService(this.filePath);

  final String filePath;

  @override
  Future<XFile?> takePhoto() async => XFile(filePath);
}

class _FakePathProviderPlatform extends PathProviderPlatform
    with MockPlatformInterfaceMixin {
  _FakePathProviderPlatform(this.path);

  final String path;

  @override
  Future<String?> getApplicationDocumentsPath() async => path;
}

void main() {
  late Directory tempDir;
  late String sourcePhotoPath;

  setUp(() async {
    tempDir = await Directory.systemTemp.createTemp('immodesk-photo-test');
    PathProviderPlatform.instance = _FakePathProviderPlatform(tempDir.path);

    final img.Image source = img.Image(width: 400, height: 300);
    img.fill(source, color: img.ColorRgb8(200, 30, 30));
    sourcePhotoPath = '${tempDir.path}/camera_photo.jpg';
    await File(sourcePhotoPath).writeAsBytes(img.encodeJpg(source));
  });

  tearDown(() async {
    if (await tempDir.exists()) {
      await tempDir.delete(recursive: true);
    }
  });

  testWidgets("une photo prise hors ligne est ajoutée à l'outbox", (
    tester,
  ) async {
    final AppDatabase database = AppDatabase.forTesting(
      NativeDatabase.memory(),
    );
    addTearDown(database.close);
    final mockDio = _MockDio();
    when(
      () => mockDio.get<dynamic>(
        '/documents',
        queryParameters: any(named: 'queryParameters'),
        options: any(named: 'options'),
      ),
    ).thenAnswer(
      (_) async => Response<dynamic>(
        requestOptions: RequestOptions(path: '/documents'),
        statusCode: 200,
        data: const {'items': <dynamic>[]},
      ),
    );

    await tester.pumpWidget(
      ProviderScope(
        overrides: [
          dioProvider.overrideWithValue(mockDio),
          appDatabaseProvider.overrideWithValue(database),
          selectedOrganizationControllerProvider.overrideWith(
            _FakeSelectedOrganizationController.new,
          ),
          connectivityServiceProvider.overrideWithValue(
            const _OfflineConnectivityService(),
          ),
          imagePickerServiceProvider.overrideWithValue(
            _FakeImagePickerService(sourcePhotoPath),
          ),
        ],
        child: const MaterialApp(
          home: Scaffold(body: UnitPhotosGallery(unitId: 'unit-1')),
        ),
      ),
    );
    await tester.pump();
    await tester.pump();

    expect((await database.select(database.outbox).get()), isEmpty);

    // La compression et l'écriture du fichier local passent par de vraies
    // opérations d'E/S (`dart:io`) : `runAsync` laisse le vrai event loop
    // les faire progresser (les `pump()` seuls, en zone de temps simulé,
    // ne suffisent pas à faire avancer une E/S réelle). On attend
    // l'apparition de la ligne d'outbox par sondage plutôt qu'un délai
    // fixe, pour ne pas dépendre de la vitesse de la machine.
    await tester.runAsync(() async {
      await tester.tap(find.byKey(const ValueKey('take-photo-button')));
      for (int attempt = 0; attempt < 40; attempt++) {
        final List<OutboxRow> current = await database
            .select(database.outbox)
            .get();
        if (current.isNotEmpty) break;
        await Future<void>.delayed(const Duration(milliseconds: 50));
      }
    });
    await tester.pumpAndSettle();

    final List<OutboxRow> rows = await database.select(database.outbox).get();
    expect(rows, hasLength(1));
    expect(rows.single.operation, 'documents.property_photo.create');
    expect(rows.single.status, 'PENDING');

    final Map<String, dynamic> payload =
        jsonDecode(rows.single.payload) as Map<String, dynamic>;
    expect(payload['unitId'], 'unit-1');
    expect(File(payload['filePath'] as String).existsSync(), isTrue);

    expect(
      find.text(
        'Photo enregistrée hors ligne, elle sera envoyée automatiquement.',
      ),
      findsOneWidget,
    );
    expect(find.text('en attente'), findsOneWidget);
  });
}
