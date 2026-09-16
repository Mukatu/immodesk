import 'package:flutter_test/flutter_test.dart';
import 'package:immodesk_mobile/features/inspections/domain/entities/inspection_condition.dart';
import 'package:immodesk_mobile/features/inspections/domain/entities/inspection_draft.dart';
import 'package:immodesk_mobile/features/inspections/domain/entities/inspection_item_draft.dart';
import 'package:immodesk_mobile/features/inspections/domain/entities/inspection_type.dart';
import 'package:immodesk_mobile/features/inspections/domain/inspection_validation.dart';

InspectionItemDraft _item({
  required String localId,
  required InspectionCondition condition,
  List<String> photoPaths = const [],
}) {
  return InspectionItemDraft(
    localId: localId,
    roomLabel: 'Salon',
    elementLabel: 'Peinture',
    condition: condition,
    photoPaths: photoPaths,
  );
}

void main() {
  group('InspectionCondition.requiresPhoto', () {
    test('bon état, neuf et usage ne requièrent aucune photo', () {
      expect(InspectionCondition.brandNew.requiresPhoto, isFalse);
      expect(InspectionCondition.good.requiresPhoto, isFalse);
      expect(InspectionCondition.fair.requiresPhoto, isFalse);
    });

    test('mauvais état, dégradé et manquant exigent une photo', () {
      expect(InspectionCondition.poor.requiresPhoto, isTrue);
      expect(InspectionCondition.damaged.requiresPhoto, isTrue);
      expect(InspectionCondition.missing.requiresPhoto, isTrue);
    });
  });

  group('checkInspectionSignReadiness', () {
    const InspectionDraft base = InspectionDraft(
      unitId: 'unit-1',
      leaseId: 'lease-1',
      inspectionType: InspectionType.moveIn,
    );

    test('refuse un état des lieux sans aucun poste', () {
      final result = checkInspectionSignReadiness(base);
      expect(result.canSign, isFalse);
    });

    test('refuse la signature si un poste dégradé n\'a pas de photo', () {
      final draft = base.addItem(
        _item(localId: '1', condition: InspectionCondition.damaged),
      );
      final result = checkInspectionSignReadiness(draft);
      expect(result.canSign, isFalse);
      expect(result.message, contains('Photo obligatoire'));
      expect(result.message, contains('Salon'));
    });

    test('accepte un poste dégradé avec photo', () {
      final draft = base.addItem(
        _item(
          localId: '1',
          condition: InspectionCondition.damaged,
          photoPaths: const ['/tmp/photo.jpg'],
        ),
      );
      final result = checkInspectionSignReadiness(draft);
      expect(result.canSign, isTrue);
    });

    test('accepte un poste en bon état sans photo', () {
      final draft = base.addItem(
        _item(localId: '1', condition: InspectionCondition.good),
      );
      final result = checkInspectionSignReadiness(draft);
      expect(result.canSign, isTrue);
    });

    test('refuse l\'absence du locataire sans motif', () {
      final draft = base
          .addItem(_item(localId: '1', condition: InspectionCondition.good))
          .copyWith(tenantPresent: false);
      final result = checkInspectionSignReadiness(draft);
      expect(result.canSign, isFalse);
      expect(result.message, contains('absent'));
    });

    test('accepte l\'absence du locataire avec un motif', () {
      final draft = base
          .addItem(_item(localId: '1', condition: InspectionCondition.good))
          .copyWith(tenantPresent: false, absenceReason: 'En déplacement');
      final result = checkInspectionSignReadiness(draft);
      expect(result.canSign, isTrue);
    });
  });
}
