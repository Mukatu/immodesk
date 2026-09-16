import 'package:flutter_test/flutter_test.dart';
import 'package:immodesk_mobile/features/inspections/domain/entities/inspection_condition.dart';
import 'package:immodesk_mobile/features/inspections/domain/entities/inspection_draft.dart';
import 'package:immodesk_mobile/features/inspections/domain/entities/inspection_item_draft.dart';
import 'package:immodesk_mobile/features/inspections/domain/entities/inspection_type.dart';
import 'package:immodesk_mobile/features/inspections/domain/inspection_offline_plan.dart';

void main() {
  test('construit le payload et la liste des pièces jointes en attente', () {
    const InspectionDraft draft = InspectionDraft(
      unitId: 'unit-1',
      leaseId: 'lease-1',
      inspectionType: InspectionType.moveOut,
      items: [
        InspectionItemDraft(
          localId: 'a',
          roomLabel: 'Salon',
          elementLabel: 'Peinture',
          condition: InspectionCondition.damaged,
          photoPaths: ['/tmp/a1.jpg', '/tmp/a2.jpg'],
        ),
        InspectionItemDraft(
          localId: 'b',
          roomLabel: 'Cuisine',
          elementLabel: 'Évier',
          condition: InspectionCondition.good,
        ),
      ],
    );

    final plan = buildInspectionOfflinePlan(
      draft: draft,
      clientRef: 'clientref-1',
      tenantSignaturePath: '/tmp/tenant.png',
      agentSignaturePath: '/tmp/agent.png',
    );

    expect(plan.payload['clientRef'], 'clientref-1');
    expect(plan.payload['inspectionType'], 'MOVE_OUT');
    final items = plan.payload['items'] as List;
    expect(items, hasLength(2));
    expect((items[0] as Map)['photoDocumentIds'], [null, null]);
    expect((items[1] as Map)['photoDocumentIds'], isEmpty);

    // Agent (obligatoire) + locataire + 2 photos du premier poste.
    expect(plan.pendingDocuments, hasLength(4));
    expect(plan.pendingDocuments[0].fieldPath, 'agentSignatureDocumentId');
    expect(plan.pendingDocuments[1].fieldPath, 'tenantSignatureDocumentId');
    expect(plan.pendingDocuments[2].fieldPath, 'items.0.photoDocumentIds.0');
    expect(plan.pendingDocuments[3].fieldPath, 'items.0.photoDocumentIds.1');
  });

  test(
    'sans locataire présent, aucune pièce jointe de signature locataire',
    () {
      const InspectionDraft draft = InspectionDraft(
        unitId: 'unit-1',
        inspectionType: InspectionType.moveIn,
        tenantPresent: false,
        absenceReason: 'Absent',
      );

      final plan = buildInspectionOfflinePlan(
        draft: draft,
        clientRef: 'clientref-2',
        agentSignaturePath: '/tmp/agent.png',
      );

      expect(plan.pendingDocuments, hasLength(1));
      expect(plan.payload['absenceReason'], 'Absent');
    },
  );
}
