import 'package:flutter_test/flutter_test.dart';
import 'package:immodesk_mobile/core/sync/document_field_paths.dart';

void main() {
  group('setDocumentFieldPath', () {
    test('résout un champ de premier niveau', () {
      final Map<String, dynamic> payload = {'tenantSignatureDocumentId': null};

      setDocumentFieldPath(payload, 'tenantSignatureDocumentId', 'doc-1');

      expect(payload['tenantSignatureDocumentId'], 'doc-1');
    });

    test('résout un index de liste imbriquée dans un poste', () {
      final Map<String, dynamic> payload = {
        'items': [
          {
            'roomLabel': 'Salon',
            'photoDocumentIds': <dynamic>[null, null],
          },
        ],
      };

      setDocumentFieldPath(payload, 'items.0.photoDocumentIds.1', 'doc-9');

      final List<dynamic> photoIds =
          (payload['items'] as List)[0]['photoDocumentIds'] as List;
      expect(photoIds[0], isNull);
      expect(photoIds[1], 'doc-9');
    });

    test('un segment invalide lève une erreur explicite', () {
      final Map<String, dynamic> payload = {'items': <dynamic>[]};

      expect(
        () => setDocumentFieldPath(payload, 'items.0.photoDocumentIds.0', 'x'),
        throwsA(isA<RangeError>()),
      );
    });
  });
}
